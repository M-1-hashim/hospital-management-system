// ============================================================
// Print Utility Module — HMS
// Opens a new browser window with formatted HTML and triggers
// window.print(). Supports RTL via the current document dir.
// ============================================================

/** Detect RTL direction from the current document */
function getDirection(): 'rtl' | 'ltr' {
  if (typeof document === 'undefined') return 'ltr';
  const dir = document.documentElement.dir || document.documentElement.getAttribute('dir') || 'ltr';
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

/** Common base styles for all print documents */
function baseStyles(dir: 'rtl' | 'ltr'): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      padding: 20px;
      direction: ${dir};
      text-align: ${dir === 'rtl' ? 'right' : 'left'};
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #10b981;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 11px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
    }
    .info-item { margin-bottom: 4px; }
    .info-label { font-weight: 600; color: #6b7280; font-size: 11px; }
    .info-value { color: #111827; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12px;
    }
    thead th {
      background: #f3f4f6;
      font-weight: 600;
      text-align: ${dir === 'rtl' ? 'right' : 'left'};
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      font-size: 11px;
      text-transform: uppercase;
      color: #374151;
    }
    tbody td {
      padding: 7px 10px;
      border: 1px solid #e5e7eb;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .notes-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin-top: 8px;
      min-height: 40px;
    }
    .signature-line {
      margin-top: 40px;
      display: flex;
      justify-content: ${dir === 'rtl' ? 'flex-start' : 'flex-end'};
    }
    .signature-line .sig {
      text-align: center;
    }
    .signature-line .sig::before {
      content: '';
      display: block;
      width: 200px;
      border-bottom: 1px solid #374151;
      margin-bottom: 6px;
    }
    .signature-line .sig span {
      font-size: 11px;
      color: #6b7280;
    }
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  `;
}

/** Open a print window with the given HTML content */
function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for content to render, then print
  printWindow.onload = () => {
    printWindow.print();
  };
  // Fallback: if onload doesn't fire quickly
  setTimeout(() => {
    try { printWindow.print(); } catch { /* already printing or closed */ }
  }, 500);
}

function buildDocument(dir: 'rtl' | 'ltr', bodyContent: string, title: string = 'Print'): string {
  return `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles(dir)}</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

// ============================================================
// 1. printPrescription
// ============================================================

