import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/doctors - List doctors with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId') || '';
    const specialty = searchParams.get('specialty') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (specialty) {
      where.specialty = specialty;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { specialty: { contains: search } },
        { licenseNumber: { contains: search } },
      ];
    }

    const doctors = await db.doctor.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error('Doctors GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/doctors - Create doctor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const doctor = await db.doctor.create({
      data: {
        userId: body.userId,
        firstName: body.firstName,
        lastName: body.lastName,
        specialty: body.specialty,
        licenseNumber: body.licenseNumber,
        phone: body.phone,
        email: body.email,
        departmentId: body.departmentId,
        visitFee: body.visitFee || 0,
        workingHours: body.workingHours ? JSON.stringify(body.workingHours) : undefined,
        bio: body.bio,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      include: { department: true },
    });

    return NextResponse.json({ doctor }, { status: 201 });
  } catch (error) {
    console.error('Doctors POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create doctor' },
      { status: 500 }
    );
  }
}

// PUT /api/doctors?id=xxx - Update doctor
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.userId !== undefined) data.userId = body.userId;
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.specialty !== undefined) data.specialty = body.specialty;
    if (body.licenseNumber !== undefined) data.licenseNumber = body.licenseNumber;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email;
    if (body.departmentId !== undefined) data.departmentId = body.departmentId;
    if (body.visitFee !== undefined) data.visitFee = body.visitFee;
    if (body.workingHours !== undefined) data.workingHours = body.workingHours ? JSON.stringify(body.workingHours) : null;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.rating !== undefined) data.rating = body.rating;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const doctor = await db.doctor.update({
      where: { id },
      data,
      include: { department: true },
    });

    return NextResponse.json({ doctor });
  } catch (error) {
    console.error('Doctors PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update doctor' },
      { status: 500 }
    );
  }
}

// DELETE /api/doctors?id=xxx - Delete doctor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    await db.doctor.delete({ where: { id } });

    return NextResponse.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Doctors DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete doctor' },
      { status: 500 }
    );
  }
}
