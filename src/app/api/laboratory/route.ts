import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/laboratory - List lab tests with filters or get stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Stats endpoint
    if (searchParams.get('stats') === 'true') {
      return getLabStats();
    }

    const patientId = searchParams.get('patientId') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [labTests, total] = await Promise.all([
      db.labTest.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { testDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.labTest.count({ where }),
    ]);

    return NextResponse.json({
      labTests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Laboratory GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/laboratory - Create lab test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.patientId || !body.testName) {
      return NextResponse.json(
        { error: 'patientId and testName are required' },
        { status: 400 }
      );
    }

    const labTest = await db.labTest.create({
      data: {
        patientId: body.patientId,
        doctorId: body.doctorId,
        userId: body.userId,
        testName: body.testName,
        category: body.category,
        status: body.status || 'pending',
        results: body.results ? JSON.stringify(body.results) : undefined,
        notes: body.notes,
        cost: body.cost || 0,
        testDate: body.testDate ? new Date(body.testDate) : new Date(),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ labTest }, { status: 201 });
  } catch (error) {
    console.error('Laboratory POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create lab test' },
      { status: 500 }
    );
  }
}

// PUT /api/laboratory?id=xxx - Update lab test results
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Lab test ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.results !== undefined) data.results = JSON.stringify(body.results);
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.cost !== undefined) data.cost = body.cost;
    if (body.testDate !== undefined) data.testDate = new Date(body.testDate);
    if (body.category !== undefined) data.category = body.category;

    const labTest = await db.labTest.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ labTest });
  } catch (error) {
    console.error('Laboratory PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update lab test' },
      { status: 500 }
    );
  }
}

// Lab stats helper
async function getLabStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [total, pending, processing, completed, todayTests, todayRevenue] = await Promise.all([
    db.labTest.count(),
    db.labTest.count({ where: { status: 'pending' } }),
    db.labTest.count({ where: { status: 'processing' } }),
    db.labTest.count({ where: { status: 'completed' } }),
    db.labTest.count({ where: { testDate: { gte: todayStart, lte: todayEnd } } }),
    db.labTest.aggregate({
      _sum: { cost: true },
      where: { testDate: { gte: todayStart, lte: todayEnd } },
    }),
  ]);

  return NextResponse.json({
    total,
    pending,
    processing,
    completed,
    todayTests,
    todayRevenue: todayRevenue._sum.cost || 0,
  });
}
