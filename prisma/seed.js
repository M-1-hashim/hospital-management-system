const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ===== Departments =====
  // name is NOT @unique in schema, so we use findFirst + create pattern
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
    const existing = await prisma.department.findFirst({ where: { name: dept.name } });
    const record = existing || await prisma.department.create({ data: dept });
    deptMap[dept.name] = record.id;
  }
  console.log('Departments:', departments.length);

  // ===== Users =====
  // username IS @unique, so upsert works
  const users = [
    { username: 'admin', password: 'admin123', fullName: 'مدیر سیستم', role: 'admin', email: 'admin@hms.af', phone: '+93700000001' },
    { username: 'doctor', password: 'doctor123', fullName: 'دکتر احمد رحیمی', role: 'doctor', email: 'ahmad@hms.af', phone: '+93700000002' },
    { username: 'nurse', password: 'nurse123', fullName: 'پرستار فاطمه', role: 'nurse', email: 'fatima@hms.af', phone: '+93700000003' },
    { username: 'receptionist', password: 'reception123', fullName: 'مسعود محمودی', role: 'receptionist', email: 'masoud@hms.af', phone: '+93700000004' },
    { username: 'pharmacist', password: 'pharmacist123', fullName: 'داروساز سارا', role: 'pharmacist', email: 'sara@hms.af', phone: '+93700000005' },
    { username: 'labtech', password: 'labtech123', fullName: 'فنی آزمایشگاه یاسمن', role: 'labtech', email: 'yasmin@hms.af', phone: '+93700000006' },
    { username: 'accountant', password: 'accountant123', fullName: 'حسابدار کریم', role: 'accountant', email: 'karim@hms.af', phone: '+93700000007' },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
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
  }
  console.log('Users:', users.length);

  // ===== Doctors =====
  // licenseNumber is NOT @unique, use findFirst + create
  const doctorsData = [
    { firstName: 'احمد', lastName: 'رحیمی', specialty: 'Cardiology', department: 'Cardiology', licenseNumber: 'MED-001', fee: 500, phone: '+93710000001' },
    { firstName: 'محمد', lastName: 'نوری', specialty: 'Neurology', department: 'Neurology', licenseNumber: 'MED-002', fee: 600, phone: '+93710000002' },
    { firstName: 'زرما', lastName: 'هاتف', specialty: 'Pediatrics', department: 'Pediatrics', licenseNumber: 'MED-003', fee: 400, phone: '+93710000003' },
    { firstName: 'حمید', lastName: 'رضایی', specialty: 'Surgery', department: 'Surgery', licenseNumber: 'MED-004', fee: 800, phone: '+93710000004' },
    { firstName: 'لیلا', lastName: 'احمدی', specialty: 'Gynecology', department: 'Gynecology', licenseNumber: 'MED-005', fee: 550, phone: '+93710000005' },
  ];

  for (const d of doctorsData) {
    const existing = await prisma.doctor.findFirst({ where: { licenseNumber: d.licenseNumber } });
    if (!existing) {
      await prisma.doctor.create({
        data: {
          firstName: d.firstName,
          lastName: d.lastName,
          specialty: d.specialty,
          licenseNumber: d.licenseNumber,
          phone: d.phone,
          visitFee: d.fee,
          departmentId: deptMap[d.department],
          isActive: true,
        },
      });
    }
  }
  console.log('Doctors:', doctorsData.length);

  // ===== Patients =====
  // nationalId is NOT @unique, use findFirst + create
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
    const existing = await prisma.patient.findFirst({ where: { nationalId: p.nationalId } });
    if (!existing) {
      await prisma.patient.create({
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

  // ===== Medicines =====
  // id is auto-generated cuid, use findFirst + create by name
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
    const existing = await prisma.medicine.findFirst({ where: { name: m.name } });
    if (!existing) {
      await prisma.medicine.create({
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

  // ===== Appointments — spread across last 7 days for weekly chart =====
  const allPatients = await prisma.patient.findMany({ take: 8 });
  const allDoctors = await prisma.doctor.findMany({ take: 5 });
  if (allPatients.length > 0 && allDoctors.length > 0) {
    const appointmentsPerDay = [3, 2, 4, 3, 2, 3, 4]; // day-6 to today
    let totalCreated = 0;
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const count = appointmentsPerDay[6 - dayOffset];
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - dayOffset);
      dayDate.setHours(8, 0, 0, 0);

      for (let j = 0; j < count; j++) {
        const patientIdx = (dayOffset * count + j) % allPatients.length;
        const doctorIdx = (dayOffset + j) % allDoctors.length;
        const apptDate = new Date(dayDate);
        apptDate.setHours(8 + j, (j * 15) % 60);

        await prisma.appointment.create({
          data: {
            patientId: allPatients[patientIdx].id,
            doctorId: allDoctors[doctorIdx].id,
            date: apptDate,
            time: String(8 + j).padStart(2, '0') + ':' + String((j * 15) % 60).padStart(2, '0'),
            status: ['confirmed', 'completed', 'completed', 'pending'][j % 4],
            type: 'visit',
            notes: 'General checkup',
          },
        });
        totalCreated++;
      }
    }
    console.log('Appointments:', totalCreated, '(spread across 7 days)');
  }

  // ===== Blood Bags =====
  // bagNumber IS @unique, so upsert works
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

  // ===== Hospital Settings =====
  // key IS @unique, so upsert works
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

  console.log('\nSeeding completed!');
  console.log('\nLogin: admin / admin123');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
