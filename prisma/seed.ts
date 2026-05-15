import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Departments ---
  const departments = [
    { name: 'Cardiology', nameFa: 'قلبی و عروقی', description: 'Heart and vascular diseases', floor: 3, phone: '101' },
    { name: 'Neurology', nameFa: 'مغز و اعصاب', description: 'Brain and nervous system', floor: 3, phone: '102' },
    { name: 'Orthopedics', nameFa: 'استخوان و مفاصل', description: 'Bone and joint diseases', floor: 2, phone: '103' },
    { name: 'Pediatrics', nameFa: 'اطفال', description: 'Children health care', floor: 1, phone: '104' },
    { name: 'Gynecology', nameFa: 'زنان و زایمان', description: 'Women health care', floor: 1, phone: '105' },
    { name: 'ENT', nameFa: 'گوش، حلق و بینی', description: 'Ear, nose, throat', floor: 2, phone: '106' },
    { name: 'Ophthalmology', nameFa: 'چشم پزشکی', description: 'Eye care', floor: 2, phone: '107' },
    { name: 'General Medicine', nameFa: 'طب عمومی', description: 'General medicine', floor: 1, phone: '108' },
    { name: 'Surgery', nameFa: 'جراحی', description: 'Surgical operations', floor: 3, phone: '109' },
  ];

  const deptMap: Record<string, string> = {};
  for (const dept of departments) {
    const created = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
    deptMap[dept.name] = created.id;
  }
  console.log(`✅ Departments: ${departments.length}`);

  // --- Users ---
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
  console.log(`✅ Users: ${users.length}`);

  // --- Doctors ---
  const doctorUser = await prisma.user.findUnique({ where: { username: 'doctor' } });
  const doctorsData = [
    { firstName: 'احمد', lastName: 'رحیمی', firstNameEn: 'Ahmad', lastNameEn: 'Rahimi', specialty: 'Cardiology', department: 'Cardiology', licenseNumber: 'MED-2024-001', fee: 500, userId: doctorUser?.id, phone: '+93710000001' },
    { firstName: 'محمد', lastName: 'نوری', firstNameEn: 'Mohammad', lastNameEn: 'Noori', specialty: 'Neurology', department: 'Neurology', licenseNumber: 'MED-2024-002', fee: 600, phone: '+93710000002' },
    { firstName: 'زرما', lastName: 'هاتف', firstNameEn: 'Zarma', lastNameEn: 'Hatif', specialty: 'Pediatrics', department: 'Pediatrics', licenseNumber: 'MED-2024-003', fee: 400, phone: '+93710000003' },
    { firstName: 'حمید', lastName: 'رضایی', firstNameEn: 'Hamid', lastNameEn: 'Rezaei', specialty: 'Surgery', department: 'Surgery', licenseNumber: 'MED-2024-004', fee: 800, phone: '+93710000004' },
    { firstName: 'لیلا', lastName: 'احمدی', firstNameEn: 'Leila', lastNameEn: 'Ahmadi', specialty: 'Gynecology', department: 'Gynecology', licenseNumber: 'MED-2024-005', fee: 550, phone: '+93710000005' },
  ];

  for (const d of doctorsData) {
    await prisma.doctor.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: {},
      create: {
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
  console.log(`✅ Doctors: ${doctorsData.length}`);

  // --- Beds (linked to departments) ---
  const bedsPerDept: Record<string, { count: number; type: string }> = {
    'Cardiology': { count: 10, type: 'standard' },
    'Neurology': { count: 10, type: 'standard' },
    'Pediatrics': { count: 15, type: 'pediatric' },
    'Gynecology': { count: 10, type: 'standard' },
    'Surgery': { count: 12, type: 'standard' },
    'General Medicine': { count: 20, type: 'standard' },
  };

  let totalBeds = 0;
  for (const [deptName, config] of Object.entries(bedsPerDept)) {
    for (let i = 1; i <= config.count; i++) {
      await prisma.bed.create({
        data: {
          number: `${deptName.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
          departmentId: deptMap[deptName],
          roomNumber: `R${String(Math.ceil(i / 4)).padStart(2, '0')}`,
          type: config.type,
          status: i <= 3 ? 'occupied' : 'available',
          dailyRate: config.type === 'pediatric' ? 1500 : 1000,
        },
      });
      totalBeds++;
    }
  }
  console.log(`✅ Beds: ${totalBeds}`);

  // --- Patients ---
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
    await prisma.patient.upsert({
      where: { nationalId: p.nationalId },
      update: {},
      create: {
        fileNumber: `P-${String(1001 + i)}`,
        firstName: p.firstName,
        lastName: p.lastName,
        nationalId: p.nationalId,
        phone: p.phone,
        gender: p.gender,
        bloodType: p.bloodType,
        status: i < 6 ? 'outpatient' : 'inpatient',
        dateOfBirth: new Date(1990 + (i * 5), i % 12, (i * 3) + 1),
      },
    });
  }
  console.log(`✅ Patients: ${patientsData.length}`);

  // --- Medicines ---
  const medicinesData = [
    { name: 'Paracetamol 500mg', nameFa: 'پاراسیتامول ۵۰۰mg', category: 'Analgesic', dosageForm: 'tablet', strength: '500mg', stock: 5000, price: 10, minStock: 500 },
    { name: 'Amoxicillin 250mg', nameFa: 'آموکسی‌سیلین ۲۵۰mg', category: 'Antibiotic', dosageForm: 'capsule', strength: '250mg', stock: 3000, price: 15, minStock: 300 },
    { name: 'Omeprazole 20mg', nameFa: 'امپرازول ۲۰mg', category: 'Antacid', dosageForm: 'capsule', strength: '20mg', stock: 2000, price: 25, minStock: 200 },
    { name: 'Cetirizine 10mg', nameFa: 'ستیریزین ۱۰mg', category: 'Antihistamine', dosageForm: 'tablet', strength: '10mg', stock: 4000, price: 12, minStock: 400 },
    { name: 'Metformin 500mg', nameFa: 'متفورمین ۵۰۰mg', category: 'Antidiabetic', dosageForm: 'tablet', strength: '500mg', stock: 3500, price: 20, minStock: 350 },
    { name: 'Ibuprofen 400mg', nameFa: 'ایبوپروفن ۴۰۰mg', category: 'Analgesic', dosageForm: 'tablet', strength: '400mg', stock: 2500, price: 18, minStock: 250 },
    { name: 'Azithromycin 500mg', nameFa: 'آزیترومایسین ۵۰۰mg', category: 'Antibiotic', dosageForm: 'tablet', strength: '500mg', stock: 1500, price: 45, minStock: 150 },
    { name: 'Amlodipine 5mg', nameFa: 'آملودیپین ۵mg', category: 'Cardiovascular', dosageForm: 'tablet', strength: '5mg', stock: 4000, price: 30, minStock: 400 },
    { name: 'Ciprofloxacin 500mg', nameFa: 'سیپروفلوکساسین ۵۰۰mg', category: 'Antibiotic', dosageForm: 'tablet', strength: '500mg', stock: 1800, price: 35, minStock: 180 },
    { name: 'Diclofenac Gel', nameFa: 'دیکلوفناک ژل', category: 'Topical', dosageForm: 'gel', strength: '1%', stock: 800, price: 65, minStock: 100 },
  ];

  for (const m of medicinesData) {
    await prisma.medicine.upsert({
      where: { id: m.name.toLowerCase().replace(/[^a-z0-9]/g, '-') },
      update: {},
      create: {
        name: m.name,
        nameFa: m.nameFa,
        category: m.category,
        dosageForm: m.dosageForm,
        strength: m.strength,
        stock: m.stock,
        price: m.price,
        minStock: m.minStock,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        batchNumber: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }
  console.log(`✅ Medicines: ${medicinesData.length}`);

  // --- Appointments ---
  const allPatients = await prisma.patient.findMany({ take: 5 });
  const allDoctors = await prisma.doctor.findMany({ take: 3 });

  if (allPatients.length > 0 && allDoctors.length > 0) {
    const statuses: string[] = ['confirmed', 'completed', 'completed', 'pending', 'confirmed'];
    const types: string[] = ['visit', 'followup', 'visit', 'emergency', 'visit'];
    for (let i = 0; i < Math.min(allPatients.length, 5); i++) {
      const doc = allDoctors[i % allDoctors.length];
      await prisma.appointment.create({
        data: {
          patientId: allPatients[i].id,
          doctorId: doc.id,
          date: new Date(),
          time: `${String(9 + i).padStart(2, '0')}:00`,
          status: statuses[i],
          type: types[i],
          notes: 'General checkup',
        },
      });
    }
    console.log('✅ Appointments: 5');
  }

  // --- Blood Bags ---
  const bloodBags = [
    { bagNumber: 'BB-2024-001', donorName: 'احمد شیرزاد', bloodType: 'A+', status: 'stored' },
    { bagNumber: 'BB-2024-002', donorName: 'محمد حسینی', bloodType: 'B+', status: 'stored' },
    { bagNumber: 'BB-2024-003', donorName: 'فاطمه نوری', bloodType: 'O+', status: 'tested' },
    { bagNumber: 'BB-2024-004', donorName: 'علی رضایی', bloodType: 'AB+', status: 'stored' },
    { bagNumber: 'BB-2024-005', donorName: 'زینب کریمی', bloodType: 'A-', status: 'collected' },
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
  console.log(`✅ Blood Bags: ${bloodBags.length}`);

  // --- Hospital Settings ---
  const settings = [
    { key: 'hospital_name', value: 'بیمارستان مرکزی کابل' },
    { key: 'hospital_name_en', value: 'Kabul Central Hospital' },
    { key: 'hospital_phone', value: '+93201234567' },
    { key: 'hospital_address', value: 'کابل، افغانستان' },
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
  console.log(`✅ Hospital Settings: ${settings.length}`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n--- Login Credentials ---');
  console.log('Admin:        admin / admin123');
  console.log('Doctor:       doctor / doctor123');
  console.log('Nurse:        nurse / nurse123');
  console.log('Receptionist: receptionist / reception123');
  console.log('Pharmacist:   pharmacist / pharmacist123');
  console.log('Lab Tech:     labtech / labtech123');
  console.log('Accountant:   accountant / accountant123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
