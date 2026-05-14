import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractBearerToken, getSessionFromToken } from '@/lib/auth';

// Helper: validate auth and return session or error
function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return getSessionFromToken(token);
}

// GET /api/visit-records — List visit records with filters
export async function GET(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || '';
    const doctorId = searchParams.get('doctorId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;

    if (dateFrom || dateTo) {
      where.visitDate = {} as Record<string, unknown>;
      if (dateFrom) (where.visitDate as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.visitDate as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [visitRecords, total] = await Promise.all([
      db.visitRecord.findMany({
        where,
        orderBy: { visitDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
          doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        },
      }),
      db.visitRecord.count({ where }),
    ]);

    return NextResponse.json({
      visitRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('VisitRecords GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/visit-records — Create new visit record
export async function POST(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.patientId || !body.doctorId || !body.chiefComplaint || !body.symptoms || !body.treatmentPlan) {
      return NextResponse.json(
        { error: 'Patient ID, Doctor ID, chief complaint, symptoms, and treatment plan are required' },
        { status: 400 }
      );
    }

    const visitRecord = await db.visitRecord.create({
      data: {
        patientId: body.patientId,
        doctorId: body.doctorId,
        visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
        chiefComplaint: body.chiefComplaint,
        symptoms: body.symptoms,
        examination: body.examination,
        diagnosis: body.diagnosis,
        treatmentPlan: body.treatmentPlan,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
        notes: body.notes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    });

    return NextResponse.json({ visitRecord }, { status: 201 });
  } catch (error) {
    console.error('VisitRecords POST error:', error);
    return NextResponse.json({ error: 'Failed to create visit record' }, { status: 500 });
  }
}

// PUT /api/visit-records?id=xxx — Update visit record
export async function PUT(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Visit record ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.patientId !== undefined) data.patientId = body.patientId;
    if (body.doctorId !== undefined) data.doctorId = body.doctorId;
    if (body.visitDate !== undefined) data.visitDate = body.visitDate ? new Date(body.visitDate) : new Date();
    if (body.chiefComplaint !== undefined) data.chiefComplaint = body.chiefComplaint;
    if (body.symptoms !== undefined) data.symptoms = body.symptoms;
    if (body.examination !== undefined) data.examination = body.examination;
    if (body.diagnosis !== undefined) data.diagnosis = body.diagnosis;
    if (body.treatmentPlan !== undefined) data.treatmentPlan = body.treatmentPlan;
    if (body.followUpDate !== undefined) data.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
    if (body.notes !== undefined) data.notes = body.notes;

    const visitRecord = await db.visitRecord.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    });

    return NextResponse.json({ visitRecord });
  } catch (error) {
    console.error('VisitRecords PUT error:', error);
    return NextResponse.json({ error: 'Failed to update visit record' }, { status: 500 });
  }
}

// DELETE /api/visit-records?id=xxx — Delete visit record
export async function DELETE(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Visit record ID is required' }, { status: 400 });
    }

    await db.visitRecord.delete({ where: { id } });

    return NextResponse.json({ message: 'Visit record deleted successfully' });
  } catch (error) {
    console.error('VisitRecords DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete visit record' }, { status: 500 });
  }
}
