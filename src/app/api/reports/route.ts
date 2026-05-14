import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/reports - Route to specific report types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    switch (type) {
      case 'patients':
        return getPatientReport(searchParams);
      case 'financial':
        return getFinancialReport(searchParams);
      case 'doctors':
        return getDoctorReport(searchParams);
      case 'pharmacy':
        return getPharmacyReport(searchParams);
      case 'weeklyPatients':
        return getWeeklyPatientsReport();
      case 'departmentDist':
        return getDepartmentDistReport();
      case 'topDoctors':
        return getTopDoctorsReport();
      case 'monthlyRevenue':
        return getMonthlyRevenueReport();
      case 'dailyRevenue':
        return getDailyRevenueReport();
      case 'paymentMethods':
        return getPaymentMethodsReport();
      case 'overdueInvoices':
        return getOverdueInvoicesReport();
      case 'departmentRevenue':
        return getDepartmentRevenueReport();
      default:
        return NextResponse.json(
          { error: 'Report type is required (patients, financial, doctors, pharmacy, weeklyPatients, departmentDist, topDoctors, monthlyRevenue, dailyRevenue, paymentMethods, overdueInvoices, departmentRevenue)' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Patient statistics report
async function getPatientReport(searchParams: URLSearchParams) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total,
    thisMonth,
    thisWeek,
    today,
    byStatus,
    byGender,
  ] = await Promise.all([
    db.patient.count(),
    db.patient.count({ where: { createdAt: { gte: monthStart } } }),
    db.patient.count({ where: { createdAt: { gte: weekStart } } }),
    db.patient.count({ where: { createdAt: { gte: todayStart } } }),
    Promise.all([
      db.patient.count({ where: { status: 'outpatient' } }),
      db.patient.count({ where: { status: 'inpatient' } }),
      db.patient.count({ where: { status: 'emergency' } }),
    ]),
    Promise.all([
      db.patient.count({ where: { gender: 'male' } }),
      db.patient.count({ where: { gender: 'female' } }),
    ]),
  ]);

  return NextResponse.json({
    total,
    thisMonth,
    thisWeek,
    today,
    byStatus: {
      outpatient: byStatus[0],
      inpatient: byStatus[1],
      emergency: byStatus[2],
    },
    byGender: {
      male: byGender[0],
      female: byGender[1],
    },
  });
}

// Financial report
async function getFinancialReport(searchParams: URLSearchParams) {
  const fromDate = searchParams.get('fromDate') || '';
  const toDate = searchParams.get('toDate') || '';

  const dateFilter: Record<string, Date> = {};
  if (fromDate) dateFilter.gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  const [invoices, paidAggregate, unpaidAggregate, totalAggregate, expenseAggregate] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.invoice.aggregate({
      _sum: { total: true, paidAmount: true },
      _count: true,
      where: { ...where, paymentStatus: 'paid' },
    }),
    db.invoice.aggregate({
      _sum: { total: true, paidAmount: true },
      _count: true,
      where: { ...where, paymentStatus: { in: ['unpaid', 'partial'] } },
    }),
    db.invoice.aggregate({
      _sum: { total: true, paidAmount: true, discount: true, tax: true },
      _count: true,
      where,
    }),
    db.expense.aggregate({
      _sum: { amount: true },
      _count: true,
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
    }),
  ]);

  const totalExpenses = expenseAggregate._sum.amount || 0;
  const totalRevenue = totalAggregate._sum.total || 0;

  return NextResponse.json({
    summary: {
      totalInvoices: totalAggregate._count,
      totalRevenue: totalRevenue,
      totalCollected: totalAggregate._sum.paidAmount || 0,
      totalDiscount: totalAggregate._sum.discount || 0,
      totalTax: totalAggregate._sum.tax || 0,
      totalExpenses: totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      paidCount: paidAggregate._count,
      paidTotal: paidAggregate._sum.total || 0,
      unpaidCount: unpaidAggregate._count,
      unpaidTotal: unpaidAggregate._sum.total || 0,
      outstandingBalance: (unpaidAggregate._sum.total || 0) - (unpaidAggregate._sum.paidAmount || 0),
    },
    invoices,
  });
}

// Doctor performance report
async function getDoctorReport(searchParams: URLSearchParams) {
  const doctors = await db.doctor.findMany({
    include: {
      department: true,
      _count: {
        select: {
          appointments: true,
          prescriptions: true,
          labTests: true,
        },
      },
    },
    orderBy: { lastName: 'asc' },
  });

  const doctorStats = await Promise.all(
    doctors.map(async (doctor) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const completedAppointments = await db.appointment.count({
        where: { doctorId: doctor.id, status: 'completed' },
      });
      const monthAppointments = await db.appointment.count({
        where: { doctorId: doctor.id, date: { gte: monthStart }, status: 'completed' },
      });

      return {
        id: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialty: doctor.specialty,
        department: doctor.department?.name || 'N/A',
        rating: doctor.rating,
        totalAppointments: doctor._count.appointments,
        completedAppointments,
        monthAppointments,
        totalPrescriptions: doctor._count.prescriptions,
        totalLabRequests: doctor._count.labTests,
      };
    })
  );

  return NextResponse.json({ doctors: doctorStats });
}

