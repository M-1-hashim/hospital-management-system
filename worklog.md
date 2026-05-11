---
Task ID: 1
Agent: Main Agent
Task: Fix client-side exceptions on Doctors, Billing, Pharmacy, Laboratory, Wards, and Settings pages

Work Log:
- Analyzed all 6 problematic pages and their corresponding API routes
- Identified root cause: API responses return wrapped objects (e.g., `{doctors: [...]}`) but frontend code treated them as raw arrays, causing `.map()` to crash on objects
- Fixed DoctorsPage: Updated fetchDoctors() to extract `data.doctors` from API response
- Fixed BillingPage: Updated data extraction for invoices, patients, AND fixed stats key name mismatches (API returns `todayIncome`/`monthIncome`/`totalUnpaid` but page expected `todayRevenue`/`monthlyRevenue`/`unpaidInvoices`)
- Fixed PharmacyPage: Updated data extraction for medicines (`data.medicines`), prescriptions (`data.prescriptions`), and patients (`data.patients`)
- Fixed LaboratoryPage: Updated data extraction for labTests (`data.labTests`), patients, and doctors
- Fixed WardsPage: Updated data extraction for patients (`data.patients`), doctors (`data.doctors`), and departments (`data.departments`)
- Fixed SettingsPage: Updated data extraction for departments (`data.departments`)
- Verified build compiles successfully with no errors
- Verified API endpoints return correct data format

Stage Summary:
- Root cause was API response format mismatch across all pages
- All 6 pages now properly extract arrays from wrapped API responses using defensive `Array.isArray()` checks
- BillingPage stats keys are now correctly mapped to API response keys
- Build verified clean with `next build`
- All API endpoints tested and return HTTP 200 with expected data
