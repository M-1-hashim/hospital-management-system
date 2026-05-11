---
Task ID: 1-9
Agent: Main Agent
Task: Fix Doctors, Billing, Pharmacy, Laboratory, Wards, Settings pages and global responsiveness

Work Log:
- Read all 6 problematic pages + layout components + store + i18n
- Identified root issues: grid-cols-12 forms breaking on mobile, missing responsive dialog widths, tables without horizontal scroll, payment method translation bug
- Fixed DoctorsPage: Added grid/list view toggle, stats row, responsive cards (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3), responsive dialog widths, proper search/filter mobile stacking, removed unused imports
- Fixed BillingPage: Changed line items to grid-cols-1 sm:grid-cols-6 lg:grid-cols-12, fixed payment method to use raw English values (cash/card/insurance/installment), responsive totals (w-full sm:w-64), responsive dialog widths, table horizontal scroll, Pay button text hidden on mobile
- Fixed PharmacyPage: Added stats row, responsive alerts (flex-col sm:flex-row), scrollable TabsList, prescription dialog dual layout (card on mobile, grid on desktop), responsive medicine form grids, proper dialog widths
- Fixed LaboratoryPage: Results dialog dual layout (card mobile, grid desktop), table horizontal scroll min-w-[700px], responsive filter bar, print function extracted, Results button icon-only on mobile, responsive dialog widths
- Fixed WardsPage: Split filter/action bars into two rows, improved grid breakpoints (grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6), table horizontal scroll, all dialogs responsive widths, action buttons full-width on mobile
- Fixed SettingsPage: Scrollable TabsList, tables with min-w horizontal scroll, form grids grid-cols-1 sm:grid-cols-2, sticky+scrollable user table, responsive dialog widths
- Fixed global layout: AppLayout padding p-3 sm:p-4 md:p-6 lg:p-8, Sidebar nav items min-h-[44px] touch targets, Header dropdowns max-w-[85vw], ConfirmDialog responsive max-w, EmptyState padding
- Build compiled successfully with zero errors
- ESLint passes cleanly on all page files

Stage Summary:
- All 6 pages (Doctors, Billing, Pharmacy, Laboratory, Wards, Settings) rewritten with full responsiveness
- Global layout components (AppLayout, Sidebar, Header) fixed for mobile
- Shared components (ConfirmDialog, EmptyState) made responsive
- Build: Compiled successfully in 9.5s with 19 routes
- Lint: Zero errors
