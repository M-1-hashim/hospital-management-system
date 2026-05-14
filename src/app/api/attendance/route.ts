import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/attendance - List attendance records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

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

    const attendances = await db.attendance.findMany({
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
      orderBy: { date: 'desc' },
      take: 500,
    });

    // Summary stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [presentCount, absentCount, lateCount] = await Promise.all([
      db.attendance.count({
        where: { date: { gte: todayStart, lte: todayEnd }, status: 'present' },
      }),
      db.attendance.count({
        where: { date: { gte: todayStart, lte: todayEnd }, status: 'absent' },
      }),
      db.attendance.count({
        where: { date: { gte: todayStart, lte: todayEnd }, status: 'late' },
      }),
    ]);

    return NextResponse.json({
      attendances,
      summary: {
        presentToday: presentCount,
        absentToday: absentCount,
        lateToday: lateCount,
      },
    });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/attendance - Clock in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    // Check if already clocked in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await db.attendance.findFirst({
      where: {
        staffId,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already clocked in today', attendance: existing },
        { status: 409 },
      );
    }

    const now = new Date();
    const attendance = await db.attendance.create({
      data: {
        staffId,
        date: now,
        clockIn: now,
        status: 'present',
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

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error: unknown) {
    console.error('Attendance POST error:', error);
    const prismaErr = error as { code?: string };
    if (prismaErr.code === 'P2002') {
      return NextResponse.json(
        { error: 'Already clocked in today' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/attendance?id=&action= - Clock out, mark absent, mark late
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (action === 'clockOut') {
      // Clock out: update with clockOut time and calculate totalHours
      const existing = await db.attendance.findUnique({ where: { id } });
      if (!existing || !existing.clockIn) {
        return NextResponse.json({ error: 'No active clock-in found' }, { status: 400 });
      }

      const clockOut = new Date();
      const diffMs = clockOut.getTime() - existing.clockIn.getTime();
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      const attendance = await db.attendance.update({
        where: { id },
        data: {
          clockOut,
          totalHours,
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

      return NextResponse.json({ attendance });
    }

    if (action === 'markAbsent') {
      const attendance = await db.attendance.update({
        where: { id },
        data: { status: 'absent' },
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
      return NextResponse.json({ attendance });
    }

    if (action === 'markLate') {
      const attendance = await db.attendance.update({
        where: { id },
        data: { status: 'late' },
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
      return NextResponse.json({ attendance });
    }

    // Default: generic update
    const body = await request.json();
    const attendance = await db.attendance.update({
      where: { id },
      data: body,
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

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Attendance PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/attendance?id= - Delete attendance record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.attendance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
