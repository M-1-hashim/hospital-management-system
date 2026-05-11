import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings - Get all settings or dashboard stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Stats endpoint
    if (searchParams.get('stats') === 'true') {
      return getDashboardStats();
    }

    const settings = await db.hospitalSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const setting = await db.hospitalSetting.upsert({
      where: { key: body.key },
      create: {
        key: body.key,
        value: body.value || '',
      },
      update: {
        value: body.value || '',
      },
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// Dashboard stats helper
async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPatients,
    todayPatients,
    outpatientCount,
    inpatientCount,
    totalDoctors,
    activeDoctors,
    totalBeds,
    availableBeds,
    occupiedBeds,
    todayAppointments,
    pendingAppointments,
    todayIncome,
    monthIncome,
    totalUnpaid,
    totalMedicines,
    lowStockMedicines,
    pendingLabTests,
    completedLabTests,
    departments,
  ] = await Promise.all([
    // Patients
    db.patient.count(),
    db.patient.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    db.patient.count({ where: { status: 'outpatient' } }),
    db.patient.count({ where: { status: 'inpatient' } }),

    // Doctors
    db.doctor.count(),
    db.doctor.count({ where: { isActive: true } }),

    // Beds
    db.bed.count(),
    db.bed.count({ where: { status: 'available' } }),
    db.bed.count({ where: { status: 'occupied' } }),

    // Appointments
    db.appointment.count({
      where: {
        AND: [
          { date: { gte: todayStart, lte: todayEnd } },
          { status: { in: ['pending', 'confirmed'] } },
        ],
      },
    }),
    db.appointment.count({ where: { status: 'pending' } }),

    // Revenue
    db.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart, lte: todayEnd }, paymentStatus: 'paid' },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart }, paymentStatus: 'paid' },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { paymentStatus: { in: ['unpaid', 'partial'] } },
    }),

    // Medicines
    db.medicine.count(),
    db.medicine.count({ where: { stock: { lte: 10 }, isActive: true } }),

    // Lab tests
    db.labTest.count({ where: { status: 'pending' } }),
    db.labTest.count({ where: { status: 'completed' } }),

    // Departments
    db.department.count(),
  ]);

  return NextResponse.json({
    patients: {
      total: totalPatients,
      today: todayPatients,
      outpatients: outpatientCount,
      inpatients: inpatientCount,
    },
    doctors: {
      total: totalDoctors,
      active: activeDoctors,
    },
    beds: {
      total: totalBeds,
      available: availableBeds,
      occupied: occupiedBeds,
    },
    appointments: {
      today: todayAppointments,
      pending: pendingAppointments,
    },
    revenue: {
      today: todayIncome._sum.total || 0,
      month: monthIncome._sum.total || 0,
      unpaid: totalUnpaid._sum.total || 0,
    },
    medicines: {
      total: totalMedicines,
      lowStock: lowStockMedicines,
    },
    labTests: {
      pending: pendingLabTests,
      completed: completedLabTests,
    },
    departments,
  });
}
