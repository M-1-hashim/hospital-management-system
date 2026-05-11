import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    const departments = await db.department.findMany({
      include: {
        _count: {
          select: {
            doctors: true,
            beds: true,
            staff: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Departments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create department
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.nameFa) {
      return NextResponse.json(
        { error: 'name and nameFa are required' },
        { status: 400 }
      );
    }

    const department = await db.department.create({
      data: {
        name: body.name,
        nameFa: body.nameFa,
        floor: body.floor,
        description: body.description,
        headDoctor: body.headDoctor,
        phone: body.phone,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error('Departments POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}

// PUT /api/departments?id=xxx - Update department
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.nameFa !== undefined) data.nameFa = body.nameFa;
    if (body.floor !== undefined) data.floor = body.floor;
    if (body.description !== undefined) data.description = body.description;
    if (body.headDoctor !== undefined) data.headDoctor = body.headDoctor;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const department = await db.department.update({
      where: { id },
      data,
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error('Departments PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments?id=xxx - Delete department
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    await db.department.delete({ where: { id } });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Departments DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
