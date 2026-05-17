const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ===== Departments (name is NOT unique → use findFirst + create) =====
  const departments = [
    { name: 'Cardiology', nameFa: 'قلبی و عروقی', description: 'Heart and vascular diseases', floor: 3, phone: '101' },
    { name: 'Neurology', nameFa: 'مغز و اعصاب', description: 'Brain and nervous system', floor: 3, phone: '102' },
    { name: 'Orthopedics', nameFa: 'استخوان و مفاصل', description: 'Bone and joint diseases', floor: 2, phone: '103' },
    { name: 'Pediatrics', nameFa: 'اطفال', description: 'Children health care', floor: 1, phone: '104' },
    { name: 'Gynecology', nameFa: 'زنان و زایمان', description: 'Women health care', floor: 1, phone: '105' },
    { name: 'ENT', nameFa: 'گوش، حلق و بینی', description: 'Ear, nose, throat', floor: 2, phone: '106' },
    { name: 'General Medicine', nameFa: 'طب عمومی', description: 'General medicine', floor: 1, phone: '108' },
    { name: 'Surgery', nameFa: 'جراحی', description: 'Surgical operations', floor: 3, phone: '109' },
  ];

  const deptMap = {};
  for (const dept of departments) {
    let existing = await prisma.department.findFirst({ where: { name: dept.name } });
    if (!existing) {
      existing = await prisma.department.create({ data: dept });
    }
    deptMap[dept.name] = existing.id;
  }
  console.log('Departments:', departments.length);

  // ===== Users (username IS unique → upsert OK) =====
  const users = [
    { username: 'admin', password: 'admin123', fullName: 'مدیر سیستم', role: 'admin', email: 'admin@hms.af', phone: '+93700000001' },
    { username: 'doctor', password: 'doctor123', fullName: 'دکتر احمد رحیمی', role: 'doctor', email: 'ahmad@hms.af', phone: '+93700000002' },
    { username: 'nurse', password: 'nurse123', fullName: 'پرستار فاطمه', role: 'nurse', email: 'fatima@hms.af', phone: '+93700000003' },
    { username: 'receptionist', password: 'reception123', fullName: 'مسعود محمودی', role: 'receptionist', email: 'masoud@hms.af', phone: '+93700000004' },
    { username: 'pharmacist', password: 'pharmacist123', fullName: 'داروساز سارا', role: 'pharmacist', email: 'sara@hms.af', phone: '+93700000005' },
    { username: 'labtech', password: 'labtech123', fullName: 'فنی آزمایشگاه یاسمن', role: 'labtech', email: 'yasmin@hms.af', phone: '+93700000006' },
    { username: 'accountant', password: 'accountant123', fullName: 'حسابدار کریم', role: 'accountant', email: 'karim@hms.af', phone: '+93700000007' },
  ];

  const userMap = {};
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, fullName: u.fullName, role: u.role, email: u.email, phone: u.phone, isActive: true },
      create: {
        username: u.username,
        passwordHash,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: true,
      },
    });
    userMap[u.username] = user.id;
  }
  console.log('Users:', users.length);

  // ===== Doctors (licenseNumber is NOT unique → findFirst + create) =====
  const doctorsData = [
    { firstName: 'احمد', lastName: 'رحیمی', specialty: 'Cardiology', department: 'Cardiology', licenseNumber: 'MED-001', fee: 500, phone: '+93710000001' },
    { firstName: 'محمد', lastName: 'نوری', specialty: 'Neurology', department: 'Neurology', licenseNumber: 'MED-002', fee: 600, phone: '+93710000002' },
    { firstName: 'زرما', lastName: 'هاتف', specialty: 'Pediatrics', department: 'Pediatrics', licenseNumber: 'MED-003', fee: 400, phone: '+93710000003' },
    { firstName: 'حمید', lastName: 'رضایی', specialty: 'Surgery', department: 'Surgery', licenseNumber: 'MED-004', fee: 800, phone: '+93710000004' },
    { firstName: 'لیلا', lastName: 'احمدی', specialty: 'Gynecology', department: 'Gynecology', licenseNumber: 'MED-005', fee: 550, phone: '+93710000005' },
  ];

  const doctorMap = {};
  for (let i = 0; i < doctorsData.length; i++) {
    const d = doctorsData[i];
    let existing = await prisma.doctor.findFirst({ where: { licenseNumber: d.licenseNumber } });
    if (!existing) {
      existing = await prisma.doctor.create({
        data: {
          firstName: d.firstName,
          lastName: d.lastName,
          specialty: d.specialty,
          licenseNumber: d.licenseNumber,
          phone: d.phone,
          visitFee: d.fee,
          departmentId: deptMap[d.department],
          isActive: true,
          // Link admin user to first doctor, doctor user to second doctor, etc.
          ...(i === 0 ? { userId: userMap['admin'] } : {}),
        },
      });
    }
    doctorMap[d.licenseNumber] = existing.id;
  }
  console.log('Doctors:', doctorsData.length);

  // ===== Patients (nationalId is NOT unique → findFirst + create) =====
  const patientsData = [
    { firstName: 'محمد', lastName: 'کریمی', nationalId: '1234567890', phone: '+93700001001', gender: 'male', bloodType: 'A+' },
    { firstName: 'فاطمه', lastName: 'احمدی', nationalId: '1234567891', phone: '+93700001002', gender: 'female', bloodType: 'B+' },
    { firstName: 'حسین', lastName: 'نوری', nationalId: '1234567892', phone: '+93700001003', gender: 'male', bloodType: 'O+' },
    { firstName: 'زینب', lastName: 'رحیمی', nationalId: '1234567893', phone: '+93700001004', gender: 'female', bloodType: 'AB+' },
    { firstName: 'علی', lastName: 'هاشمی', nationalId: '1234567894', phone: '+93700001005', gender: 'male', bloodType: 'A-' },
    { firstName: 'مریم', lastName: 'موسوی', nationalId: '1234567895', phone: '+93700001006', gender: 'female', bloodType: 'B-' },
    { firstName: 'رضا', lastName: 'صادقی', nationalId: '1234567896', phone: '+93700001007', gender: 'male', bloodType: 'O-' },
    { firstName: 'سارا', lastName: 'جعفری', nationalId: '1234567897', phone: '+93700001008', gender: 'female', bloodType: 'AB-' },
  ];

  for (let i = 0; i < patientsData.length; i++) {
    const p = patientsData[i];
    let existing = await prisma.patient.findFirst({ where: { nationalId: p.nationalId } });
    if (!existing) {
      existing = await prisma.patient.create({
        data: {
          fileNumber: 'P-' + String(1001 + i),
          firstName: p.firstName,
          lastName: p.lastName,
          nationalId: p.nationalId,
          phone: p.phone,
          gender: p.gender,
          bloodType: p.bloodType,
          status: 'outpatient',
          dateOfBirth: new Date(1990 + (i * 5), i % 12, (i * 3) + 1),
        },
      });
    }
  }
  console.log('Patients:', patientsData.length);

  // ===== Medicines (name is NOT unique → findFirst + create) =====
  const medicinesData = [
    { name: 'Paracetamol 500mg', nameFa: 'پاراسیتامول', category: 'Analgesic', dosageForm: 'tablet', strength: '500mg', stock: 5000, price: 10, minStock: 500 },
    { name: 'Amoxicillin 250mg', nameFa: 'آموکسی‌سیلین', category: 'Antibiotic', dosageForm: 'capsule', strength: '250mg', stock: 3000, price: 15, minStock: 300 },
    { name: 'Omeprazole 20mg', nameFa: 'امپرازول', category: 'Antacid', dosageForm: 'capsule', strength: '20mg', stock: 2000, price: 25, minStock: 200 },
    { name: 'Cetirizine 10mg', nameFa: 'ستیریزین', category: 'Antihistamine', dosageForm: 'tablet', strength: '10mg', stock: 4000, price: 12, minStock: 400 },
    { name: 'Metformin 500mg', nameFa: 'متفورمین', category: 'Antidiabetic', dosageForm: 'tablet', strength: '500mg', stock: 3500, price: 20, minStock: 350 },
    { name: 'Ibuprofen 400mg', nameFa: 'ایبوپروفن', category: 'Analgesic', dosageForm: 'tablet', strength: '400mg', stock: 2500, price: 18, minStock: 250 },
    { name: 'Amlodipine 5mg', nameFa: 'آملودیپین', category: 'Cardiovascular', dosageForm: 'tablet', strength: '5mg', stock: 4000, price: 30, minStock: 400 },
    { name: 'Ciprofloxacin 500mg', nameFa: 'سیپروفلوکساسین', category: 'Antibiotic', dosageForm: 'tablet', strength: '500mg', stock: 1800, price: 35, minStock: 180 },
  ];

  for (const m of medicinesData) {
    let existing = await prisma.medicine.findFirst({ where: { name: m.name } });
    if (!existing) {
      existing = await prisma.medicine.create({
        data: {
          name: m.name,
          nameFa: m.nameFa,
          category: m.category,
          dosageForm: m.dosageForm,
          strength: m.strength,
          stock: m.stock,
          price: m.price,
          minStock: m.minStock,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          batchNumber: 'BATCH-' + Date.now().toString(36).toUpperCase(),
        },
      });
    }
  }
  console.log('Medicines:', medicinesData.length);

  // ===== Appointments (spread across 7 days for weekly chart) =====
  const allPatients = await prisma.patient.findMany({ take: 5 });
  const allDoctors = await prisma.doctor.findMany({ take: 3 });
  if (allPatients.length > 0 && allDoctors.length > 0) {
    // Check existing count
    const existingAppts = await prisma.appointment.count();
    if (existingAppts === 0) {
      const statuses = ['confirmed', 'completed', 'completed', 'pending', 'confirmed', 'completed', 'no_show', 'confirmed', 'completed', 'pending', 'confirmed', 'completed', 'cancelled', 'confirmed', 'completed', 'pending', 'confirmed', 'completed', 'confirmed', 'completed', 'pending'];
      const dayCounts = [6, 8, 5, 11, 9, 7, 12]; // Mon-Sun
      const now = new Date();
      const today = now.getDay(); // 0=Sun, 1=Mon...
      let apptIdx = 0;

      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const dayIdx = (today - dayOffset + 7) % 7;
        const count = dayCounts[dayIdx === 0 ? 6 : dayIdx - 1]; // Map to Mon=0..Sun=6
        const apptDate = new Date(now);
        apptDate.setDate(apptDate.getDate() - dayOffset);
        apptDate.setHours(0, 0, 0, 0);

        for (let j = 0; j < count; j++) {
          await prisma.appointment.create({
            data: {
              patientId: allPatients[apptIdx % allPatients.length].id,
              doctorId: allDoctors[apptIdx % allDoctors.length].id,
              date: apptDate,
              time: String(8 + (j % 10)).padStart(2, '0') + ':' + String((j * 15) % 60).padStart(2, '0'),
              status: statuses[apptIdx % statuses.length],
              type: 'visit',
              notes: 'General checkup',
            },
          });
          apptIdx++;
        }
      }
      console.log('Appointments: 21 (across 7 days)');
    } else {
      console.log('Appointments: already exist (' + existingAppts + ')');
    }
  }

  // ===== Blood Bags (bagNumber IS unique → upsert OK) =====
  const bloodBags = [
    { bagNumber: 'BB-001', donorName: 'احمد شیرزاد', bloodType: 'A+', status: 'stored' },
    { bagNumber: 'BB-002', donorName: 'محمد حسینی', bloodType: 'B+', status: 'stored' },
    { bagNumber: 'BB-003', donorName: 'فاطمه نوری', bloodType: 'O+', status: 'tested' },
    { bagNumber: 'BB-004', donorName: 'علی رضایی', bloodType: 'AB+', status: 'stored' },
  ];
  for (const bb of bloodBags) {
    await prisma.bloodBag.upsert({
      where: { bagNumber: bb.bagNumber },
      update: {},
      create: {
        bagNumber: bb.bagNumber,
        donorName: bb.donorName,
        bloodType: bb.bloodType,
        rhFactor: bb.bloodType.includes('-') ? '-' : '+',
        status: bb.status,
        expiryDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
        hivTest: 'negative',
        hepatitisBTest: 'negative',
        hepatitisCTest: 'negative',
        malariaTest: 'negative',
        syphilisTest: 'negative',
      },
    });
  }
  console.log('Blood Bags:', bloodBags.length);

  // ===== Hospital Settings (key IS unique → upsert OK) =====
  const settings = [
    { key: 'hospital_name', value: 'بیمارستان مرکزی کابل' },
    { key: 'hospital_name_en', value: 'Kabul Central Hospital' },
    { key: 'currency', value: 'AFN' },
    { key: 'language', value: 'fa' },
  ];
  for (const s of settings) {
    await prisma.hospitalSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('Settings:', settings.length);

  // ===== Queue entries (sample data for dashboard) =====
  const existingQueues = await prisma.queue.count();
  if (existingQueues === 0) {
    const queueDepts = ['Cardiology', 'General Medicine', 'Pediatrics'];
    let queueNum = 1;
    for (const dept of queueDepts) {
      for (let i = 0; i < 4; i++) {
        await prisma.queue.create({
          data: {
            queueNumber: queueNum++,
            patientName: allPatients[i % allPatients.length]?.firstName + ' ' + allPatients[i % allPatients.length]?.lastName || 'بیمار ' + queueNum,
            patientId: allPatients[i % allPatients.length]?.id,
            priority: i === 0 ? 'urgent' : 'normal',
            department: dept,
            status: i === 0 ? 'called' : 'waiting',
            calledAt: i === 0 ? new Date() : null,
          },
        });
      }
    }
    console.log('Queue: 12 entries created');
  }

  console.log('\n✅ Seeding completed!');
  console.log('\nLogin credentials:');
  console.log('  admin       / admin123       (مدیر سیستم)');
  console.log('  doctor      / doctor123      (دکتر احمد رحیمی)');
  console.log('  nurse       / nurse123       (پرستار فاطمه)');
  console.log('  receptionist/ reception123   (مسعود محمودی)');
  console.log('  pharmacist  / pharmacist123  (داروساز سارا)');
  console.log('  labtech     / labtech123     (فنی آزمایشگاه یاسمن)');
  console.log('  accountant  / accountant123  (حسابدار کریم)');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
