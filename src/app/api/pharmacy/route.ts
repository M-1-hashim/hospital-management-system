import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pharmacy - List medicines with search and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Prescriptions list endpoint
    if (searchParams.get('action') === 'prescriptions') {
      return listPrescriptions(searchParams);
    }

    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const lowStock = searchParams.get('lowStock') === 'true';
    const expiringSoon = searchParams.get('expiringSoon') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameFa: { contains: search } },
        { genericName: { contains: search } },
        { manufacturer: { contains: search } },
        { batchNumber: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (lowStock) {
      where.stock = { lte: 10 };
    }

    if (expiringSoon) {
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      where.expiryDate = { lte: threeMonths };
    }

    const [medicines, total] = await Promise.all([
      db.medicine.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.medicine.count({ where }),
    ]);

    return NextResponse.json({
      medicines,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Pharmacy GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/pharmacy - Add medicine or create prescription
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Prescription endpoint
    if (searchParams.get('action') === 'prescription') {
      return createPrescription(request);
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Medicine name is required' },
        { status: 400 }
      );
    }

    const medicine = await db.medicine.create({
      data: {
        name: body.name,
        nameFa: body.nameFa,
        category: body.category,
        manufacturer: body.manufacturer,
        genericName: body.genericName,
        dosageForm: body.dosageForm,
        strength: body.strength,
        price: body.price || 0,
        stock: body.stock || 0,
        minStock: body.minStock || 10,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        batchNumber: body.batchNumber,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json({ medicine }, { status: 201 });
  } catch (error) {
    console.error('Pharmacy POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create medicine' },
      { status: 500 }
    );
  }
}

// PUT /api/pharmacy?id=xxx - Update medicine (including stock adjustment)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Medicine ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.nameFa !== undefined) data.nameFa = body.nameFa;
    if (body.category !== undefined) data.category = body.category;
    if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
    if (body.genericName !== undefined) data.genericName = body.genericName;
    if (body.dosageForm !== undefined) data.dosageForm = body.dosageForm;
    if (body.strength !== undefined) data.strength = body.strength;
    if (body.price !== undefined) data.price = body.price;
    if (body.minStock !== undefined) data.minStock = body.minStock;
    if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.batchNumber !== undefined) data.batchNumber = body.batchNumber;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    // Handle stock adjustment
    if (body.stockAdjustment !== undefined) {
      const current = await db.medicine.findUnique({ where: { id }, select: { stock: true } });
      if (current) {
        data.stock = Math.max(0, current.stock + body.stockAdjustment);
      }
    } else if (body.stock !== undefined) {
      data.stock = body.stock;
    }

    const medicine = await db.medicine.update({
      where: { id },
      data,
    });

    return NextResponse.json({ medicine });
  } catch (error) {
    console.error('Pharmacy PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update medicine' },
      { status: 500 }
    );
  }
}

// DELETE /api/pharmacy?id=xxx - Delete medicine
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Medicine ID is required' },
        { status: 400 }
      );
    }

    await db.medicine.delete({ where: { id } });

    return NextResponse.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Pharmacy DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete medicine' },
      { status: 500 }
    );
  }
}

// Create prescription with items
async function createPrescription(request: NextRequest) {
  const body = await request.json();

  if (!body.patientId || !body.items || !body.items.length) {
    return NextResponse.json(
      { error: 'patientId and items are required' },
      { status: 400 }
    );
  }

  let total = 0;
  const prescriptionItems = body.items.map((item: {
    medicineId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    unitPrice: number;
  }) => {
    const itemTotal = item.quantity * item.unitPrice;
    total += itemTotal;
    return {
      medicineId: item.medicineId,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: itemTotal,
    };
  });

  const prescription = await db.prescription.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId,
      userId: body.userId,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes,
      total,
      status: body.status || 'active',
      items: {
        create: prescriptionItems,
      },
    },
    include: {
      items: { include: { medicine: true } },
      patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Decrease stock for each medicine
  for (const item of body.items) {
    await db.medicine.update({
      where: { id: item.medicineId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  return NextResponse.json({ prescription }, { status: 201 });
}

// List prescriptions
async function listPrescriptions(searchParams: URLSearchParams) {
  const patientId = searchParams.get('patientId') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const where: Record<string, unknown> = {};
  if (patientId) {
    where.patientId = patientId;
  }

  const [prescriptions, total] = await Promise.all([
    db.prescription.findMany({
      where,
      include: {
        items: { include: { medicine: true } },
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.prescription.count({ where }),
  ]);

  return NextResponse.json({
    prescriptions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
