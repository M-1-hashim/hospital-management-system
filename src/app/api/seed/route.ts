import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/seed - Seed database with sample data
export async function POST() {
  try {
    // Clear existing data (in order due to foreign keys)
    await db.invoiceItem.deleteMany();
    await db.invoice.deleteMany();
    await db.prescriptionItem.deleteMany();
    await db.prescription.deleteMany();
    await db.labTest.deleteMany();
    await db.admission.deleteMany();
    await db.appointment.deleteMany();
    await db.vitalRecord.deleteMany();
    await db.bed.deleteMany();
    await db.medicine.deleteMany();
    await db.doctor.deleteMany();
    await db.staff.deleteMany();
    await db.patient.deleteMany();
    await db.activityLog.deleteMany();
    await db.user.deleteMany();
    await db.hospitalSetting.deleteMany();
    await db.expense.deleteMany();
    await db.service.deleteMany();
    await db.insurance.deleteMany();
    await db.department.deleteMany();

    // ===== 1. Create Departments =====
    const departments = await Promise.all([
      db.department.create({
        data: { name: 'Emergency', nameFa: 'اورژانس', floor: 1, phone: '101', description: 'Emergency department for acute cases' },
      }),
      db.department.create({
        data: { name: 'ICU', nameFa: 'بخش مراقبت ویژه', floor: 2, phone: '102', description: 'Intensive Care Unit' },
      }),
      db.department.create({
        data: { name: 'Surgery', nameFa: 'جراحی', floor: 3, phone: '103', description: 'General and specialized surgery' },
      }),
      db.department.create({
        data: { name: 'Internal Medicine', nameFa: 'داخلی', floor: 2, phone: '104', description: 'Internal medicine department' },
      }),
      db.department.create({
        data: { name: 'Pediatrics', nameFa: 'اطفال', floor: 4, phone: '105', description: 'Pediatric care department' },
      }),
      db.department.create({
        data: { name: 'OB/GYN', nameFa: 'زنان و زایمان', floor: 5, phone: '106', description: 'Obstetrics and Gynecology' },
      }),
      db.department.create({
        data: { name: 'Cardiology', nameFa: 'قلب و عروق', floor: 3, phone: '107', description: 'Cardiology department' },
      }),
      db.department.create({
        data: { name: 'Orthopedics', nameFa: 'ارتوپدی', floor: 3, phone: '108', description: 'Orthopedics and trauma' },
      }),
    ]);

    // ===== 2. Create Users =====
    const adminHash = await bcrypt.hash('admin123', 10);
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const nurseHash = await bcrypt.hash('nurse123', 10);
    const receptionHash = await bcrypt.hash('reception123', 10);
    const accountHash = await bcrypt.hash('account123', 10);

    const users = await Promise.all([
      db.user.create({
        data: {
          username: 'admin',
          passwordHash: adminHash,
          fullName: 'System Administrator',
          email: 'admin@hospital.com',
          phone: '09120000001',
          role: 'admin',
        },
      }),
      db.user.create({
        data: {
          username: 'doctor',
          passwordHash: doctorHash,
          fullName: 'Dr. Ahmad Mohammadi',
          email: 'dr.mohammadi@hospital.com',
          phone: '09120000002',
          role: 'doctor',
        },
      }),
      db.user.create({
        data: {
          username: 'nurse',
          passwordHash: nurseHash,
          fullName: 'Fateme Hosseini',
          email: 'nurse.hosseini@hospital.com',
          phone: '09120000003',
          role: 'nurse',
        },
      }),
      db.user.create({
        data: {
          username: 'receptionist',
          passwordHash: receptionHash,
          fullName: 'Sara Rezaei',
          email: 'reception@hospital.com',
          phone: '09120000004',
          role: 'receptionist',
        },
      }),
      db.user.create({
        data: {
          username: 'accountant',
          passwordHash: accountHash,
          fullName: 'Mehdi Karimi',
          email: 'finance@hospital.com',
          phone: '09120000005',
          role: 'accountant',
        },
      }),
    ]);

    // ===== 3. Create Doctors =====
    const doctors = await Promise.all([
      db.doctor.create({
        data: {
          userId: users[1].id,
          firstName: 'Ahmad',
          lastName: 'Mohammadi',
          specialty: 'Internal Medicine',
          licenseNumber: 'DR-1001',
          phone: '09121000001',
          email: 'dr.mohammadi@hospital.com',
          departmentId: departments[3].id,
          visitFee: 350000,
          rating: 4.8,
          bio: 'Board certified internist with 15 years of experience',
        },
      }),
      db.doctor.create({
        data: {
          firstName: 'Maryam',
          lastName: 'Ahmadi',
          specialty: 'Cardiology',
          licenseNumber: 'DR-1002',
          phone: '09121000002',
          email: 'dr.ahmadi@hospital.com',
          departmentId: departments[6].id,
          visitFee: 500000,
          rating: 4.9,
          bio: 'Cardiologist specializing in interventional cardiology',
        },
      }),
      db.doctor.create({
        data: {
          firstName: 'Ali',
          lastName: 'Hosseini',
          specialty: 'Orthopedics',
          licenseNumber: 'DR-1003',
          phone: '09121000003',
          email: 'dr.hosseini@hospital.com',
          departmentId: departments[7].id,
          visitFee: 450000,
          rating: 4.6,
          bio: 'Orthopedic surgeon specializing in sports medicine',
        },
      }),
      db.doctor.create({
        data: {
          firstName: 'Zahra',
          lastName: 'Rezaei',
          specialty: 'Pediatrics',
          licenseNumber: 'DR-1004',
          phone: '09121000004',
          email: 'dr.rezaei@hospital.com',
          departmentId: departments[4].id,
          visitFee: 300000,
          rating: 4.7,
          bio: 'Pediatrician with expertise in neonatal care',
        },
      }),
      db.doctor.create({
        data: {
          firstName: 'Hassan',
          lastName: 'Karimi',
          specialty: 'General Surgery',
          licenseNumber: 'DR-1005',
          phone: '09121000005',
          email: 'dr.karimi@hospital.com',
          departmentId: departments[2].id,
          visitFee: 600000,
          rating: 4.5,
          bio: 'General surgeon with 20 years of experience',
        },
      }),
      db.doctor.create({
        data: {
          firstName: 'Nasrin',
          lastName: 'Moradi',
          specialty: 'OB/GYN',
          licenseNumber: 'DR-1006',
          phone: '09121000006',
          email: 'dr.moradi@hospital.com',
          departmentId: departments[5].id,
          visitFee: 400000,
          rating: 4.8,
          bio: 'Obstetrician and gynecologist',
        },
      }),
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
    await db.admission.create({
      data: {
        patientId: patients[15].id,
        bedId: beds[1].id,
        doctorId: doctors[1].id,
        diagnosis: 'Acute myocardial infarction',
        admitDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    });

    await db.admission.create({
      data: {
        patientId: patients[16].id,
        bedId: beds[3].id,
        doctorId: doctors[0].id,
        diagnosis: 'Pneumonia',
        admitDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    });

    // ===== 9. Create 3 Invoices =====
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - 1);

    await db.invoice.create({
      data: {
        invoiceNumber: 'INV-202501-0001',
        patientId: patients[0].id,
        appointmentId: appointments[0].id,
        subtotal: 350000,
        discount: 0,
        tax: 0,
        total: 350000,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        paidAmount: 350000,
        notes: 'Regular visit fee',
        items: {
          create: [
            { description: 'Doctor visit - Internal Medicine', type: 'doctor', quantity: 1, unitPrice: 350000, total: 350000 },
          ],
        },
      },
    });

    await db.invoice.create({
      data: {
        invoiceNumber: 'INV-202501-0002',
        patientId: patients[1].id,
        subtotal: 850000,
        discount: 50000,
        tax: 0,
        total: 800000,
        paymentMethod: 'insurance',
        paymentStatus: 'partial',
        paidAmount: 400000,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Lab tests and visit',
        items: {
          create: [
            { description: 'Doctor visit - Cardiology', type: 'doctor', quantity: 1, unitPrice: 500000, total: 500000 },
            { description: 'CBC Blood Test', type: 'lab', quantity: 1, unitPrice: 150000, total: 150000 },
            { description: 'ECG Test', type: 'lab', quantity: 1, unitPrice: 200000, total: 200000 },
          ],
        },
      },
    });

    await db.invoice.create({
      data: {
        invoiceNumber: 'INV-202501-0003',
        patientId: patients[2].id,
        subtotal: 600000,
        discount: 0,
        tax: 0,
        total: 600000,
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        notes: 'Surgery consultation',
        items: {
          create: [
            { description: 'Doctor visit - Surgery', type: 'doctor', quantity: 1, unitPrice: 600000, total: 600000 },
          ],
        },
      },
    });

    // ===== 10. Create 3 Lab Tests =====
    await db.labTest.create({
      data: {
        patientId: patients[3].id,
        doctorId: doctors[0].id,
        testName: 'Complete Blood Count (CBC)',
        category: 'blood',
        status: 'completed',
        cost: 150000,
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
        patientId: patients[4].id,
        doctorId: doctors[1].id,
        testName: 'Lipid Panel',
        category: 'blood',
        status: 'completed',
        cost: 200000,
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
      data: {
        patientId: patients[5].id,
        doctorId: doctors[2].id,
        testName: 'X-Ray - Chest',
        category: 'imaging',
        status: 'pending',
        cost: 350000,
        testDate: new Date(),
      },
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

    await Promise.all(
      settingsData.map((s) =>
        db.hospitalSetting.create({ data: s })
      )
    );

    // ===== 12. Create Staff =====
    await Promise.all([
      db.staff.create({
        data: {
          userId: users[2].id,
          firstName: 'Fateme',
          lastName: 'Hosseini',
          role: 'nurse',
          departmentId: departments[0].id,
          phone: '09120000003',
          shift: 'morning',
          salary: 25000000,
          hireDate: new Date('2020-03-15'),
        },
      }),
      db.staff.create({
        data: {
          firstName: 'Akbar',
          lastName: 'Sadeghi',
          role: 'nurse',
          departmentId: departments[1].id,
          phone: '09130000001',
          shift: 'night',
          salary: 28000000,
          hireDate: new Date('2019-06-01'),
        },
      }),
      db.staff.create({
        data: {
          firstName: 'Gholam',
          lastName: 'Nouri',
          role: 'guard',
          departmentId: departments[0].id,
          phone: '09130000002',
          shift: 'evening',
          salary: 18000000,
          hireDate: new Date('2021-01-10'),
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
        settings: settingsData.length,
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
