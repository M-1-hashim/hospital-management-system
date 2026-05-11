import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/appointments - List appointments with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const doctorId = searchParams.get('doctorId') || '';
    const patientId = searchParams.get('patientId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
          doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
          user: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.appointment.count({ where }),
    ]);

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Appointments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/appointments - Create appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.patientId || !body.doctorId || !body.date || !body.time) {
      return NextResponse.json(
        { error: 'patientId, doctorId, date, and time are required' },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.create({
      data: {
        patientId: body.patientId,
        doctorId: body.doctorId,
        date: new Date(body.date),
        time: body.time,
        duration: body.duration || 30,
        type: body.type || 'visit',
        status: body.status || 'pending',
        notes: body.notes,
        userId: body.userId,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Appointments POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

// PUT /api/appointments?id=xxx - Update appointment status
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.time !== undefined) data.time = body.time;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.type !== undefined) data.type = body.type;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.doctorId !== undefined) data.doctorId = body.doctorId;
    if (body.patientId !== undefined) data.patientId = body.patientId;
    if (body.reminderSent !== undefined) data.reminderSent = body.reminderSent;

    const appointment = await db.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Appointments PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments?id=xxx - Delete appointment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    await db.appointment.delete({ where: { id } });

    return NextResponse.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Appointments DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}
