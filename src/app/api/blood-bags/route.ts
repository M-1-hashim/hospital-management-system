import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET /api/blood-bags — list all blood bags with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const bloodType = searchParams.get('bloodType') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (bloodType) where.bloodType = bloodType;
    if (search) {
      where.OR = [
        { donorName: { contains: search } },
        { bagNumber: { contains: search } },
        { donorNationalId: { contains: search } },
      ];
    }

    const [bloodBags, total] = await Promise.all([
      db.bloodBag.findMany({
        where,
        orderBy: { collectionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bloodBag.count({ where }),
    ]);

    return NextResponse.json({
      bloodBags,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('BloodBags GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/blood-bags — create a new blood bag (with optional file upload)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      // Extract text fields from formData
      const data: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'file') {
          data[key] = value;
        }
      }

      // Handle file upload
      let filePath: string | undefined;
      let fileName: string | undefined;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const ext = path.extname(file.name) || '.pdf';
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'blood-bags');

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        filePath = `/uploads/blood-bags/${uniqueName}`;
        fileName = file.name;

        await writeFile(path.join(uploadDir, uniqueName), buffer);
      }

      // Validate required fields
      if (!data.bagNumber || !data.donorName || !data.bloodType || !data.expiryDate) {
        return NextResponse.json(
          { error: 'bagNumber, donorName, bloodType, and expiryDate are required' },
          { status: 400 },
        );
      }

      const bloodBag = await db.bloodBag.create({
        data: {
          bagNumber: String(data.bagNumber),
          donorName: String(data.donorName),
          donorPhone: data.donorPhone ? String(data.donorPhone) : null,
          donorNationalId: data.donorNationalId ? String(data.donorNationalId) : null,
          bloodType: String(data.bloodType),
          volume: data.volume ? parseInt(String(data.volume)) : 450,
          collectionDate: data.collectionDate ? new Date(String(data.collectionDate)) : new Date(),
          expiryDate: new Date(String(data.expiryDate)),
          status: String(data.status || 'collected'),
          collectedBy: data.collectedBy ? String(data.collectedBy) : null,
          notes: data.notes ? String(data.notes) : null,
          filePath,
          fileName,
        },
      });

      return NextResponse.json({ bloodBag }, { status: 201 });
    }

    // Handle JSON (no file upload)
    const body = await request.json();

    if (!body.bagNumber || !body.donorName || !body.bloodType || !body.expiryDate) {
      return NextResponse.json(
        { error: 'bagNumber, donorName, bloodType, and expiryDate are required' },
        { status: 400 },
      );
    }

    const bloodBag = await db.bloodBag.create({
      data: {
        bagNumber: body.bagNumber,
        donorName: body.donorName,
        donorPhone: body.donorPhone,
        donorNationalId: body.donorNationalId,
        bloodType: body.bloodType,
        volume: body.volume || 450,
        collectionDate: body.collectionDate ? new Date(body.collectionDate) : new Date(),
        expiryDate: new Date(body.expiryDate),
        status: body.status || 'collected',
        collectedBy: body.collectedBy,
        notes: body.notes,
        fileName: body.fileName,
        filePath: body.filePath,
      },
    });

    return NextResponse.json({ bloodBag }, { status: 201 });
  } catch (error) {
    console.error('BloodBags POST error:', error);
    return NextResponse.json({ error: 'Failed to create blood bag' }, { status: 500 });
  }
}

// PUT /api/blood-bags?id=xxx — update a blood bag (status change, test results, etc.)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Blood bag ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    const allowedFields = [
      'donorPhone', 'donorNationalId', 'volume', 'status',
      'hivTest', 'hepatitisBTest', 'hepatitisCTest', 'malariaTest', 'syphilisTest',
      'testedBy', 'issuedTo', 'collectedBy', 'notes', 'fileName', 'filePath',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'testedDate' && body[field]) {
          data.testedDate = new Date(body[field]);
        } else if (field === 'issuedDate' && body[field]) {
          data.issuedDate = new Date(body[field]);
        } else {
          data[field] = body[field];
        }
      }
    }

    // If all tests are marked, auto-set testedDate
    if (body.hivTest || body.hepatitisBTest || body.hepatitisCTest) {
      if (!data.testedDate) {
        data.testedDate = new Date();
      }
    }

    // If status is changed to 'tested', auto-update
    if (body.status === 'tested' && !data.testedDate) {
      data.testedDate = new Date();
    }

    // If status is 'issued', set issuedDate
    if (body.status === 'issued' && body.issuedTo) {
      data.issuedDate = new Date();
    }

    const bloodBag = await db.bloodBag.update({
      where: { id },
      data,
    });

    return NextResponse.json({ bloodBag });
  } catch (error) {
    console.error('BloodBags PUT error:', error);
    return NextResponse.json({ error: 'Failed to update blood bag' }, { status: 500 });
  }
}

// DELETE /api/blood-bags?id=xxx — delete a blood bag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Blood bag ID is required' }, { status: 400 });
    }

    const bag = await db.bloodBag.findUnique({ where: { id } });
    if (!bag) {
      return NextResponse.json({ error: 'Blood bag not found' }, { status: 404 });
    }

    if (bag.status === 'used') {
      return NextResponse.json({ error: 'Cannot delete a used blood bag' }, { status: 400 });
    }

    await db.bloodBag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BloodBags DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete blood bag' }, { status: 500 });
  }
}
