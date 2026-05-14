import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import JSZip from 'jszip';
import { promises as fs } from 'fs';
import path from 'path';

// GET /api/backup — List backup records (most recent first, limit 20)
export async function GET() {
  try {
    const records = await db.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Backup list error:', error);
    return NextResponse.json(
      { error: 'Failed to list backups', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/backup — Create backup (default) or restore (?action=restore)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'restore') {
    return handleRestore(request);
  }

  return handleCreateBackup();
}

// ──────────── CREATE BACKUP ────────────
async function handleCreateBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `hms-backup-${timestamp}.zip`;
    const filePath = `/backups/${fileName}`;

    // 1. Export all tables from SQLite to JSON
    const tables = [
      { name: 'users', data: await db.user.findMany() },
      { name: 'activity_logs', data: await db.activityLog.findMany() },
      { name: 'patients', data: await db.patient.findMany() },
      { name: 'departments', data: await db.department.findMany() },
      { name: 'doctors', data: await db.doctor.findMany() },
      { name: 'appointments', data: await db.appointment.findMany() },
      { name: 'beds', data: await db.bed.findMany() },
      { name: 'admissions', data: await db.admission.findMany() },
      { name: 'invoices', data: await db.invoice.findMany() },
      { name: 'invoice_items', data: await db.invoiceItem.findMany() },
      { name: 'medicines', data: await db.medicine.findMany() },
      { name: 'prescriptions', data: await db.prescription.findMany() },
      { name: 'prescription_items', data: await db.prescriptionItem.findMany() },
      { name: 'lab_tests', data: await db.labTest.findMany() },
      { name: 'blood_bags', data: await db.bloodBag.findMany() },
      { name: 'staff', data: await db.staff.findMany() },
      { name: 'hospital_settings', data: await db.hospitalSetting.findMany() },
      { name: 'insurances', data: await db.insurance.findMany() },
      { name: 'services', data: await db.service.findMany() },
      { name: 'expenses', data: await db.expense.findMany() },
      { name: 'vital_records', data: await db.vitalRecord.findMany() },
      { name: 'queues', data: await db.queue.findMany() },
      { name: 'visit_records', data: await db.visitRecord.findMany() },
      { name: 'medical_documents', data: await db.medicalDocument.findMany() },
      { name: 'shift_schedules', data: await db.shiftSchedule.findMany() },
      { name: 'attendances', data: await db.attendance.findMany() },
      { name: 'payments', data: await db.payment.findMany() },
      { name: 'audit_logs', data: await db.auditLog.findMany() },
      { name: 'notifications', data: await db.notification.findMany() },
    ];

    // 2. Create JSZip with all data files
    const zip = new JSZip();
    const metadata = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      tables: tables.map((t) => ({
        name: t.name,
        count: t.data.length,
      })),
    };

    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    for (const table of tables) {
      zip.file(`data/${table.name}.json`, JSON.stringify(table.data, null, 2));
    }

    // Generate zip
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    const fileSize = zipBuffer.length;

    // 3. Save to /public/backups/
    const publicDir = path.join(process.cwd(), 'public', 'backups');
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, fileName), Buffer.from(zipBuffer));

    // 4. Create BackupRecord in DB
    const record = await db.backupRecord.create({
      data: {
        fileName,
        filePath,
        fileSize,
        type: 'manual',
        status: 'completed',
      },
    });

    // 5. Return download URL
    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      record,
      downloadUrl: filePath,
      fileSize,
    });
  } catch (error) {
    console.error('Backup create error:', error);

    // Record the failure
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await db.backupRecord.create({
        data: {
          fileName: `hms-backup-failed-${timestamp}.zip`,
          filePath: '',
          fileSize: 0,
          type: 'manual',
          status: 'failed',
        },
      });
    } catch {
      // ignore secondary error
    }

    return NextResponse.json(
      { error: 'Failed to create backup', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/backup?id=xxx — Update a backup record (e.g., update status, notes)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Backup record ID is required' }, { status: 400 });
    }

    const existing = await db.backupRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Backup record not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.fileName !== undefined) data.fileName = body.fileName;
    if (body.filePath !== undefined) data.filePath = body.filePath;
    if (body.fileSize !== undefined) data.fileSize = body.fileSize;
    if (body.type !== undefined) data.type = body.type;

    const record = await db.backupRecord.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: record, success: true });
  } catch (error) {
    console.error('Backup update error:', error);
    return NextResponse.json(
      { error: 'Failed to update backup record', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/backup?id=xxx — Delete a backup record and its file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Backup record ID is required' }, { status: 400 });
    }

    const existing = await db.backupRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Backup record not found' }, { status: 404 });
    }

    // Try to delete the backup file from disk (best-effort)
    try {
      const publicDir = path.join(process.cwd(), 'public', 'backups');
      const filePath = path.join(publicDir, existing.fileName);
      const { existsSync, unlink } = await import('fs');
      if (existsSync(filePath)) {
        unlink(filePath, (err) => {
          if (err) console.error('Failed to delete backup file:', err);
        });
      }
    } catch {
      // File deletion is best-effort; DB record deletion proceeds
    }

    await db.backupRecord.delete({ where: { id } });

    return NextResponse.json({ message: 'Backup record deleted successfully', success: true });
  } catch (error) {
    console.error('Backup delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup record', details: String(error) },
      { status: 500 }
    );
  }
}

