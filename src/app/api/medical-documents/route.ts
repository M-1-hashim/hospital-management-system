import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractBearerToken, getSessionFromToken } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Helper: validate auth and return session or error
function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return getSessionFromToken(token);
}

// Ensure upload directory exists
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'medical');

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// GET /api/medical-documents — List documents with filters
export async function GET(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (category) where.category = category;

    const [documents, total] = await Promise.all([
      db.medicalDocument.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
        },
      }),
      db.medicalDocument.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('MedicalDocuments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/medical-documents — Upload document (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const patientId = formData.get('patientId') as string | null;
    const category = (formData.get('category') as string) || 'other';
    const visitRecordId = formData.get('visitRecordId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create document record
    const document = await db.medicalDocument.create({
      data: {
        patientId,
        visitRecordId: visitRecordId || undefined,
        fileName: file.name,
        filePath: `/uploads/medical/${fileName}`,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        category,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, fileNumber: true } },
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('MedicalDocuments POST error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// DELETE /api/medical-documents?id=xxx — Delete document (also delete file)
export async function DELETE(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Find document first to get file path
    const document = await db.medicalDocument.findUnique({ where: { id } });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Try to delete file from disk (best-effort)
    try {
      const fullPath = join(process.cwd(), 'public', document.filePath);
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    } catch {
      // File deletion is best-effort; DB record deletion proceeds
    }

    // Delete database record
    await db.medicalDocument.delete({ where: { id } });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('MedicalDocuments DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
