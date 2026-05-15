import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/doctor-portal?userId=xxx
// Returns doctor profile, appointments, salary info, patients, stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Find doctor linked to this user
    const doctor = await db.doctor.findFirst({
      where: { userId },
      include: { department: true },
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel data fetching
    const [
      todayAppointments,
      weekAppointments,
      allAppointments,
      visitRecords,
      payrolls,
      completedAppointmentsThisMonth,
    ] = await Promise.all([
      // Today's appointments
      db.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: todayStart } },
        include: { patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true, phone: true } } },
        orderBy: { time: 'asc' },
      }),
      // This week's appointments
      db.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: weekStart } },
        include: { patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } } },
        orderBy: { date: 'desc' },
      }),
      // All appointments (last 30 days)
      db.appointment.findMany({
        where: {
          doctorId: doctor.id,
          date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30) },
        },
        include: { patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } } },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      // Recent visit records
      db.visitRecord.findMany({
        where: { doctorId: doctor.id },
        include: { patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } } },
        orderBy: { visitDate: 'desc' },
        take: 20,
      }),
      // Payroll history
      db.payroll.findMany({
        where: { doctorId: doctor.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      }),
      // Completed appointments this month
      db.appointment.count({
        where: {
          doctorId: doctor.id,
          status: 'completed',
          date: { gte: monthStart },
        },
      }),
    ]);

    // Stats
    const totalPatientsSeen = await db.visitRecord.count({
      where: { doctorId: doctor.id },
    });

    const totalRevenue = await db.appointment.aggregate({
      _sum: {},
      where: { doctorId: doctor.id, status: 'completed', date: { gte: monthStart } },
    });

    // Get current month payroll
    const currentMonthPayroll = payrolls.find(
      (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
    );

    // Last 6 months salary chart data
    const salaryChart = payrolls.slice(0, 6).reverse().map((p) => ({
      month: p.month,
      year: p.year,
      label: String(p.year) + '/' + String(p.month).padStart(2, '0'),
      total: p.totalPaid,
      bonus: p.bonus,
      deduction: p.deduction,
    }));

    return NextResponse.json({
      doctor: {
        id: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialty: doctor.specialty,
        phone: doctor.phone,
        email: doctor.email,
        department: doctor.department,
        visitFee: doctor.visitFee,
        salary: doctor.salary,
        contractType: doctor.contractType,
        hireDate: doctor.hireDate,
        rating: doctor.rating,
        isActive: doctor.isActive,
      },
      stats: {
        todayAppointments: todayAppointments.length,
        weekAppointments: weekAppointments.length,
        completedThisMonth: completedAppointmentsThisMonth,
        totalPatientsSeen,
      },
      todayAppointments,
      weekAppointments,
      recentAppointments: allAppointments,
      visitRecords,
      payrolls,
      currentMonthPayroll,
      salaryChart,
    });
  } catch (error) {
    console.error('Doctor Portal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