export interface PrescriptionPrintData {
  patientName: string;
  patientAge: string;
  patientGender: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  items: Array<{
    medicine: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  notes?: string;
}

export function printPrescription(data: PrescriptionPrintData): void {
  const dir = getDirection();
  const isRTL = dir === 'rtl';

  const itemsHtml = data.items
    .map(
      (item, i) => `
    <tr>
      <td style="text-align:center;font-weight:600;">${i + 1}</td>
      <td>${item.medicine}</td>
      <td>${item.dosage}</td>
      <td>${item.frequency}</td>
      <td>${item.duration}</td>
    </tr>`,
    )
    .join('');

  const body = `
    <div class="header">
      <h1>${isRTL ? 'سیستم مدیریت بیمارستان' : 'HMS - Hospital Management System'}</h1>
      <p>${isRTL ? 'نسخه دارویی' : 'Prescription'}</p>
    </div>

    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">${isRTL ? 'بیمار' : 'Patient Name'}:</span>
          <span class="info-value"> ${data.patientName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'سن' : 'Age'}:</span>
          <span class="info-value"> ${data.patientAge}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'جنسیت' : 'Gender'}:</span>
          <span class="info-value"> ${data.patientGender}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'تاریخ' : 'Date'}:</span>
          <span class="info-value"> ${data.date}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">${isRTL ? 'پزشک' : 'Doctor'}:</span>
          <span class="info-value"> ${data.doctorName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'تخصص' : 'Specialty'}:</span>
          <span class="info-value"> ${data.doctorSpecialty}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">${isRTL ? 'داروها' : 'Medicines'}</div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:30px;">#</th>
            <th>${isRTL ? 'دارو' : 'Medicine'}</th>
            <th>${isRTL ? 'دوز' : 'Dosage'}</th>
            <th>${isRTL ? 'دفعات' : 'Frequency'}</th>
            <th>${isRTL ? 'مدت' : 'Duration'}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    ${data.notes ? `
    <div class="section">
      <div class="section-title">${isRTL ? 'یادداشت' : 'Notes'}</div>
      <div class="notes-box">${data.notes}</div>
    </div>
    ` : ''}

    <div class="signature-line">
      <div class="sig">
        <span>${isRTL ? 'امضای پزشک' : 'Doctor Signature'}</span>
      </div>
    </div>

    <div class="footer">
      ${isRTL ? 'این سند صرفاً جهت اطلاع است و جایگزین نسخه اصلی نمی‌باشد.' : 'This document is for informational purposes only and does not replace the original prescription.'}
    </div>
  `;

  openPrintWindow(buildDocument(dir, body, isRTL ? 'نسخه دارویی' : 'Prescription'));
}

// ============================================================
// 2. printLabResults
// ============================================================

export interface LabResultPrintData {
  patientName: string;
  doctorName: string;
  testDate: string;
  testName: string;
  results: Array<{
    name: string;
    value: string;
    unit: string;
    normalMin: string;
    normalMax: string;
    status: string; // 'normal' | 'borderline' | 'high' | 'low'
  }>;
  labTech?: string;
}

export function printLabResults(data: LabResultPrintData): void {
  const dir = getDirection();
  const isRTL = dir === 'rtl';

  const statusColors: Record<string, { bg: string; text: string; label: string; labelFa: string }> = {
    normal: { bg: '#dcfce7', text: '#166534', label: 'Normal', labelFa: 'طبیعی' },
    borderline: { bg: '#fef3c7', text: '#92400e', label: 'Borderline', labelFa: 'مرزی' },
    high: { bg: '#fee2e2', text: '#991b1b', label: 'High', labelFa: 'بالا' },
    low: { bg: '#fee2e2', text: '#991b1b', label: 'Low', labelFa: 'پایین' },
  };

  const resultsHtml = data.results
    .map((r, i) => {
      const sc = statusColors[r.status] || statusColors.normal;
      return `
    <tr>
      <td style="text-align:center;font-weight:600;">${i + 1}</td>
      <td>${r.name}</td>
      <td style="font-weight:600;">${r.value}</td>
      <td>${r.unit}</td>
      <td>${r.normalMin} - ${r.normalMax}</td>
      <td style="text-align:center;">
        <span style="background:${sc.bg};color:${sc.text};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600;">
          ${isRTL ? sc.labelFa : sc.label}
        </span>
      </td>
    </tr>`;
    })
    .join('');

  const timestamp = new Date().toLocaleString(dir === 'rtl' ? 'fa-IR' : 'en-US');

  const body = `
    <div class="header">
      <h1>${isRTL ? 'سیستم مدیریت بیمارستان' : 'HMS - Hospital Management System'}</h1>
      <p>${isRTL ? 'نتایج آزمایشگاه' : 'Laboratory Test Results'}</p>
    </div>

    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">${isRTL ? 'بیمار' : 'Patient Name'}:</span>
          <span class="info-value"> ${data.patientName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'پزشک' : 'Doctor'}:</span>
          <span class="info-value"> ${data.doctorName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'نام آزمایش' : 'Test Name'}:</span>
          <span class="info-value"> ${data.testName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">${isRTL ? 'تاریخ آزمایش' : 'Test Date'}:</span>
          <span class="info-value"> ${data.testDate}</span>
        </div>
        ${data.labTech ? `
        <div class="info-item">
          <span class="info-label">${isRTL ? 'تکنسین آزمایشگاه' : 'Lab Technician'}:</span>
          <span class="info-value"> ${data.labTech}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">${isRTL ? 'نتایج' : 'Results'}</div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:30px;">#</th>
            <th>${isRTL ? 'آزمایش' : 'Test'}</th>
            <th>${isRTL ? 'مقدار' : 'Value'}</th>
            <th>${isRTL ? 'واحد' : 'Unit'}</th>
            <th>${isRTL ? 'محدوده طبیعی' : 'Normal Range'}</th>
            <th style="text-align:center;">${isRTL ? 'وضعیت' : 'Status'}</th>
          </tr>
        </thead>
        <tbody>
          ${resultsHtml}
        </tbody>
      </table>
    </div>

    <div class="footer">
      ${isRTL ? `گزارش در تاریخ ${timestamp} تولید شده است.` : `Report generated at ${timestamp}`}
    </div>
  `;

  openPrintWindow(buildDocument(dir, body, isRTL ? 'نتایج آزمایشگاه' : 'Lab Results'));
}

// ============================================================
// 3. printBloodLabel
// ============================================================

export interface BloodLabelPrintData {
  bagNumber: string;
  bloodType: string;
  volume: number;
  donorName: string;
  collectionDate: string;
  expiryDate: string;
  collectedBy?: string;
  status: string;
}

export function printBloodLabel(data: BloodLabelPrintData): void {
  const dir = getDirection();
  const isRTL = dir === 'rtl';

  const statusColors: Record<string, { bg: string; text: string }> = {
    collected: { bg: '#dbeafe', text: '#1e40af' },
    tested: { bg: '#fef3c7', text: '#92400e' },
    stored: { bg: '#dcfce7', text: '#166534' },
    issued: { bg: '#e0e7ff', text: '#3730a3' },
    used: { bg: '#f3f4f6', text: '#374151' },
    expired: { bg: '#fee2e2', text: '#991b1b' },
    discarded: { bg: '#fee2e2', text: '#991b1b' },
  };

  const sc = statusColors[data.status] || statusColors.stored;

  // Barcode-style: make each character a block
  const barcodeChars = data.bagNumber
    .split('')
    .map((ch) => `<span style="display:inline-block;font-family:'Courier New',monospace;font-size:20px;font-weight:900;letter-spacing:4px;">${ch}</span>`)
    .join('');

  const labelStyles = `
    ${baseStyles(dir)}
    .label-container {
      max-width: 350px;
      margin: 0 auto;
      border: 3px solid #dc2626;
      border-radius: 12px;
      padding: 20px;
      background: #fff;
    }
    .blood-type {
      text-align: center;
      margin: 10px 0;
    }
    .blood-type-value {
      display: inline-block;
      font-size: 48px;
      font-weight: 900;
      color: #dc2626;
      background: #fee2e2;
      padding: 8px 24px;
      border-radius: 8px;
      border: 2px solid #dc2626;
      letter-spacing: 4px;
    }
    .bag-number {
      text-align: center;
      margin: 8px 0;
      background: #f3f4f6;
      padding: 8px;
      border-radius: 6px;
      border: 1px dashed #9ca3af;
    }
    .bag-number .label {
      font-size: 10px;
      color: #6b7280;
      display: block;
      margin-bottom: 2px;
    }
    .bag-number .value {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      letter-spacing: 3px;
    }
    .label-info {
      margin-top: 12px;
    }
    .label-info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #e5e7eb;
      font-size: 12px;
    }
    .label-info-row .lbl {
      color: #6b7280;
      font-weight: 600;
    }
    .label-info-row .val {
      color: #111827;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 14px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .warning-box {
      margin-top: 14px;
      background: #fef2f2;
      border: 2px solid #fca5a5;
      border-radius: 6px;
      padding: 8px 12px;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      color: #991b1b;
      text-transform: uppercase;
    }
    .label-header {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      color: #374151;
      padding-bottom: 8px;
      border-bottom: 2px solid #dc2626;
    }
  `;

  const labelBody = `
    <div class="label-container">
      <div class="label-header">
        ${isRTL ? 'کیسه خون — برچسب' : 'Blood Bag Label'}
      </div>