// ──────────── RESTORE BACKUP ────────────
async function handleRestore(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Invalid file format. Only .zip files are accepted.' },
        { status: 400 }
      );
    }

    // 1. Read and extract the zip file
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    // 2. Validate backup structure
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) {
      return NextResponse.json(
        { error: 'Invalid backup file: missing metadata.json' },
        { status: 400 }
      );
    }

    const metadata = JSON.parse(await metadataFile.async('string'));
    if (!metadata.version || !metadata.tables) {
      return NextResponse.json(
        { error: 'Invalid backup file: corrupted metadata' },
        { status: 400 }
      );
    }

    // Define delete order respecting foreign keys
    const deleteOrder = [
      'payment', 'attendance', 'shiftSchedule', 'medicalDocument',
      'visitRecord', 'queue', 'vitalRecord', 'expense', 'service',
      'insurance', 'hospitalSetting', 'staff', 'bloodBag', 'labTest',
      'prescriptionItem', 'prescription', 'medicine', 'admission', 'bed',
      'appointment', 'doctor', 'patient', 'activityLog', 'auditLog',
      'notification', 'invoiceItem', 'invoice', 'user', 'department',
      'backupRecord',
    ];

    // Clear all existing data
    for (const tableName of deleteOrder) {
      try {
        const model = db[tableName as keyof typeof db] as any;
        if (model && typeof model.deleteMany === 'function') {
          await model.deleteMany();
        }
      } catch {
        // Continue even if some tables don't exist
      }
    }

    // Define insert order respecting foreign keys
    const insertOrder = [
      'department', 'user', 'activityLog', 'auditLog', 'notification',
      'patient', 'doctor', 'appointment', 'bed', 'admission', 'invoice',
      'invoiceItem', 'medicine', 'prescription', 'prescriptionItem',
      'labTest', 'bloodBag', 'staff', 'hospitalSetting', 'insurance',
      'service', 'expense', 'vitalRecord', 'queue', 'visitRecord',
      'medicalDocument', 'shiftSchedule', 'attendance', 'payment',
    ];

    // 3. Import data from backup
    let totalImported = 0;
    for (const tableName of insertOrder) {
      const dataFile = zip.file(`data/${tableName}.json`);
      if (!dataFile) continue;

      const data = JSON.parse(await dataFile.async('string'));
      if (!Array.isArray(data) || data.length === 0) continue;

      try {
        const model = db[tableName as keyof typeof db] as any;
        if (model && typeof model.createMany === 'function') {
          await model.createMany({
            data: data.map((row: any) => {
              // Convert date strings back to Date objects
              const cleaned = { ...row };
              for (const [key, value] of Object.entries(cleaned)) {
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                  cleaned[key] = new Date(value);
                }
              }
              return cleaned;
            }),
            skipDuplicates: true,
          });
          totalImported += data.length;
        }
      } catch (tableError) {
        console.error(`Error importing table ${tableName}:`, tableError);
        // Try inserting one by one if createMany fails
        try {
          const model = db[tableName as keyof typeof db] as any;
          if (model && typeof model.create === 'function') {
            for (const row of data) {
              const cleaned = { ...row };
              for (const [key, value] of Object.entries(cleaned)) {
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                  cleaned[key] = new Date(value);
                }
              }
              try {
                await model.create({ data: cleaned });
              } catch {
                // Skip individual errors
              }
            }
            totalImported += data.length;
          }
        } catch {
          // Continue with other tables
        }
      }
    }

    // 4. Create BackupRecord with type=restore
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const record = await db.backupRecord.create({
      data: {
        fileName: file.name,
        filePath: '',
        fileSize: file.size,
        type: 'restore',
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Backup restored successfully',
      record,
      tablesRestored: metadata.tables.length,
      totalRecordsImported: totalImported,
    });
  } catch (error) {
    console.error('Backup restore error:', error);

    // Record the failure
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await db.backupRecord.create({
        data: {
          fileName: `restore-failed-${timestamp}`,
          filePath: '',
          fileSize: 0,
          type: 'restore',
          status: 'failed',
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json(
      { error: 'Failed to restore backup', details: String(error) },
      { status: 500 }
    );
  }
}
