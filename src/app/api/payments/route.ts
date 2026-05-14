import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payments - List payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const method = searchParams.get('method');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Record<string, unknown> = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (method) where.method = method;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.paidAt = dateFilter;
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paymentStatus: true,
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 500,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payments - Add payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, amount, method, referenceNumber, receivedBy, notes } = body;

    if (!invoiceId || amount === undefined || !method) {
      return NextResponse.json(
        { error: 'invoiceId, amount, and method are required' },
        { status: 400 },
      );
    }

    const payment = await db.payment.create({
      data: {
        invoiceId,
        amount: Number(amount),
        method,
        referenceNumber: referenceNumber || null,
        receivedBy: receivedBy || null,
        notes: notes || null,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paidAmount: true,
          },
        },
      },
    });

    // Update invoice paid amount and status
    const invoice = payment.invoice;
    const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
    let newStatus = 'partial';
    if (newPaidAmount >= invoice.total) {
      newStatus = 'paid';
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: newStatus,
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Payments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payments?id= - Update payment (refunds, etc.)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json();

    // If refunding, update invoice paid amount
    if (body.status === 'refunded') {
      const existing = await db.payment.findUnique({
        where: { id },
        include: {
          invoice: {
            select: { id: true, paidAmount: true, total: true, paymentStatus: true },
          },
        },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      const payment = await db.payment.update({
        where: { id },
        data: { status: 'refunded' },
      });

      // Reduce invoice paid amount
      const newPaidAmount = Math.max(0, (existing.invoice.paidAmount || 0) - existing.amount);
      let newStatus = 'unpaid';
      if (newPaidAmount > 0 && newPaidAmount < existing.invoice.total) {
        newStatus = 'partial';
      } else if (newPaidAmount >= existing.invoice.total) {
        newStatus = 'paid';
      }

      await db.invoice.update({
        where: { id: existing.invoice.id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newStatus,
        },
      });

      return NextResponse.json({ payment });
    }

    // Generic update
    const payment = await db.payment.update({
      where: { id },
      data: body,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paymentStatus: true,
          },
        },
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Payments PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/payments?id= - Delete payment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.payment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payments DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
