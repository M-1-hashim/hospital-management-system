import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: generate file number P-XXXXX
async function generateFileNumber(): Promise<string> {
  const lastPatient = await db.patient.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { fileNumber: true },
  });

  let nextNum = 1;
  if (lastPatient?.fileNumber) {
    const match = lastPatient.fileNumber.match(/P-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `P-${String(nextNum).padStart(5, '0')}`;
}

// GET /api/patients - List patients with search, filter, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { fileNumber: { contains: search } },
        { phone: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.patient.count({ where }),
    ]);

    return NextResponse.json({
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Patients GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/patients - Create new patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fileNumber = await generateFileNumber();

    const patient = await db.patient.create({
      data: {
        fileNumber,
        firstName: body.firstName,
        lastName: body.lastName,
        nationalId: body.nationalId,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        gender: body.gender || 'male',
        bloodType: body.bloodType,
        phone: body.phone,
        emergencyPhone: body.emergencyPhone,
        email: body.email,
        address: body.address,
        insuranceId: body.insuranceId,
        insuranceCompany: body.insuranceCompany,
        allergies: body.allergies ? JSON.stringify(body.allergies) : undefined,
        medicalHistory: body.medicalHistory ? JSON.stringify(body.medicalHistory) : undefined,
        status: body.status || 'outpatient',
        notes: body.notes,
      },
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error('Patients POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}

// PUT /api/patients?id=xxx - Update patient
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.nationalId !== undefined) data.nationalId = body.nationalId;
    if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.bloodType !== undefined) data.bloodType = body.bloodType;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.emergencyPhone !== undefined) data.emergencyPhone = body.emergencyPhone;
    if (body.email !== undefined) data.email = body.email;
    if (body.address !== undefined) data.address = body.address;
    if (body.insuranceId !== undefined) data.insuranceId = body.insuranceId;
    if (body.insuranceCompany !== undefined) data.insuranceCompany = body.insuranceCompany;
    if (body.allergies !== undefined) data.allergies = body.allergies ? JSON.stringify(body.allergies) : null;
    if (body.medicalHistory !== undefined) data.medicalHistory = body.medicalHistory ? JSON.stringify(body.medicalHistory) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;

    const patient = await db.patient.update({
      where: { id },
      data,
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Patients PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

// DELETE /api/patients?id=xxx - Delete patient
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    await db.patient.delete({ where: { id } });

    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Patients DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
