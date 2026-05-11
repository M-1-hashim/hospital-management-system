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
      default:
        return NextResponse.json(
          { error: 'Report type is required (patients, financial, doctors, pharmacy)' },
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
    // Group by status
    Promise.all([
      db.patient.count({ where: { status: 'outpatient' } }),
      db.patient.count({ where: { status: 'inpatient' } }),
      db.patient.count({ where: { status: 'emergency' } }),
    ]),
    // Group by gender
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

  const [invoices, paidAggregate, unpaidAggregate, totalAggregate] = await Promise.all([
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
  ]);

  return NextResponse.json({
    summary: {
      totalInvoices: totalAggregate._count,
      totalRevenue: totalAggregate._sum.total || 0,
      totalCollected: totalAggregate._sum.paidAmount || 0,
      totalDiscount: totalAggregate._sum.discount || 0,
      totalTax: totalAggregate._sum.tax || 0,
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

      const [
        completedAppointments,
        monthAppointments,
        monthRevenue,
      ] = await Promise.all([
        db.appointment.count({
          where: { doctorId: doctor.id, status: 'completed' },
        }),
        db.appointment.count({
          where: {
            doctorId: doctor.id,
            date: { gte: monthStart },
            status: 'completed',
          },
        }),
        db.appointment.aggregate({
          _sum: {},
          where: { doctorId: doctor.id, date: { gte: monthStart }, status: 'completed' },
        }),
      ]);

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
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    // Get medicines used in prescriptions most frequently
    db.prescriptionItem.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  // Enrich top medicines with names
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

  // Total inventory value
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