      <div class="blood-type">
        <div class="blood-type-value">${data.bloodType}</div>
      </div>

      <div class="bag-number">
        <span class="label">${isRTL ? 'شماره کیسه' : 'Bag Number'}</span>
        <span class="value">${barcodeChars}</span>
      </div>

      <div class="label-info">
        <div class="label-info-row">
          <span class="lbl">${isRTL ? 'اهداکننده' : 'Donor'}</span>
          <span class="val">${data.donorName}</span>
        </div>
        <div class="label-info-row">
          <span class="lbl">${isRTL ? 'حجم' : 'Volume'}</span>
          <span class="val">${data.volume} ml</span>
        </div>
        <div class="label-info-row">
          <span class="lbl">${isRTL ? 'تاریخ جمع‌آوری' : 'Collected'}</span>
          <span class="val">${data.collectionDate}</span>
        </div>
        <div class="label-info-row">
          <span class="lbl">${isRTL ? 'تاریخ انقضا' : 'Expiry'}</span>
          <span class="val">${data.expiryDate}</span>
        </div>
        ${data.collectedBy ? `
        <div class="label-info-row">
          <span class="lbl">${isRTL ? 'جمع‌آوری توسط' : 'Collected By'}</span>
          <span class="val">${data.collectedBy}</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align:center;margin-top:10px;">
        <span class="status-badge" style="background:${sc.bg};color:${sc.text};">
          ${data.status}
        </span>
      </div>

      <div class="warning-box">
        ${isRTL ? '⚠ قبل از تزریق خون، گروه خونی را تأیید کنید' : '⚠ VERIFY BLOOD TYPE BEFORE TRANSFUSION'}
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isRTL ? 'برچسب کیسه خون' : 'Blood Bag Label'}</title>
  <style>${labelStyles}</style>
</head>
<body>
  ${labelBody}
</body>
</html>`;

  openPrintWindow(html);
}

// ============================================================
// 4. printPatientCard
// ============================================================

export interface PatientCardPrintData {
  fileNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  bloodType?: string;
  dateOfBirth?: string;
  phone: string;
  allergies?: string;
  emergencyPhone?: string;
}

export function printPatientCard(data: PatientCardPrintData): void {
  const dir = getDirection();
  const isRTL = dir === 'rtl';

  const cardStyles = `
    ${baseStyles(dir)}
    .patient-card {
      max-width: 400px;
      margin: 0 auto;
      border: 2px solid #10b981;
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .card-header {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      padding: 16px 20px;
      text-align: center;
    }
    .card-header .hospital-name {
      font-size: 11px;
      opacity: 0.9;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .card-header .logo-placeholder {
      width: 48px;
      height: 48px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      margin: 0 auto 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .card-body {
      padding: 20px;
    }
    .patient-name {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .file-number {
      text-align: center;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #6b7280;
      background: #f3f4f6;
      display: inline-block;
      padding: 3px 14px;
      border-radius: 6px;
      margin: 0 auto 16px;
      display: block;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid #d1d5db;
    }
    .info-grid-card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 16px;
    }
    .info-cell .cell-label {
      font-size: 10px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .info-cell .cell-value {
      font-size: 13px;
      color: #111827;
      font-weight: 500;
    }
    .blood-type-badge {
      display: inline-block;
      background: #fee2e2;
      color: #dc2626;
      font-weight: 800;
      font-size: 14px;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .allergy-warning {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 12px;
      font-size: 11px;
      color: #92400e;
    }
    .card-footer {
      background: #f9fafb;
      padding: 10px 20px;
      text-align: center;
      font-size: 10px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  `;

  const body = `
    <div class="patient-card">
      <div class="card-header">
        <div class="logo-placeholder">🏥</div>
        <div class="hospital-name">
          ${isRTL ? 'سیستم مدیریت بیمارستان' : 'HMS - Hospital Management System'}
        </div>
      </div>

      <div class="card-body">
        <div class="patient-name">${data.firstName} ${data.lastName}</div>
        <div class="file-number">${isRTL ? 'پرونده' : 'FILE'}: ${data.fileNumber}</div>

        <div class="info-grid-card">
          <div class="info-cell">
            <div class="cell-label">${isRTL ? 'جنسیت' : 'Gender'}</div>
            <div class="cell-value">${data.gender}</div>
          </div>
          <div class="info-cell">
            <div class="cell-label">${isRTL ? 'گروه خونی' : 'Blood Type'}</div>
            <div class="cell-value">
              ${data.bloodType ? `<span class="blood-type-badge">${data.bloodType}</span>` : (isRTL ? '—' : '—')}
            </div>
          </div>
          <div class="info-cell">
            <div class="cell-label">${isRTL ? 'تاریخ تولد' : 'Date of Birth'}</div>
            <div class="cell-value">${data.dateOfBirth || (isRTL ? '—' : '—')}</div>
          </div>
          <div class="info-cell">
            <div class="cell-label">${isRTL ? 'تلفن' : 'Phone'}</div>
            <div class="cell-value">${data.phone}</div>
          </div>
          <div class="info-cell">
            <div class="cell-label">${isRTL ? 'تماس اضطراری' : 'Emergency Contact'}</div>
            <div class="cell-value">${data.emergencyPhone || (isRTL ? '—' : '—')}</div>
          </div>
        </div>

        ${data.allergies ? `
        <div class="allergy-warning">
          <strong>${isRTL ? '⚠ حساسیت‌ها' : '⚠ Allergies'}:</strong> ${data.allergies}
        </div>
        ` : ''}
      </div>

      <div class="card-footer">
        ${isRTL
          ? '⚠ در صورت اضطراری، این کارت را به پرسنل درمان ارائه دهید'
          : '⚠ In case of emergency, please present this card to medical staff'}
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isRTL ? 'کارت بیمار' : 'Patient Card'}</title>
  <style>${cardStyles}</style>
</head>
<body>
  ${body}
</body>
</html>`;

  openPrintWindow(html);
}

// ============================================================
// 5. printInvoice
// ============================================================

export interface InvoicePrintData {
  invoiceNumber: string;
  date: string;
  patientName: string;
  items: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  hospitalName?: string;
}

export function printInvoice(data: InvoicePrintData): void {
  const dir = getDirection();
  const isRTL = dir === 'rtl';

  const paymentColors: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: '#dcfce7', text: '#166534', label: isRTL ? 'پرداخت شده' : 'PAID' },
    unpaid: { bg: '#fee2e2', text: '#991b1b', label: isRTL ? 'پرداخت نشده' : 'UNPAID' },
    partial: { bg: '#fef3c7', text: '#92400e', label: isRTL ? 'پرداخت جزئی' : 'PARTIAL' },
  };
  const pc = paymentColors[data.paymentStatus] || paymentColors.unpaid;

  const fmt = (n: number) => n.toLocaleString(dir === 'rtl' ? 'fa-IR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const itemsHtml = data.items
    .map(
      (item, i) => `
    <tr>
      <td style="text-align:center;font-weight:600;">${i + 1}</td>
      <td>${item.description}</td>
      <td style="text-align:center;">${item.qty}</td>
      <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};">${fmt(item.unitPrice)}</td>
      <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:600;">${fmt(item.total)}</td>
    </tr>`,
    )
    .join('');

  const align = dir === 'rtl' ? 'left' : 'right';

  const invoiceStyles = `
    ${baseStyles(dir)}
    .invoice-container {
      max-width: 700px;
      margin: 0 auto;
    }
    .invoice-title {
      text-align: center;
      font-size: 26px;
      font-weight: 800;
      color: #374151;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .invoice-meta .meta-item {
      font-size: 12px;
    }
    .invoice-meta .meta-item .lbl {
      color: #6b7280;
      font-weight: 600;
    }
    .payment-badge {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-table {
      width: 280px;
      margin-${dir === 'rtl' ? 'left' : 'right'}: auto;
      margin-top: 16px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 6px 10px;
      border: none;
      font-size: 13px;
    }
    .summary-table .total-row {
      border-top: 2px solid #111827;
    }
    .summary-table .total-row td {
      font-size: 16px;
      font-weight: 800;
      padding-top: 8px;
    }
    .thank-you {
      text-align: center;
      margin-top: 24px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 8px;
      color: #166534;
      font-size: 13px;
      font-weight: 600;
    }
  `;

  const body = `
    <div class="invoice-container">
      <div class="header">
        <h1>${isRTL ? 'سیستم مدیریت بیمارستان' : (data.hospitalName || 'HMS - Hospital Management System')}</h1>
      </div>

      <div class="invoice-title">${isRTL ? 'فاکتور' : 'INVOICE'}</div>

      <div class="invoice-meta">
        <div class="meta-item">
          <span class="lbl">${isRTL ? 'شماره فاکتور' : 'Invoice'}:</span>
          <span style="font-weight:700;"> #${data.invoiceNumber}</span>
        </div>
        <div class="meta-item">
          <span class="lbl">${isRTL ? 'تاریخ' : 'Date'}:</span>
          <span> ${data.date}</span>
        </div>
        <div>
          <span class="payment-badge" style="background:${pc.bg};color:${pc.text};">${pc.label}</span>
        </div>
      </div>

      <div class="section">
        <div class="info-item">
          <span class="info-label">${isRTL ? 'بیمار' : 'Patient'}:</span>
          <span class="info-value" style="font-size:15px;font-weight:600;"> ${data.patientName}</span>
        </div>
      </div>

      <div class="section">
        <table>
          <thead>
            <tr>
              <th style="text-align:center;width:30px;">#</th>
              <th>${isRTL ? 'شرح' : 'Description'}</th>
              <th style="text-align:center;">${isRTL ? 'تعداد' : 'Qty'}</th>
              <th style="text-align:${align};">${isRTL ? 'قیمت واحد' : 'Unit Price'}</th>
              <th style="text-align:${align};">${isRTL ? 'جمع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <table class="summary-table">
        <tr>
          <td>${isRTL ? 'جمع فرعی' : 'Subtotal'}</td>
          <td style="text-align:${align};">${fmt(data.subtotal)}</td>
        </tr>
        ${data.discount > 0 ? `
        <tr>
          <td>${isRTL ? 'تخفیف' : 'Discount'}</td>
          <td style="text-align:${align};color:#dc2626;">-${fmt(data.discount)}</td>
        </tr>
        ` : ''}
        ${data.tax > 0 ? `
        <tr>
          <td>${isRTL ? 'مالیات' : 'Tax'}</td>
          <td style="text-align:${align};">${fmt(data.tax)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>${isRTL ? 'مبلغ کل' : 'TOTAL'}</td>
          <td style="text-align:${align};">${fmt(data.total)}</td>
        </tr>
      </table>

      <div class="thank-you">
        ${isRTL ? '🙏 از انتخاب بیمارستان ما سپاسگزاریم' : 'Thank you for choosing our hospital'}
      </div>

      <div class="footer">
        ${isRTL ? 'این فاکتور سند رسمی مالیاتی نیست.' : 'This invoice is not an official tax document.'}
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isRTL ? 'فاکتور' : 'Invoice'} #${data.invoiceNumber}</title>
  <style>${invoiceStyles}</style>
</head>
<body>
  ${body}
</body>
</html>`;

  openPrintWindow(html);
}
