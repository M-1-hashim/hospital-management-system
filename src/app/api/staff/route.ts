import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/staff - List staff with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const staffList = await db.staff.findMany({
      where,
      include: {
        department: true,
        user: { select: { id: true, username: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ staff: staffList });
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/staff - Add staff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.firstName || !body.lastName || !body.role) {
      return NextResponse.json(
        { error: 'firstName, lastName, and role are required' },
        { status: 400 }
      );
    }

    const staff = await db.staff.create({
      data: {
        userId: body.userId,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        departmentId: body.departmentId,
        phone: body.phone,
        email: body.email,
        shift: body.shift,
        salary: body.salary || 0,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      include: { department: true },
    });

    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    console.error('Staff POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create staff' },
      { status: 500 }
    );
  }
}

// PUT /api/staff?id=xxx - Update staff
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.userId !== undefined) data.userId = body.userId;
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.role !== undefined) data.role = body.role;
    if (body.departmentId !== undefined) data.departmentId = body.departmentId;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email;
    if (body.shift !== undefined) data.shift = body.shift;
    if (body.salary !== undefined) data.salary = body.salary;
    if (body.hireDate !== undefined) data.hireDate = body.hireDate ? new Date(body.hireDate) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const staff = await db.staff.update({
      where: { id },
      data,
      include: { department: true },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Staff PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update staff' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff?id=xxx - Delete staff
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    await db.staff.delete({ where: { id } });

    return NextResponse.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Staff DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff' },
      { status: 500 }
    );
  }
}
