import { db } from '@/lib/db';

// ============================================================
// Audit Log Helper
// ============================================================

interface AuditLogParams {
  userId: string;
  action: string; // create, update, delete, login, logout, view
  entity: string; // patient, doctor, invoice, medicine, etc.
  entityId: string;
  details?: string;
  request?: Request;
}

/**
 * Create an audit log entry.
 * Automatically extracts IP address and user-agent from the request if provided.
 */
export async function auditLog(params: AuditLogParams) {
  try {
    let ipAddress = 'unknown';
    let userAgent = 'unknown';

    if (params.request) {
      ipAddress =
        params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        params.request.headers.get('x-real-ip') ||
        'unknown';
      userAgent = params.request.headers.get('user-agent') || 'unknown';
    }

    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details || null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to create audit log entry:', error);
  }
}
