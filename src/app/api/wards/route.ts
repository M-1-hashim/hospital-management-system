import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/wards - List beds with filters or get bed history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || '';

    // ── Bed History Action ──
    if (action === 'bedHistory') {
      const bedId = searchParams.get('bedId');
      if (!bedId) {
        return NextResponse.json({ error: 'bedId is required' }, { status: 400 });
      }

      const admissions = await db.admission.findMany({
        where: { bedId },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { admitDate: 'desc' },
      });

      return NextResponse.json(admissions);
    }

    // ── Default: List beds ──
    const departmentId = searchParams.get('departmentId') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.status = status;
    }

    const beds = await db.bed.findMany({
      where,
      include: {
        department: true,
        admissions: {
          where: { status: 'active' },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
            doctor: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ departmentId: 'asc' }, { number: 'asc' }],
    });

    return NextResponse.json({ beds });
  } catch (error) {
    console.error('Wards GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/wards - Add bed or admit/discharge/transfer patient
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || '';

    switch (action) {
      case 'admit':
        return admitPatient(request);
      case 'discharge':
        return dischargePatient(request);
      case 'transfer':
        return transferPatient(request);
      default:
        return addBed(request);
    }
  } catch (error) {
    console.error('Wards POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/wards?id=xxx - Update bed status
// PUT /api/wards?action=transfer - Transfer patient between beds (bedId → targetBedId)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || '';
    const id = searchParams.get('id');

    // ── Transfer Action (via bedId + targetBedId) ──
    if (action === 'transfer') {
      const body = await request.json();
      const { bedId, targetBedId } = body as { bedId?: string; targetBedId?: string };

      if (!bedId || !targetBedId) {
        return NextResponse.json(
          { error: 'bedId and targetBedId are required for transfer' },
          { status: 400 },
        );
      }

      if (bedId === targetBedId) {
        return NextResponse.json(
          { error: 'Source and target bed cannot be the same' },
          { status: 400 },
        );
      }

      // Find active admission for the source bed
      const activeAdmission = await db.admission.findFirst({
        where: { bedId, status: 'active' },
      });

      if (!activeAdmission) {
        return NextResponse.json(
          { error: 'No active admission found on the source bed' },
          { status: 404 },
        );
      }

      // Check target bed availability
      const targetBed = await db.bed.findUnique({
        where: { id: targetBedId },
      });

      if (!targetBed || targetBed.status !== 'available') {
        return NextResponse.json(
          { error: 'Target bed is not available' },
          { status: 400 },
        );
      }

      const oldBedId = bedId;

      // Update admission: move to new bed
      const updatedAdmission = await db.admission.update({
        where: { id: activeAdmission.id },
        data: {
          bedId: targetBedId,
          status: 'transferred',
          notes: [
            activeAdmission.notes || '',
            `Transfer: ${new Date().toISOString()} — Bed ${oldBedId} → Bed ${targetBedId}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
          bed: { include: { department: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Free up old bed
      await db.bed.update({
        where: { id: oldBedId },
        data: { status: 'cleaning' },
      });

      // Occupy new bed
      await db.bed.update({
        where: { id: targetBedId },
        data: { status: 'occupied' },
      });

      return NextResponse.json({ admission: updatedAdmission });
    }

    // ── Default: Update bed fields ──
    if (!id) {
      return NextResponse.json(
        { error: 'Bed ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.roomNumber !== undefined) data.roomNumber = body.roomNumber;
    if (body.type !== undefined) data.type = body.type;
    if (body.dailyRate !== undefined) data.dailyRate = body.dailyRate;
    if (body.departmentId !== undefined) data.departmentId = body.departmentId;
    if (body.number !== undefined) data.number = body.number;
    if (body.notes !== undefined) data.notes = body.notes;

    const bed = await db.bed.update({
      where: { id },
      data,
      include: { department: true },
    });

    return NextResponse.json({ bed });
  } catch (error) {
    console.error('Wards PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update bed' },
      { status: 500 },
    );
  }
}

// DELETE /api/wards?id=xxx - Delete a bed
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bed ID required' },
        { status: 400 }
      );
    }

    // Check if bed has active admissions
    const bed = await db.bed.findUnique({
      where: { id },
      include: { admissions: { where: { status: 'active' } } },
    });

    if (!bed) {
      return NextResponse.json(
        { error: 'Bed not found' },
        { status: 404 }
      );
    }

    if (bed.admissions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete bed with active admissions' },
        { status: 400 }
      );
    }

    await db.bed.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wards DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bed' },
      { status: 500 }
    );
  }
}

// Add new bed
async function addBed(request: NextRequest) {
  const body = await request.json();

  if (!body.number || !body.departmentId) {
    return NextResponse.json(
      { error: 'Bed number and departmentId are required' },
      { status: 400 }
    );
  }

  const bed = await db.bed.create({
    data: {
      number: body.number,
      departmentId: body.departmentId,
      roomNumber: body.roomNumber,
      type: body.type || 'standard',
      status: body.status || 'available',
      dailyRate: body.dailyRate || 0,
      notes: body.notes,
    },
    include: { department: true },
  });

  return NextResponse.json({ bed }, { status: 201 });
}

// Admit patient to bed
async function admitPatient(request: NextRequest) {
  const body = await request.json();

  if (!body.patientId || !body.bedId || !body.doctorId) {
    return NextResponse.json(
      { error: 'patientId, bedId, and doctorId are required' },
      { status: 400 }
    );
  }

  // Check bed availability
  const bed = await db.bed.findUnique({
    where: { id: body.bedId },
  });

  if (!bed || bed.status !== 'available') {
    return NextResponse.json(
      { error: 'Bed is not available' },
      { status: 400 }
    );
  }

  // Create admission
  const admission = await db.admission.create({
    data: {
      patientId: body.patientId,
      bedId: body.bedId,
      doctorId: body.doctorId,
      diagnosis: body.diagnosis,
      notes: body.notes,
      admitDate: body.admitDate ? new Date(body.admitDate) : new Date(),
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
      bed: { include: { department: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Update bed status
  await db.bed.update({
    where: { id: body.bedId },
    data: { status: 'occupied' },
  });

  // Update patient status
  await db.patient.update({
    where: { id: body.patientId },
    data: { status: 'inpatient' },
  });

  return NextResponse.json({ admission }, { status: 201 });
}

// Discharge patient
async function dischargePatient(request: NextRequest) {
  const body = await request.json();

  if (!body.admissionId) {
    return NextResponse.json(
      { error: 'admissionId is required' },
      { status: 400 }
    );
  }

  const admission = await db.admission.findUnique({
    where: { id: body.admissionId },
  });

  if (!admission) {
    return NextResponse.json(
      { error: 'Admission not found' },
      { status: 404 }
    );
  }

  // Update admission
  const updated = await db.admission.update({
    where: { id: body.admissionId },
    data: {
      dischargeDate: new Date(),
      status: 'discharged',
      notes: body.notes ? `${admission.notes || ''}\nDischarge: ${body.notes}`.trim() : admission.notes,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      bed: true,
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Free up the bed
  await db.bed.update({
    where: { id: admission.bedId },
    data: { status: 'cleaning' },
  });

  // Update patient status back to outpatient
  await db.patient.update({
    where: { id: admission.patientId },
    data: { status: 'outpatient' },
  });

  return NextResponse.json({ admission: updated });
}

// Transfer patient between beds
async function transferPatient(request: NextRequest) {
  const body = await request.json();

  if (!body.admissionId || !body.newBedId) {
    return NextResponse.json(
      { error: 'admissionId and newBedId are required' },
      { status: 400 }
    );
  }

  const admission = await db.admission.findUnique({
    where: { id: body.admissionId },
  });

  if (!admission) {
    return NextResponse.json(
      { error: 'Admission not found' },
      { status: 404 }
    );
  }

  // Check new bed availability
  const newBed = await db.bed.findUnique({
    where: { id: body.newBedId },
  });

  if (!newBed || newBed.status !== 'available') {
    return NextResponse.json(
      { error: 'New bed is not available' },
      { status: 400 }
    );
  }

  const oldBedId = admission.bedId;

  // Update admission
  const updated = await db.admission.update({
    where: { id: body.admissionId },
    data: {
      bedId: body.newBedId,
      status: 'transferred',
      notes: body.notes
        ? `${admission.notes || ''}\nTransfer: ${body.notes}`.trim()
        : admission.notes,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      bed: { include: { department: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Free up old bed
  await db.bed.update({
    where: { id: oldBedId },
    data: { status: 'cleaning' },
  });

  // Occupy new bed
  await db.bed.update({
    where: { id: body.newBedId },
    data: { status: 'occupied' },
  });

  return NextResponse.json({ admission: updated });
}
