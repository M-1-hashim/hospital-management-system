import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const lastInvoice = await db.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: `INV-${year}${month}` },
    },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/INV-\d{6}-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `INV-${year}${month}-${String(nextNum).padStart(4, '0')}`;
}

// GET /api/billing - List invoices with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Stats endpoint
    if (searchParams.get('stats') === 'true') {
      return getBillingStats();
    }

    const patientId = searchParams.get('patientId') || '';
    const status = searchParams.get('status') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.paymentStatus = status;
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {};
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.createdAt = dateFilter;
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/billing - Create invoice with items
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pay endpoint
    if (searchParams.get('action') === 'pay') {
      return recordPayment(request);
    }

    const body = await request.json();

    if (!body.patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    const invoiceNumber = await generateInvoiceNumber();

    // Calculate totals from items
    const items = body.items || [];
    let subtotal = 0;
    const invoiceItems = items.map((item: { description: string; type: string; quantity: number; unitPrice: number }) => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return {
        description: item.description,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total,
      };
    });

    const discount = body.discount || 0;
    const tax = body.tax || 0;
    const total = subtotal - discount + tax;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        patientId: body.patientId,
        appointmentId: body.appointmentId,
        admissionId: body.admissionId,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: body.paymentMethod || 'cash',
        paymentStatus: total <= 0 ? 'paid' : 'unpaid',
        paidAmount: 0,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        items: {
          create: invoiceItems,
        },
      },
      include: { items: true, patient: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Billing POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

// PUT /api/billing?id=xxx - Update invoice
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.discount !== undefined) data.discount = body.discount;
    if (body.tax !== undefined) data.tax = body.tax;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;
    if (body.paidAmount !== undefined) data.paidAmount = body.paidAmount;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.appointmentId !== undefined) data.appointmentId = body.appointmentId;
    if (body.admissionId !== undefined) data.admissionId = body.admissionId;

    // Recalculate total if subtotal, discount, or tax changed
    if (body.subtotal !== undefined) {
      data.subtotal = body.subtotal;
      data.total = (body.subtotal || 0) - (data.discount as number || 0) + (data.tax as number || 0);
    }

    const invoice = await db.invoice.update({
      where: { id },
      data,
      include: { items: true, patient: true },
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Billing PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// Record payment helper
async function recordPayment(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Invoice ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const amount = body.amount;

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: 'Valid payment amount is required' },
      { status: 400 }
    );
  }

  const invoice = await db.invoice.findUnique({ where: { id } });

  if (!invoice) {
    return NextResponse.json(
      { error: 'Invoice not found' },
      { status: 404 }
    );
  }

  const newPaidAmount = invoice.paidAmount + amount;
  const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';

  const updated = await db.invoice.update({
    where: { id },
    data: {
      paidAmount: newPaidAmount,
      paymentStatus: newStatus,
      paymentMethod: body.paymentMethod || invoice.paymentMethod,
    },
    include: { items: true, patient: true },
  });

  return NextResponse.json({ invoice: updated });
}

// Billing stats helper
async function getBillingStats() {
  const now = new Date();

  // Today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // This week
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayIncome, weekIncome, monthIncome, totalUnpaid, totalPaid] = await Promise.all([
    db.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart, lte: todayEnd }, paymentStatus: 'paid' },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: weekStart }, paymentStatus: 'paid' },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart }, paymentStatus: 'paid' },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { paymentStatus: { in: ['unpaid', 'partial'] } },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { paymentStatus: 'paid' },
    }),
  ]);

  return NextResponse.json({
    todayIncome: todayIncome._sum.total || 0,
    weekIncome: weekIncome._sum.total || 0,
    monthIncome: monthIncome._sum.total || 0,
    totalUnpaid: totalUnpaid._sum.total || 0,
    totalPaid: totalPaid._sum.total || 0,
  });
}