// Pharmacy report
async function getPharmacyReport(searchParams: URLSearchParams) {
  const [totalMedicines, lowStock, expiringSoon, prescriptionsThisMonth, topMedicines] = await Promise.all([
    db.medicine.count({ where: { isActive: true } }),
    db.medicine.count({ where: { stock: { lte: 10 }, isActive: true } }),
    db.medicine.count({
      where: {
        isActive: true,
        expiryDate: { lte: new Date(new Date().setMonth(new Date().getMonth() + 3)) },
      },
    }),
    db.prescription.count({
      where: {
        date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    db.prescriptionItem.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  const enrichedTopMedicines = await Promise.all(
    topMedicines.map(async (item) => {
      const medicine = await db.medicine.findUnique({
        where: { id: item.medicineId },
        select: { id: true, name: true, category: true, stock: true },
      });
      return {
        medicineId: item.medicineId,
        name: medicine?.name || 'Unknown',
        category: medicine?.category || 'N/A',
        totalUsed: item._sum.quantity || 0,
        currentStock: medicine?.stock || 0,
      };
    })
  );

  const inventoryValue = await db.medicine.aggregate({
    _sum: { price: true },
    where: { isActive: true },
  });

  return NextResponse.json({
    summary: {
      totalMedicines,
      lowStock,
      expiringSoon,
      prescriptionsThisMonth,
      inventoryValue: inventoryValue._sum.price || 0,
    },
    topMedicines: enrichedTopMedicines,
  });
}

// Weekly patient visits report (last 7 days)
async function getWeeklyPatientsReport() {
  const now = new Date();
  const days: { day: string; date: string; count: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const count = await db.patient.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    });
    days.push({
      day: date.toLocaleDateString('en', { weekday: 'short' }),
      date: date.toISOString().split('T')[0],
      count,
    });
  }

  return NextResponse.json({ days });
}

// Department distribution report
async function getDepartmentDistReport() {
  const departments = await db.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      _count: { select: { doctors: true } },
    },
  });

  const dist = await Promise.all(
    departments.map(async (dept) => {
      const patientCount = await db.appointment.groupBy({
        by: ['doctorId'],
        where: { doctor: { departmentId: dept.id } },
        _count: true,
      }).then((items) => items.reduce((sum, item) => sum + item._count, 0)).catch(() => 0);

      return { name: dept.name, value: patientCount || dept._count.doctors };
    })
  );

  return NextResponse.json({ distribution: dist.filter((d) => d.value > 0) });
}

// Top 5 doctors by appointment count
async function getTopDoctorsReport() {
  const doctors = await db.doctor.findMany({
    where: { isActive: true },
    include: {
      department: { select: { name: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { appointments: { _count: 'desc' } },
    take: 5,
  });

  return NextResponse.json({
    topDoctors: doctors.map((doc) => ({
      id: doc.id,
      name: `${doc.firstName} ${doc.lastName}`,
      specialty: doc.specialty,
      department: doc.department?.name || 'N/A',
      appointments: doc._count.appointments,
      rating: doc.rating,
    })),
  });
}

// ===== NEW REPORT TYPES =====

// Monthly revenue & expenses for last 12 months
async function getMonthlyRevenueReport() {
  const now = new Date();
  const data: { month: string; revenue: number; expenses: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthLabel = monthDate.toLocaleDateString('en', { month: 'short', year: '2-digit' });

    const [revenueAgg, expenseAgg] = await Promise.all([
      db.invoice.aggregate({
        _sum: { total: true, paidAmount: true },
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
    ]);

    data.push({
      month: monthLabel,
      revenue: revenueAgg._sum.total || 0,
      expenses: expenseAgg._sum.amount || 0,
    });
  }

  return NextResponse.json(data);
}

// Daily revenue for last 30 days
async function getDailyRevenueReport() {
  const now = new Date();
  const data: { date: string; amount: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
    const dateLabel = dayDate.toISOString().split('T')[0];

    const agg = await db.invoice.aggregate({
      _sum: { total: true, paidAmount: true },
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    });

    data.push({
      date: dateLabel,
      amount: agg._sum.paidAmount || 0,
    });
  }

  return NextResponse.json(data);
}

// Payment method distribution
async function getPaymentMethodsReport() {
  const payments = await db.payment.findMany({
    select: { method: true, amount: true, status: true },
    where: { status: 'completed' },
  });

  const methodMap: Record<string, { method: string; count: number; total: number }> = {};
  for (const p of payments) {
    if (!methodMap[p.method]) {
      methodMap[p.method] = { method: p.method, count: 0, total: 0 };
    }
    methodMap[p.method].count += 1;
    methodMap[p.method].total += p.amount;
  }

  return NextResponse.json(Object.values(methodMap));
}

// Overdue invoices (past due date and not paid)
async function getOverdueInvoicesReport() {
  const now = new Date();
  const overdueInvoices = await db.invoice.findMany({
    where: {
      paymentStatus: { in: ['unpaid', 'partial'] },
      dueDate: { lt: now },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      payments: { select: { id: true, amount: true, paidAt: true, method: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 100,
  });

  return NextResponse.json({ overdueInvoices });
}

// Revenue by department
async function getDepartmentRevenueReport() {
  const departments = await db.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      doctors: {
        select: {
          id: true,
          appointments: {
            where: { status: 'completed' },
            select: { id: true, patient: { select: { invoices: { where: { paymentStatus: 'paid' }, select: { total: true, paidAmount: true } } } } },
          },
        },
      },
    },
  });

  const data: { department: string; revenue: number }[] = departments.map((dept) => {
    let revenue = 0;
    for (const doctor of dept.doctors) {
      for (const appt of doctor.appointments) {
        for (const invoice of appt.patient.invoices) {
          revenue += invoice.paidAmount || 0;
        }
      }
    }
    return { department: dept.name, revenue };
  });

  // Also count direct invoice revenue by department from invoice items
  const invoiceRevenue = await db.invoice.aggregate({
    _sum: { total: true, paidAmount: true },
    where: { paymentStatus: 'paid' },
  });

  return NextResponse.json({
    departments: data,
    totalRevenue: invoiceRevenue._sum.paidAmount || 0,
  });
}
