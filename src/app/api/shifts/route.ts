import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/shifts - List shift schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const shiftType = searchParams.get('shiftType');

    const where: Record<string, unknown> = {};
    if (staffId) where.staffId = staffId;
    if (shiftType) where.shiftType = shiftType;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.date = dateFilter;
    }

    const shifts = await db.shiftSchedule.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            department: { select: { id: true, name: true, nameFa: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
      take: 500,
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error('Shifts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shifts - Create shift schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, date, shiftType, startTime, endTime, notes } = body;

    if (!staffId || !date || !shiftType || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'staffId, date, shiftType, startTime, endTime are required' },
        { status: 400 },
      );
    }

    const shift = await db.shiftSchedule.create({
      data: {
        staffId,
        date: new Date(date),
        shiftType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes: notes || null,
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error: unknown) {
    console.error('Shifts POST error:', error);
    const prismaErr = error as { code?: string };
    if (prismaErr.code === 'P2002') {
      return NextResponse.json(
        { error: 'A shift already exists for this staff on this date and type' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/shifts?id= - Update shift schedule
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    const shift = await db.shiftSchedule.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Shifts PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shifts?id= - Delete shift schedule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.shiftSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shifts DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
