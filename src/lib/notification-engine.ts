import { db } from '@/lib/db';

// ============================================================
// Notification Engine — creates automatic notifications in the DB
// ============================================================

interface NotificationParams {
  userId?: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  relatedEntityType?: string;
  relatedEntityId?: string;
}

async function createNotification(params: NotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: params.userId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        relatedEntityType: params.relatedEntityType || null,
        relatedEntityId: params.relatedEntityId || null,
      },
    });
    return notification;
  } catch (error) {
    console.error(`[NotificationEngine] Failed to create notification (${params.type}):`, error);
    return null;
  }
}

// ---- Notification Functions ----

/**
 * Notify about an upcoming appointment reminder
 */
export async function notifyAppointmentReminder(appointmentId: string) {
  try {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true, specialty: true } },
      },
    });

    if (!appointment) return;

    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;
    const visitDate = appointment.date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await createNotification({
      type: 'appointment',
      title: 'Appointment Reminder',
      message: `Upcoming appointment for ${patientName} with ${doctorName} on ${visitDate}`,
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyAppointmentReminder error:', error);
  }
}

/**
 * Notify that a lab test result is ready
 */
export async function notifyLabResultReady(testId: string) {
  try {
    const labTest = await db.labTest.findUnique({
      where: { id: testId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    if (!labTest) return;

    const patientName = `${labTest.patient.firstName} ${labTest.patient.lastName}`;

    await createNotification({
      type: 'lab_result',
      title: 'Lab Results Ready',
      message: `Lab results for "${labTest.testName}" (${patientName}) are now available for review`,
      priority: 'medium',
      relatedEntityType: 'lab_test',
      relatedEntityId: testId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyLabResultReady error:', error);
  }
}

/**
 * Notify that a medicine is approaching its expiry date
 */
export async function notifyMedicineExpiring(medicineId: string) {
  try {
    const medicine = await db.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) return;

    const expiryStr = medicine.expiryDate
      ? medicine.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'unknown';

    await createNotification({
      type: 'medicine_expiry',
      title: 'Medicine Expiry Alert',
      message: `"${medicine.name}" (Batch: ${medicine.batchNumber || 'N/A'}) expires on ${expiryStr}. Stock: ${medicine.stock} units`,
      priority: medicine.expiryDate && new Date(medicine.expiryDate) < new Date(Date.now() + 30 * 86400000) ? 'high' : 'medium',
      relatedEntityType: 'medicine',
      relatedEntityId: medicineId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyMedicineExpiring error:', error);
  }
}

/**
 * Notify that a medicine stock is low
 */
export async function notifyLowStock(medicineId: string) {
  try {
    const medicine = await db.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) return;

    await createNotification({
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `"${medicine.name}" is running low. Current stock: ${medicine.stock} units (Minimum: ${medicine.minStock})`,
      priority: medicine.stock === 0 ? 'critical' : 'high',
      relatedEntityType: 'medicine',
      relatedEntityId: medicineId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyLowStock error:', error);
  }
}

/**
 * Notify that a bed has become available
 */
export async function notifyBedAvailable(bedId: string) {
  try {
    const bed = await db.bed.findUnique({
      where: { id: bedId },
      include: {
        department: { select: { name: true } },
      },
    });

    if (!bed) return;

    await createNotification({
      type: 'bed',
      title: 'Bed Available',
      message: `Bed #${bed.number} in ${bed.department.name} is now available (${bed.type})`,
      priority: 'medium',
      relatedEntityType: 'bed',
      relatedEntityId: bedId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyBedAvailable error:', error);
  }
}

/**
 * Notify that a payment is due
 */
export async function notifyPaymentDue(invoiceId: string) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invoice) return;

    const patientName = `${invoice.patient.firstName} ${invoice.patient.lastName}`;
    const dueStr = invoice.dueDate
      ? invoice.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'unknown';

    await createNotification({
      type: 'billing',
      title: 'Payment Due',
      message: `Invoice #${invoice.invoiceNumber} for ${patientName} — Balance: $${invoice.total.toFixed(2)}, Due: ${dueStr}`,
      priority: invoice.dueDate && new Date(invoice.dueDate) < new Date(Date.now() + 7 * 86400000) ? 'high' : 'medium',
      relatedEntityType: 'invoice',
      relatedEntityId: invoiceId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyPaymentDue error:', error);
  }
}

/**
 * Notify that a blood bag is approaching expiry
 */
export async function notifyBloodExpiring(bagId: string) {
  try {
    const bloodBag = await db.bloodBag.findUnique({
      where: { id: bagId },
    });

    if (!bloodBag) return;

    const expiryStr = bloodBag.expiryDate
      ? bloodBag.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'unknown';

    await createNotification({
      type: 'blood_expiry',
      title: 'Blood Expiry Alert',
      message: `Blood bag #${bloodBag.bagNumber} (${bloodBag.bloodType}) expires on ${expiryStr}. Volume: ${bloodBag.volume}ml`,
      priority: bloodBag.expiryDate && new Date(bloodBag.expiryDate) < new Date(Date.now() + 7 * 86400000) ? 'critical' : 'high',
      relatedEntityType: 'blood_bag',
      relatedEntityId: bagId,
    });
  } catch (error) {
    console.error('[NotificationEngine] notifyBloodExpiring error:', error);
  }
}
