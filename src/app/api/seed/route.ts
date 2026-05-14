import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/seed - Seed database with sample data
export async function POST() {
  try {
    // Clear existing data (safe order due to foreign keys — children first)
    const tables = [
      'payment', 'attendance', 'shiftSchedule', 'medicalDocument',
      'vitalRecord', 'visitRecord', 'queue',
      'prescriptionItem', 'prescription',
      'invoiceItem', 'invoice',
      'labTest', 'bloodBag',
      'appointment', 'admission', 'bed',
      'expense', 'service', 'insurance',
      'notification', 'auditLog', 'activityLog',
      'backupRecord', 'hospitalSetting',
      'staff', 'doctor', 'patient', 'user', 'department',
    ];
    for (const table of tables) {
      try {
        await (db as any)[table].deleteMany();
      } catch (e) {
        // ignore FK errors — table may already be empty or order issue
      }
    }
    // Second pass to catch any remaining due to FK cycles
    for (const table of tables) {
      try {
        await (db as any)[table].deleteMany();
      } catch (e) {
        // ignore
      }
    }

    // ===== 1. Create Departments =====
    const departments = await Promise.all([
      db.department.create({ data: { name: 'Emergency', nameFa: 'اورژانس', floor: 1, phone: '101', description: 'Emergency department for acute cases' } }),
      db.department.create({ data: { name: 'ICU', nameFa: 'بخش مراقبت ویژه', floor: 2, phone: '102', description: 'Intensive Care Unit' } }),
      db.department.create({ data: { name: 'Surgery', nameFa: 'جراحی', floor: 3, phone: '103', description: 'General and specialized surgery' } }),
      db.department.create({ data: { name: 'Internal Medicine', nameFa: 'داخلی', floor: 2, phone: '104', description: 'Internal medicine department' } }),
      db.department.create({ data: { name: 'Pediatrics', nameFa: 'اطفال', floor: 4, phone: '105', description: 'Pediatric care department' } }),
      db.department.create({ data: { name: 'OB/GYN', nameFa: 'زنان و زایمان', floor: 5, phone: '106', description: 'Obstetrics and Gynecology' } }),
      db.department.create({ data: { name: 'Cardiology', nameFa: 'قلب و عروق', floor: 3, phone: '107', description: 'Cardiology department' } }),
      db.department.create({ data: { name: 'Orthopedics', nameFa: 'ارتوپدی', floor: 3, phone: '108', description: 'Orthopedics and trauma' } }),
    ]);

    // ===== 2. Create Users =====
    const adminHash = await bcrypt.hash('admin123', 10);
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const nurseHash = await bcrypt.hash('nurse123', 10);
    const receptionHash = await bcrypt.hash('reception123', 10);
    const accountHash = await bcrypt.hash('account123', 10);

    const users = await Promise.all([
      db.user.create({ data: { username: 'admin', passwordHash: adminHash, fullName: 'System Administrator', email: 'admin@hospital.com', phone: '09120000001', role: 'admin' } }),
      db.user.create({ data: { username: 'doctor', passwordHash: doctorHash, fullName: 'Dr. Ahmad Mohammadi', email: 'dr.mohammadi@hospital.com', phone: '09120000002', role: 'doctor' } }),
      db.user.create({ data: { username: 'nurse', passwordHash: nurseHash, fullName: 'Fateme Hosseini', email: 'nurse.hosseini@hospital.com', phone: '09120000003', role: 'nurse' } }),
      db.user.create({ data: { username: 'receptionist', passwordHash: receptionHash, fullName: 'Sara Rezaei', email: 'reception@hospital.com', phone: '09120000004', role: 'receptionist' } }),
      db.user.create({ data: { username: 'accountant', passwordHash: accountHash, fullName: 'Mehdi Karimi', email: 'finance@hospital.com', phone: '09120000005', role: 'accountant' } }),
    ]);

    // ===== 3. Create Doctors =====
    const doctors = await Promise.all([
      db.doctor.create({ data: { userId: users[1].id, firstName: 'Ahmad', lastName: 'Mohammadi', specialty: 'Internal Medicine', licenseNumber: 'DR-1001', phone: '09121000001', email: 'dr.mohammadi@hospital.com', departmentId: departments[3].id, visitFee: 350000, rating: 4.8, bio: 'Board certified internist with 15 years of experience' } }),
      db.doctor.create({ data: { firstName: 'Maryam', lastName: 'Ahmadi', specialty: 'Cardiology', licenseNumber: 'DR-1002', phone: '09121000002', email: 'dr.ahmadi@hospital.com', departmentId: departments[6].id, visitFee: 500000, rating: 4.9, bio: 'Cardiologist specializing in interventional cardiology' } }),
      db.doctor.create({ data: { firstName: 'Ali', lastName: 'Hosseini', specialty: 'Orthopedics', licenseNumber: 'DR-1003', phone: '09121000003', email: 'dr.hosseini@hospital.com', departmentId: departments[7].id, visitFee: 450000, rating: 4.6, bio: 'Orthopedic surgeon specializing in sports medicine' } }),
      db.doctor.create({ data: { firstName: 'Zahra', lastName: 'Rezaei', specialty: 'Pediatrics', licenseNumber: 'DR-1004', phone: '09121000004', email: 'dr.rezaei@hospital.com', departmentId: departments[4].id, visitFee: 300000, rating: 4.7, bio: 'Pediatrician with expertise in neonatal care' } }),
      db.doctor.create({ data: { firstName: 'Hassan', lastName: 'Karimi', specialty: 'General Surgery', licenseNumber: 'DR-1005', phone: '09121000005', email: 'dr.karimi@hospital.com', departmentId: departments[2].id, visitFee: 600000, rating: 4.5, bio: 'General surgeon with 20 years of experience' } }),
      db.doctor.create({ data: { firstName: 'Nasrin', lastName: 'Moradi', specialty: 'OB/GYN', licenseNumber: 'DR-1006', phone: '09121000006', email: 'dr.moradi@hospital.com', departmentId: departments[5].id, visitFee: 400000, rating: 4.8, bio: 'Obstetrician and gynecologist' } }),
    ]);

    // ===== 4. Create 20 Patients =====
    const firstNames = ['Reza', 'Mohammad', 'Ali', 'Hossein', 'Amir', 'Saeed', 'Mehdi', 'Hamid', 'Javad', 'Kamran', 'Leila', 'Parisa', 'Nasim', 'Shirin', 'Minoo', 'Roya', 'Neda', 'Azam', 'Mina', 'Fatemeh'];
    const lastNames = ['Alavi', 'Hashemi', 'Sadeghi', 'Rafiei', 'Norouzi', 'Bahrami', 'Jafari', 'Ghasemi', 'Mousavi', 'Ebrahimi', 'Kazemi', 'Hedayati', 'Farsi', 'Talebi', 'Shafiei', 'Salari', 'Fallah', 'Rashidi', 'Yousefi', 'Naderi'];

    const patients = await Promise.all(
      firstNames.map((firstName, i) => {
        const dob = new Date(1960 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        return db.patient.create({
          data: {
            fileNumber: `P-${String(i + 1).padStart(5, '0')}`,
            firstName,
            lastName: lastNames[i],
            nationalId: `00${String(1000000 + i).padStart(8, '0')}`,
            dateOfBirth: dob,
            gender: i < 12 ? 'male' : 'female',
            bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-'][Math.floor(Math.random() * 7)],
            phone: `0913${String(1000000 + i * 10000).padStart(7, '0')}`,
            emergencyPhone: `0912${String(2000000 + i * 10000).padStart(7, '0')}`,
            email: `${firstName.toLowerCase()}.${lastNames[i].toLowerCase()}@email.com`,
            address: `Tehran, District ${i + 1}, Street ${(i * 3) + 5}`,
            insuranceCompany: i % 3 === 0 ? 'Iran Insurance' : i % 3 === 1 ? 'Social Security' : 'Armed Forces',
            status: i < 15 ? 'outpatient' : i < 18 ? 'inpatient' : 'emergency',
            allergies: i % 5 === 0 ? JSON.stringify(['Penicillin']) : null,
          },
        });
      })
    );

    // ===== 5. Create 15 Appointments =====
    const now = new Date();
    const appointmentStatuses = ['pending', 'confirmed', 'completed', 'completed', 'confirmed', 'pending', 'completed', 'pending', 'confirmed', 'completed', 'completed', 'pending', 'confirmed', 'completed', 'pending'];
    const appointmentTypes = ['visit', 'visit', 'followup', 'visit', 'emergency', 'visit', 'visit', 'followup', 'visit', 'visit', 'followup', 'visit', 'visit', 'emergency', 'visit'];

    const appointments = await Promise.all(
      Array.from({ length: 15 }, (_, i) => {
        const dayOffset = i < 5 ? 0 : i < 10 ? i - 4 : i - 9;
        const appointmentDate = new Date(now);
        appointmentDate.setDate(appointmentDate.getDate() + dayOffset);
        const hour = 8 + Math.floor(i * 0.8);
        return db.appointment.create({
          data: {
            patientId: patients[i % 20].id,
            doctorId: doctors[i % 6].id,
            date: appointmentDate,
            time: `${String(hour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
            duration: 30,
            type: appointmentTypes[i],
            status: dayOffset === 0 ? 'confirmed' : dayOffset < 0 ? 'completed' : appointmentStatuses[i],
            notes: i % 3 === 0 ? 'Regular checkup' : i % 3 === 1 ? 'Follow-up visit' : '',
            userId: users[3].id,
          },
        });
      })
    );

    // ===== 6. Create 10 Medicines =====
    const medicinesData = [
      { name: 'Amoxicillin', nameFa: 'آموکسی‌سیلین', category: 'Antibiotic', dosageForm: 'Capsule', strength: '500mg', price: 15000, stock: 500 },
      { name: 'Ibuprofen', nameFa: 'ایبوپروفن', category: 'NSAID', dosageForm: 'Tablet', strength: '400mg', price: 8000, stock: 300 },
      { name: 'Metformin', nameFa: 'متفورمین', category: 'Antidiabetic', dosageForm: 'Tablet', strength: '500mg', price: 20000, stock: 200 },
      { name: 'Omeprazole', nameFa: 'امپرازول', category: 'PPI', dosageForm: 'Capsule', strength: '20mg', price: 25000, stock: 150 },
      { name: 'Lisinopril', nameFa: 'لیزینوپریل', category: 'ACE Inhibitor', dosageForm: 'Tablet', strength: '10mg', price: 35000, stock: 100 },
      { name: 'Atorvastatin', nameFa: 'آتورواستاتین', category: 'Statin', dosageForm: 'Tablet', strength: '20mg', price: 45000, stock: 5 },
      { name: 'Cetirizine', nameFa: 'ستریزین', category: 'Antihistamine', dosageForm: 'Tablet', strength: '10mg', price: 12000, stock: 250 },
      { name: 'Paracetamol', nameFa: 'استامینوفن', category: 'Analgesic', dosageForm: 'Tablet', strength: '500mg', price: 5000, stock: 1000 },
      { name: 'Azithromycin', nameFa: 'آزیترومایسین', category: 'Antibiotic', dosageForm: 'Tablet', strength: '250mg', price: 30000, stock: 8 },
      { name: 'Prednisolone', nameFa: 'پردنیزولون', category: 'Corticosteroid', dosageForm: 'Tablet', strength: '5mg', price: 18000, stock: 180 },
    ];

    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    const medicines = await Promise.all(
      medicinesData.map((med) =>
        db.medicine.create({
          data: {
            ...med,
            manufacturer: ['Darou Pakhsh', 'Tehran Chemie', 'Razi', 'Abidi', 'Sobhan'][Math.floor(Math.random() * 5)],
            minStock: 10,
            expiryDate,
            batchNumber: `BN-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          },
        })
      )
    );

    // ===== 7. Create 5 Beds =====
    const beds = await Promise.all([
      db.bed.create({ data: { number: 'B-101', departmentId: departments[0].id, roomNumber: '101', type: 'standard', status: 'available', dailyRate: 500000 } }),
      db.bed.create({ data: { number: 'B-201', departmentId: departments[1].id, roomNumber: '201', type: 'icu', status: 'occupied', dailyRate: 2000000 } }),
      db.bed.create({ data: { number: 'B-301', departmentId: departments[2].id, roomNumber: '301', type: 'standard', status: 'available', dailyRate: 600000 } }),
      db.bed.create({ data: { number: 'B-401', departmentId: departments[3].id, roomNumber: '401', type: 'standard', status: 'occupied', dailyRate: 500000 } }),
      db.bed.create({ data: { number: 'B-501', departmentId: departments[6].id, roomNumber: 'VIP-501', type: 'vip', status: 'available', dailyRate: 1500000 } }),
    ]);

    // ===== 8. Create 2 Active Admissions =====
    await db.admission.create({ data: { patientId: patients[15].id, bedId: beds[1].id, doctorId: doctors[1].id, diagnosis: 'Acute myocardial infarction', admitDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), status: 'active' } });
    await db.admission.create({ data: { patientId: patients[16].id, bedId: beds[3].id, doctorId: doctors[0].id, diagnosis: 'Pneumonia', admitDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), status: 'active' } });

    // ===== 9. Create 3 Invoices =====
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - 1);

    const invoices = await Promise.all([
      db.invoice.create({
        data: {
          invoiceNumber: 'INV-202501-0001', patientId: patients[0].id, appointmentId: appointments[0].id,
          subtotal: 350000, discount: 0, tax: 0, total: 350000, paymentMethod: 'cash', paymentStatus: 'paid', paidAmount: 350000, notes: 'Regular visit fee',
          items: { create: [{ description: 'Doctor visit - Internal Medicine', type: 'doctor', quantity: 1, unitPrice: 350000, total: 350000 }] },
        },
      }),
      db.invoice.create({
        data: {
          invoiceNumber: 'INV-202501-0002', patientId: patients[1].id,
          subtotal: 850000, discount: 50000, tax: 0, total: 800000, paymentMethod: 'insurance', paymentStatus: 'partial', paidAmount: 400000, dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), notes: 'Lab tests and visit',
          items: { create: [
            { description: 'Doctor visit - Cardiology', type: 'doctor', quantity: 1, unitPrice: 500000, total: 500000 },
            { description: 'CBC Blood Test', type: 'lab', quantity: 1, unitPrice: 150000, total: 150000 },
            { description: 'ECG Test', type: 'lab', quantity: 1, unitPrice: 200000, total: 200000 },
          ] },
        },
      }),
      db.invoice.create({
        data: {
          invoiceNumber: 'INV-202501-0003', patientId: patients[2].id,
          subtotal: 600000, discount: 0, tax: 0, total: 600000, paymentMethod: 'cash', paymentStatus: 'unpaid', paidAmount: 0, dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), notes: 'Surgery consultation',
          items: { create: [{ description: 'Doctor visit - Surgery', type: 'doctor', quantity: 1, unitPrice: 600000, total: 600000 }] },
        },
      }),
    ]);

    // ===== 10. Create 3 Lab Tests =====
    await db.labTest.create({
      data: {
        patientId: patients[3].id, doctorId: doctors[0].id, testName: 'Complete Blood Count (CBC)', category: 'blood', status: 'completed', cost: 150000,
        testDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        results: JSON.stringify([
          { name: 'WBC', value: '7.5', unit: '10^3/μL', normalMin: '4.5', normalMax: '11.0', status: 'normal' },
          { name: 'RBC', value: '4.8', unit: '10^6/μL', normalMin: '4.0', normalMax: '5.5', status: 'normal' },
          { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', normalMin: '12.5', normalMax: '17.5', status: 'normal' },
          { name: 'Platelets', value: '250', unit: '10^3/μL', normalMin: '150', normalMax: '400', status: 'normal' },
        ]),
      },
    });
    await db.labTest.create({
      data: {
        patientId: patients[4].id, doctorId: doctors[1].id, testName: 'Lipid Panel', category: 'blood', status: 'completed', cost: 200000,
        testDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        results: JSON.stringify([
          { name: 'Total Cholesterol', value: '240', unit: 'mg/dL', normalMin: '0', normalMax: '200', status: 'high' },
          { name: 'LDL', value: '160', unit: 'mg/dL', normalMin: '0', normalMax: '100', status: 'high' },
          { name: 'HDL', value: '45', unit: 'mg/dL', normalMin: '40', normalMax: '60', status: 'normal' },
          { name: 'Triglycerides', value: '180', unit: 'mg/dL', normalMin: '0', normalMax: '150', status: 'high' },
        ]),
      },
    });
    await db.labTest.create({
      data: { patientId: patients[5].id, doctorId: doctors[2].id, testName: 'X-Ray - Chest', category: 'imaging', status: 'pending', cost: 350000, testDate: new Date() },
    });

    // ===== 11. Create Hospital Settings =====
    const settingsData = [
      { key: 'hospital_name', value: 'General Hospital' },
      { key: 'hospital_name_fa', value: 'بیمارستان عمومی' },
      { key: 'hospital_phone', value: '021-12345678' },
      { key: 'hospital_address', value: 'Tehran, Vali-Asr Street' },
      { key: 'currency', value: 'IRR' },
      { key: 'appointment_slot_duration', value: '30' },
      { key: 'working_hours_start', value: '08:00' },
      { key: 'working_hours_end', value: '17:00' },
    ];
    await Promise.all(settingsData.map((s) => db.hospitalSetting.create({ data: s })));

    // ===== 12. Create Staff =====
    const staffMembers = await Promise.all([
      db.staff.create({ data: { userId: users[2].id, firstName: 'Fateme', lastName: 'Hosseini', role: 'nurse', departmentId: departments[0].id, phone: '09120000003', shift: 'morning', salary: 25000000, hireDate: new Date('2020-03-15') } }),
      db.staff.create({ data: { firstName: 'Akbar', lastName: 'Sadeghi', role: 'nurse', departmentId: departments[1].id, phone: '09130000001', shift: 'night', salary: 28000000, hireDate: new Date('2019-06-01') } }),
      db.staff.create({ data: { firstName: 'Gholam', lastName: 'Nouri', role: 'guard', departmentId: departments[0].id, phone: '09130000002', shift: 'evening', salary: 18000000, hireDate: new Date('2021-01-10') } }),
    ]);

    // ===== 13. Create Blood Bags =====
    await Promise.all([
      db.bloodBag.create({ data: { bagNumber: 'BB-20260510-0001', donorName: 'Mohammad Rahimi', donorPhone: '+93 770 123 456', donorNationalId: '12345', bloodType: 'O+', volume: 450, collectionDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), expiryDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000), status: 'stored', hivTest: 'negative', hepatitisBTest: 'negative', hepatitisCTest: 'negative', malariaTest: 'negative', syphilisTest: 'negative', testedBy: 'Dr. Lab Tech', collectedBy: 'Nurse Fateme' } }),
      db.bloodBag.create({ data: { bagNumber: 'BB-20260511-0002', donorName: 'Ahmad Shah', donorPhone: '+93 771 234 567', bloodType: 'A+', volume: 450, collectionDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), expiryDate: new Date(now.getTime() + 41 * 24 * 60 * 60 * 1000), status: 'tested', hivTest: 'negative', hepatitisBTest: 'negative', hepatitisCTest: 'pending', malariaTest: 'pending', syphilisTest: 'pending', testedBy: 'Dr. Lab Tech', collectedBy: 'Nurse Akbar' } }),
      db.bloodBag.create({ data: { bagNumber: 'BB-20260512-0003', donorName: 'Fatima Noori', donorPhone: '+93 772 345 678', bloodType: 'B+', volume: 500, collectionDate: new Date(), expiryDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000), status: 'collected', collectedBy: 'Nurse Fateme', notes: 'Regular donor, 5th donation' } }),
      db.bloodBag.create({ data: { bagNumber: 'BB-20260508-0004', donorName: 'Hassan Karimi', donorPhone: '+93 773 456 789', bloodType: 'AB+', volume: 450, collectionDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), expiryDate: new Date(now.getTime() + 38 * 24 * 60 * 60 * 1000), status: 'used', issuedTo: 'Leila Kazemi', hivTest: 'negative', hepatitisBTest: 'negative', hepatitisCTest: 'negative', malariaTest: 'negative', syphilisTest: 'negative', testedBy: 'Dr. Lab Tech', collectedBy: 'Nurse Fateme' } }),
      db.bloodBag.create({ data: { bagNumber: 'BB-20260505-0005', donorName: 'Zarif Ahmadi', donorPhone: '+93 774 567 890', bloodType: 'O-', volume: 450, collectionDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), expiryDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000), status: 'stored', hivTest: 'negative', hepatitisBTest: 'negative', hepatitisCTest: 'negative', malariaTest: 'negative', syphilisTest: 'negative', testedBy: 'Dr. Lab Tech', collectedBy: 'Nurse Akbar' } }),
    ]);

    // ===== 14. Create Sample Queue Entries =====
    const queueStatuses = ['waiting', 'called', 'completed', 'waiting', 'waiting', 'completed', 'waiting', 'called'];
    const deptNames = ['Emergency', 'Internal Medicine', 'Cardiology', 'Pediatrics', 'Surgery', 'Emergency', 'Internal Medicine', 'OB/GYN'];
    const queueEntries = await Promise.all(
      queueStatuses.map((status, i) => {
        const createdAt = new Date(now);
        createdAt.setHours(createdAt.getHours() - (i * 0.5));
        const entry: any = {
          queueNumber: i + 1,
          patientId: patients[i % 20].id,
          patientName: `${patients[i % 20].firstName} ${patients[i % 20].lastName}`,
          priority: i === 2 || i === 7 ? 'urgent' : i === 0 ? 'emergency' : 'normal',
          department: deptNames[i],
          status,
          createdAt,
        };
        if (status === 'called') {
          entry.calledAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
        }
        if (status === 'completed') {
          entry.calledAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
          entry.completedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
        }
        return db.queue.create({ data: entry });
      })
    );

    // ===== 15. Create Sample Visit Records =====
    const visitData = [
      { chiefComplaint: 'Fever and cough for 3 days', symptoms: 'Fever (38.5°C), productive cough, fatigue, loss of appetite', examination: 'Auscultation: bilateral rhonchi, mild wheezing', diagnosis: 'Acute upper respiratory infection', treatmentPlan: 'Rest, hydration, Amoxicillin 500mg TID x 7 days, Paracetamol 500mg PRN for fever' },
      { chiefComplaint: 'Chest pain on exertion', symptoms: 'Chest tightness, shortness of breath, sweating', examination: 'BP 150/95, HR 88, ECG shows ST elevation in leads V1-V4', diagnosis: 'Unstable angina', treatmentPlan: 'Admit to CCU, Nitroglycerin drip, Aspirin, Heparin, urgent cardiology consult' },
      { chiefComplaint: 'Follow-up for diabetes', symptoms: 'Well-controlled, occasional polyuria', examination: 'HbA1c 7.2%, fasting glucose 140 mg/dL', diagnosis: 'Type 2 Diabetes Mellitus - well controlled', treatmentPlan: 'Continue Metformin 500mg BID, dietary modification, follow-up in 3 months' },
      { chiefComplaint: 'Knee pain after sports injury', symptoms: 'Right knee swelling, pain on movement, limping', examination: 'Tenderness over medial collateral ligament, positive McMurray test', diagnosis: 'Medial meniscus tear', treatmentPlan: 'NSAIDs, knee brace, physiotherapy referral, MRI if no improvement in 2 weeks' },
      { chiefComplaint: 'Abdominal pain', symptoms: 'Epigastric pain, nausea, bloating after meals', examination: 'Mild epigastric tenderness, no guarding or rebound', diagnosis: 'Peptic ulcer disease', treatmentPlan: 'Omeprazole 20mg daily for 4 weeks, avoid NSAIDs, dietary modifications' },
    ];

    const visitRecords = await Promise.all(
      visitData.map((v, i) =>
        db.visitRecord.create({
          data: {
            patientId: patients[i + 3].id,
            doctorId: doctors[i % 6].id,
            visitDate: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            ...v,
            followUpDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          },
        })
      )
    );

    // ===== 16. Create Sample Audit Logs =====
    const auditActions = [
      { action: 'login', entity: 'system', details: 'User logged in successfully', userId: users[0].id },
      { action: 'login', entity: 'system', details: 'User logged in successfully', userId: users[1].id },
      { action: 'create', entity: 'patient', entityId: patients[0].id, details: 'Registered new patient: Reza Alavi', userId: users[3].id },
      { action: 'create', entity: 'appointment', entityId: appointments[0].id, details: 'Booked appointment for Reza Alavi with Dr. Mohammadi', userId: users[3].id },
      { action: 'update', entity: 'patient', entityId: patients[1].id, details: 'Updated patient information for Mohammad Hashemi', userId: users[0].id },
      { action: 'create', entity: 'invoice', entityId: invoices[0].id, details: 'Created invoice INV-202501-0001', userId: users[4].id },
      { action: 'view', entity: 'patient', entityId: patients[5].id, details: 'Viewed patient record for Hossein Norouzi', userId: users[1].id },
      { action: 'create', entity: 'lab_tests', entityId: null, details: 'Requested CBC blood test', userId: users[1].id },
      { action: 'update', entity: 'medicines', entityId: medicines[5].id, details: 'Updated Atorvastatin stock: 5 units remaining (low stock)', userId: users[2].id },
      { action: 'logout', entity: 'system', details: 'User logged out', userId: users[0].id },
      { action: 'delete', entity: 'appointment', details: 'Cancelled appointment for Ali Sadeghi', userId: users[3].id },
      { action: 'create', entity: 'admission', details: 'Admitted Roya Salari to ICU bed B-201', userId: users[0].id },
      { action: 'update', entity: 'settings', details: 'Updated hospital information', userId: users[0].id },
      { action: 'login', entity: 'system', details: 'User logged in successfully', userId: users[3].id },
      { action: 'create', entity: 'prescription', details: 'Created prescription for Javad Ghasemi', userId: users[1].id },
      { action: 'view', entity: 'reports', details: 'Viewed financial reports', userId: users[4].id },
      { action: 'create', entity: 'blood_bags', details: 'Collected new blood bag BB-20260512-0003', userId: users[2].id },
      { action: 'update', entity: 'invoice', entityId: invoices[1].id, details: 'Recorded partial payment of 400,000 IRR', userId: users[4].id },
    ];

    await Promise.all(
      auditActions.map((a, i) =>
        db.auditLog.create({
          data: {
            ...a,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            createdAt: new Date(now.getTime() - (auditActions.length - i) * 45 * 60 * 1000),
          },
        })
      )
    );

    // ===== 17. Create Sample Notifications =====
    const notificationData = [
      { userId: users[0].id, type: 'system', title: 'System Update', message: 'Database backup completed successfully', priority: 'medium', isRead: true },
      { userId: users[0].id, type: 'medicine_expiry', title: 'Medicine Expiry Alert', message: 'Atorvastatin (DR-1006) stock is below minimum threshold (5 units)', priority: 'high', isRead: false },
      { userId: users[1].id, type: 'appointment', title: 'New Appointment', message: 'New appointment scheduled with Ali Sadeghi for tomorrow at 09:00', priority: 'medium', isRead: false },
      { userId: users[2].id, type: 'bed', title: 'Bed Available', message: 'ICU Bed B-301 has been cleaned and is now available', priority: 'low', isRead: true },
      { userId: users[3].id, type: 'appointment', title: 'Appointment Reminder', message: '3 appointments scheduled for today', priority: 'medium', isRead: false },
      { userId: users[4].id, type: 'billing', title: 'Payment Overdue', message: 'Invoice INV-202501-0003 payment is overdue by 5 days', priority: 'high', isRead: false },
      { userId: users[0].id, type: 'lab_result', title: 'Lab Results Ready', message: 'CBC results for Hossein Norouzi are now available', priority: 'medium', isRead: false },
      { userId: users[1].id, type: 'system', title: 'Shift Schedule Updated', message: 'Your shift schedule for next week has been updated', priority: 'low', isRead: true },
    ];

    await Promise.all(
      notificationData.map((n, i) =>
        db.notification.create({
          data: {
            ...n,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - (notificationData.length - i) * 2 * 60 * 60 * 1000),
          },
        })
      )
    );

    // ===== 18. Create Sample Shift Schedules =====
    const shiftScheduleData = [];
    for (let dayOffset = -6; dayOffset <= 6; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);

      // Morning shifts
      shiftScheduleData.push({
        staffId: staffMembers[0].id,
        date,
        shiftType: 'morning',
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0),
        endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 15, 0),
        status: dayOffset < 0 ? 'completed' : dayOffset === 0 ? 'scheduled' : 'scheduled',
      });

      // Night shifts
      if (dayOffset % 2 === 0) {
        shiftScheduleData.push({
          staffId: staffMembers[1].id,
          date,
          shiftType: 'night',
          startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 0),
          endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 7, 0),
          status: dayOffset < 0 ? 'completed' : 'scheduled',
        });
      }

      // Evening shifts
      if (dayOffset % 3 === 0) {
        shiftScheduleData.push({
          staffId: staffMembers[2].id,
          date,
          shiftType: 'evening',
          startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 15, 0),
          endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 0),
          status: dayOffset < 0 ? 'completed' : 'scheduled',
        });
      }
    }

    await Promise.all(
      shiftScheduleData.map((s) => db.shiftSchedule.create({ data: s }))
    );

    // ===== 19. Create Sample Attendance Records =====
    const attendanceData = [];
    for (let dayOffset = -14; dayOffset <= 0; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      // Skip weekends
      if (date.getDay() === 5 || date.getDay() === 6) continue;

      for (const staff of staffMembers) {
        const clockInHour = staff.shift === 'morning' ? 7 : staff.shift === 'evening' ? 15 : 19;
        const clockOutHour = staff.shift === 'morning' ? 15 : staff.shift === 'evening' ? 23 : 7;
        const lateMinutes = Math.random() > 0.8 ? Math.floor(Math.random() * 30) : 0;
        const isAbsent = Math.random() > 0.95;

        if (isAbsent) {
          attendanceData.push({
            staffId: staff.id,
            date,
            clockIn: null,
            clockOut: null,
            totalHours: 0,
            status: 'absent' as const,
          });
        } else {
          const clockInTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), clockInHour, lateMinutes);
          const clockOutTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), clockOutHour, Math.floor(Math.random() * 15));
          const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

          attendanceData.push({
            staffId: staff.id,
            date,
            clockIn: clockInTime,
            clockOut: clockOutTime,
            totalHours: Math.round(totalHours * 10) / 10,
            status: lateMinutes > 0 ? 'late' : 'present',
          });
        }
      }
    }

    await Promise.all(
      attendanceData.map((a) => db.attendance.create({ data: a }))
    );

    // ===== 20. Create Sample Payments =====
    await Promise.all([
      db.payment.create({
        data: {
          invoiceId: invoices[0].id,
          amount: 350000,
          method: 'cash',
          referenceNumber: 'PAY-001',
          status: 'completed',
          receivedBy: 'Mehdi Karimi',
          notes: 'Full payment received',
        },
      }),
      db.payment.create({
        data: {
          invoiceId: invoices[1].id,
          amount: 400000,
          method: 'insurance',
          referenceNumber: 'INS-001',
          status: 'completed',
          receivedBy: 'Mehdi Karimi',
          notes: 'Partial insurance payment',
        },
      }),
      db.payment.create({
        data: {
          invoiceId: invoices[1].id,
          amount: 400000,
          method: 'card',
          referenceNumber: 'CARD-001',
          status: 'pending',
          receivedBy: null,
          notes: 'Remaining balance pending',
        },
      }),
    ]);

    // ===== 21. Create Sample Vital Records =====
    await Promise.all([
      db.vitalRecord.create({
        data: {
          patientId: patients[15].id,
          date: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          temperature: 37.8,
          bloodPressureSys: 130,
          bloodPressureDia: 85,
          heartRate: 92,
          respiratoryRate: 20,
          oxygenSat: 96.5,
          weight: 75,
          notes: 'Slight fever, BP slightly elevated',
          createdById: users[2].id,
        },
      }),
      db.vitalRecord.create({
        data: {
          patientId: patients[16].id,
          date: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          temperature: 38.2,
          bloodPressureSys: 120,
          bloodPressureDia: 80,
          heartRate: 88,
          respiratoryRate: 22,
          oxygenSat: 94.0,
          notes: 'Fever persistent, O2 sat slightly low',
          createdById: users[2].id,
        },
      }),
      db.vitalRecord.create({
        data: {
          patientId: patients[0].id,
          date: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          temperature: 36.5,
          bloodPressureSys: 118,
          bloodPressureDia: 76,
          heartRate: 72,
          respiratoryRate: 16,
          oxygenSat: 98.5,
          weight: 82,
          height: 175,
          notes: 'Normal vitals',
          createdById: users[1].id,
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Database seeded successfully',
      summary: {
        departments: departments.length,
        users: users.length,
        doctors: doctors.length,
        patients: patients.length,
        appointments: appointments.length,
        medicines: medicines.length,
        beds: beds.length,
        invoices: invoices.length,
        settings: settingsData.length,
        staff: staffMembers.length,
        bloodBags: 5,
        queueEntries: queueEntries.length,
        visitRecords: visitRecords.length,
        auditLogs: auditActions.length,
        notifications: notificationData.length,
        shiftSchedules: shiftScheduleData.length,
        attendanceRecords: attendanceData.length,
        payments: 3,
        vitalRecords: 3,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
