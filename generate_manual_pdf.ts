import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const outputPath = path.join(process.cwd(), 'Brand4Less_User_Manual.pdf');
const doc = new PDFDocument({
  size: 'A4',
  margin: 40,
  autoFirstPage: true,
  bufferPages: true,
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Primary Brand Colors
const PRIMARY_COLOR = '#0f172a'; // Deep Navy Slate
const ACCENT_COLOR = '#059669';  // Emerald Green
const MUTED_COLOR = '#475569';   // Slate Gray
const BORDER_COLOR = '#cbd5e1';  // Light Border
const BG_CARD = '#f8fafc';       // Soft Card BG

function addHeader(title: string) {
  doc.fontSize(16).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
  doc.text(title, { underline: false });
  doc.rect(40, doc.y + 2, 515, 2).fill(ACCENT_COLOR);
  doc.moveDown(1.2);
}

function addSubHeader(title: string) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
  doc.text(title);
  doc.moveDown(0.4);
}

function addParagraph(text: string) {
  doc.fontSize(9.5).font('Helvetica').fillColor('#1e293b').lineGap(2);
  doc.text(text);
  doc.moveDown(0.6);
}

function addBullet(title: string, desc: string) {
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
  doc.text(`• ${title}: `, { continued: true });
  doc.font('Helvetica').fillColor('#334155');
  doc.text(desc);
  doc.moveDown(0.4);
}

function addCardBox(title: string, content: string) {
  const y = doc.y;
  doc.rect(40, y, 515, 50).fillAndStroke(BG_CARD, BORDER_COLOR);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
  doc.text(title, 50, y + 8);
  doc.fontSize(8.5).font('Helvetica').fillColor(MUTED_COLOR);
  doc.text(content, 50, y + 24, { width: 495 });
  doc.y = y + 60;
}

// ══════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, 595, 842).fill('#0f172a'); // Full Dark Navy Background

// Cover Diamond Badge
doc.save();
doc.translate(297.5, 260);
doc.rect(-45, -45, 90, 90).fill('#ffffff');
doc.fontSize(36).font('Helvetica-Bold').fillColor('#0f172a');
doc.text('B4L', -35, -15, { width: 70, align: 'center' });
doc.restore();

doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('BRAND 4 LESS', 40, 360, { align: 'center', width: 515 });

doc.fontSize(14).font('Helvetica').fillColor('#34d399'); // Emerald
doc.text('DESKTOP RETAIL SUITE — USER MANUAL & HARDWARE GUIDE', 40, 400, { align: 'center', width: 515 });

doc.fontSize(10).font('Helvetica').fillColor('#94a3b8');
doc.text('Point of Sale (POS) • Inventory Management • Customer Khata • TSC & DTS Hardware Guide', 40, 430, { align: 'center', width: 515 });

// Cover Footer Info Box
doc.rect(100, 680, 395, 60).fill('#1e293b');
doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('App Edition: Enterprise Desktop v1.0.0 (Offline-First SQLite Engine)', 110, 695, { align: 'center', width: 375 });
doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
doc.text('Hardware Pre-Integrated: TSC Label Printer • DTS Thermal Printer • SpeedX Scanner', 110, 715, { align: 'center', width: 375 });

// ══════════════════════════════════════════════════════════════════════════
// PAGE 2: TABLE OF CONTENTS & QUICK START
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader('1. Table of Contents & System Overview');

addParagraph(
  'The Brand 4 Less Desktop Retail Suite is an offline-first, high-speed retail management system designed specifically for apparel, garment, and leftover retail outlets. It includes full Point of Sale (POS) operations, inventory tracking with Moving Weighted Average Cost (WAC), double-entry customer Khata ledgers, supplier payables, operating expense registers, and native hardware driver support.'
);

addCardBox(
  '🎯 System Access & Web/Local Address',
  '• Local PC Address: http://localhost:5173/\n• Core Backend API: http://localhost:4000/api\n• Database: data/brand4less.db (SQLite WAL Mode with ACID Atomic Transactions)'
);

addSubHeader('Default System Roles & Numpad Quick PINs');
addParagraph('The system supports 3 pre-configured security roles with PIN-based instant cashier login:');

const tableTop = doc.y;
doc.rect(40, tableTop, 515, 20).fill('#0f172a');
doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('Role', 50, tableTop + 5);
doc.text('Default Username', 140, tableTop + 5);
doc.text('Quick PIN', 270, tableTop + 5);
doc.text('Permissions & Scope', 360, tableTop + 5);

const roles = [
  { role: 'Admin (Owner)', user: 'admin', pin: '9999', scope: 'Full system control, P&L, backups, salaries' },
  { role: 'Store Manager', user: 'manager', pin: '5555', scope: 'Inbound purchases, Khata limits, stock adjustment' },
  { role: 'Sales Cashier', user: 'cashier1', pin: '1234', scope: 'POS Billing Terminal, barcode scanning, receipts' },
];

let curY = tableTop + 20;
roles.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(40, curY, 515, 22).fillAndStroke(bg, '#e2e8f0');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(r.role, 50, curY + 6);
  doc.font('Helvetica').fillColor('#334155').text(r.user, 140, curY + 6);
  doc.font('Helvetica-Bold').fillColor('#059669').text(r.pin, 270, curY + 6);
  doc.font('Helvetica').fillColor('#475569').text(r.scope, 360, curY + 6, { width: 190 });
  curY += 22;
});

doc.y = curY + 15;
addSubHeader('Key Application Modules in Left Navigation Sidebar');
addBullet('Executive Dashboard', 'Real-time overview of today sales, net trading profit, receivables, and category mix.');
addBullet('POS Billing Terminal', 'Fast keyboard-driven cash & credit checkout with SpeedX barcode auto-scanning.');
addBullet('Customer Records & History', 'Customer directory with lifetime spend, orders count, and past invoice receipt reprints.');
addBullet('Product Inventory', 'Garment variant catalog (Size/Color/Cost/Price/Stock) with barcode generator.');
addBullet('Purchases & Vendor Invoices', 'Inbound supplier bill ingestion with Moving WAC cost auto-calculation.');
addBullet('Customer Khata Ledger', 'Double-entry credit ledger, payment vouchers, and PDF/Excel statement exports.');
addBullet('Operating Expenses & Payroll', 'Daily petty cash logging, monthly overhead bills, and staff salary register.');
addBullet('Financial Analytics & P&L', 'Official Trading Profit & Loss statement and Stock Valuation at Cost (WAC).');
addBullet('Settings & Hardware Integration', 'Hardware configuration (TSC, DTS, SpeedX) and hot SQLite database backups.');

// ══════════════════════════════════════════════════════════════════════════
// PAGE 3: HARDWARE INTEGRATION GUIDE (TSC, DTS, SPEEDX)
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader('2. Hardware Setup & Integration Guide');

addParagraph(
  'Brand 4 Less features direct, pre-built hardware drivers for standard retail equipment without requiring third-party middleware.'
);

addSubHeader('🏷️ 1. TSC Brand Barcode Label Printer (TSPL / TSPL2)');
addParagraph(
  'Compatible Models: TSC TE200, TTP-244 Pro, DA210, TC200, MB240, and universal TSPL printers.'
);
addBullet('Physical Setup', 'Connect power and plug the USB cable into your Windows PC. Insert 50mm x 30mm (or 40mm x 25mm) label roll.');
addBullet('Gap Calibration (Important)', 'Turn printer OFF. Hold the FEED button and turn printer ON. Release when it feeds 2–3 labels. Solid green light = calibrated.');
addBullet('Direct Printing', 'In Product Inventory, click "Print Barcode Labels" ➔ Click "[⚡ Direct Print (TSC)]". The app generates raw TSPL vector commands for instant, razor-sharp sticker output.');
addBullet('Diagnostics in App', 'Open Settings & Backups ➔ Hardware tab ➔ Click "[Test TSC Label Printer]" to print a sample test sticker.');

doc.moveDown(0.5);
addSubHeader('🧾 2. DTS Brand POS Thermal Receipt Printer (ESC/POS 80mm / 58mm)');
addParagraph(
  'Compatible Models: DTS POS-80, DTS POS-58, Epson ESC/POS, Xprinter, Rongta thermal printers.'
);
addBullet('Physical Setup', 'Plug USB into PC and connect the RJ11 telephone-style cable from your Cash Drawer into the printer port marked "DK".');
addBullet('Checkout Printing', 'When a sale finishes in POS, click "[⚡ Direct Print (DTS Thermal)]". The printer prints the receipt in under 1 second, cuts the paper cleanly (GS V 66 0), and kicks open the cash drawer automatically on Cash sales.');
addBullet('Diagnostics in App', 'In Settings ➔ Hardware tab ➔ Click "[Test DTS Receipt Printer]" to print a diagnostic test slip and pop open the cash drawer.');

doc.moveDown(0.5);
addSubHeader('⚡ 3. SpeedX Barcode Scanner (High-Speed USB HID Wedge)');
addBullet('Physical Setup', 'Plug the SpeedX USB cable into any free port. Windows recognizes it immediately as a Plug & Play input device.');
addBullet('Zero-Click Global Detection', 'You do NOT need to click on any search bar. Simply point the SpeedX scanner at any clothing tag anywhere in the POS terminal and pull the trigger.');
addBullet('Automated Actions', 'Within 20ms, the app detects the barcode, sounds a pleasant audio BEEP, adds the exact variant to the active cart, and shows a green confirmation badge on screen.');

// ══════════════════════════════════════════════════════════════════════════
// PAGE 4: POS BILLING TERMINAL & CUSTOMER AUTO-REGISTRATION
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader('3. POS Billing Terminal & Customer Records');

addSubHeader('Cashier Keyboard Shortcuts:');
const scTop = doc.y;
doc.rect(40, scTop, 515, 18).fill('#0f172a');
doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('Key Shortcut', 50, scTop + 5);
doc.text('Action Function', 160, scTop + 5);
doc.text('Description', 280, scTop + 5);

const shortcuts = [
  { key: 'F1', action: 'Focus Search Box', desc: 'Focuses and selects search input for manual product lookup' },
  { key: 'F4', action: 'Collect Payment', desc: 'Opens checkout payment modal immediately when cart has items' },
  { key: 'F8', action: 'Hold Active Cart', desc: 'Stores current cart in memory when customer picks extra items' },
  { key: 'ESC', action: 'Cancel / Close Modal', desc: 'Closes active checkout, receipt, or discount popups' },
];

let scY = scTop + 18;
shortcuts.forEach((s, idx) => {
  const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(40, scY, 515, 20).fillAndStroke(bg, '#e2e8f0');
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#059669').text(s.key, 50, scY + 5);
  doc.font('Helvetica-Bold').fillColor('#0f172a').text(s.action, 160, scY + 5);
  doc.font('Helvetica').fillColor('#475569').text(s.desc, 280, scY + 5);
  scY += 20;
});

doc.y = scY + 12;
addSubHeader('Step-by-Step POS Checkout Flow:');
addBullet('1. Add Items to Cart', 'Scan barcode tags with the SpeedX Scanner or click product cards from the category grid.');
addBullet('2. Customer Registration', 'Enter Customer Name and Mobile Phone (e.g. Usman Tariq - 03001234567). New customers are automatically enrolled in the database upon checkout!');
addBullet('3. Discounts (Optional)', 'Click "Add Discount" to apply a flat PKR amount or percentage discount.');
addBullet('4. Payment Methods', 'Press F4. Choose Cash (with change calculator), Card/POS, Bank IBFT, Khata (Credit), or Split Payment.');
addBullet('5. Print Receipt', 'Click "Confirm & Print Receipt" ➔ DTS Thermal Printer prints receipt & opens cash drawer.');

doc.moveDown(0.5);
addSubHeader('👥 Customer Records & Purchase History Module:');
addParagraph(
  'Accessible via "Customer Records" in the left sidebar. The system maintains an aggregated lifecycle profile for every customer who shops at your store.'
);
addBullet('Lifetime Purchase Tracking', 'View total completed orders count, total lifetime spend in PKR, outstanding Khata debt, and last visit date.');
addBullet('Purchase History Drawer', 'Click "[History]" on any customer to inspect all historical invoices and click "[Reprint DTS Receipt]" to re-print any past invoice anytime.');
addBullet('Customer Khata Ledger', 'Record credit payments, print signed vouchers, and export full customer statements to PDF or Excel.');

// ══════════════════════════════════════════════════════════════════════════
// PAGE 5: INVENTORY, PURCHASES, EXPENSES & P&L ANALYTICS
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
addHeader('4. Inventory, Purchases, Expenses & P&L');

addSubHeader('📦 Product Inventory & WAC Costing');
addBullet('Variant Catalog', 'Manage clothing products with multiple size/color variations, cost prices, retail selling prices, and minimum stock alerts.');
addBullet('Moving WAC Formula', 'When receiving new supplier shipments at fluctuating costs, the system recalculates Moving Weighted Average Cost: WAC = (Old Cost × Old Qty + New Cost × New Qty) ÷ Total Qty.');
addBullet('Vector Barcode Labels', 'Print 50x30mm sticky labels directly to your TSC printer or generate printable vector PDF sheets.');

doc.moveDown(0.5);
addSubHeader('💰 Operating Expenses & Staff Payroll');
addBullet('Daily Expenses', 'Click "[+ Record Daily Expense]" for store petty cash, tea, refreshments, generator fuel, and packaging shopping bags.');
addBullet('Monthly Overheads', 'Click "[+ Record Monthly Expense]" with billing month dropdown for Shop Rent, Electricity (LESCO), Internet, and Maintenance.');
addBullet('Staff Payroll Register', 'Register staff members with monthly salary. Click "[Disburse Salary]" at month-end to auto-post payouts into the expense ledger.');

doc.moveDown(0.5);
addSubHeader('📊 Financial Analytics & Profit/Loss (P&L) Statement');
addBullet('Trading Profit Statement', 'Gross Retail Sales minus Customer Discounts = Net Revenue. Net Revenue minus Cost of Goods Sold (COGS) = Gross Trading Profit.');
addBullet('Bottom-Line Net Profit', 'Gross Profit minus Operating Overheads (Rent, Electricity, Salaries, Petty Cash) = Net Operating Profit.');
addBullet('Inventory Valuation Audit', 'Real-time calculation of total tied-up capital in inventory at cost price vs gross realizable retail value.');
addBullet('Excel Report Exports', 'Single-click download of official financial spreadsheets formatted with clean headers.');

doc.moveDown(0.5);
addSubHeader('💾 Hot SQLite Database Backups');
addBullet('Instant Snapshot', 'Go to Settings & Backups ➔ Database Backup ➔ Click "[Create Backup Now]". The system executes SQLite hot "VACUUM INTO" to create a clean, encrypted snapshot within 1 second.');
addBullet('Offsite Copy', 'Click "[Download]" on any snapshot to copy the backup file onto a USB drive for external safekeeping.');

// ══════════════════════════════════════════════════════════════════════════
// FOOTER & PAGE NUMBERING (ALL PAGES)
// ══════════════════════════════════════════════════════════════════════════
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  if (i === 0) continue; // Skip cover page

  // Top header line
  doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
  doc.text('BRAND 4 LESS DESKTOP RETAIL SUITE — OFFICIAL USER MANUAL', 40, 20, { width: 515 });
  doc.text('CONFIDENTIAL & PROPRIETARY', 40, 20, { width: 515, align: 'right' });

  // Bottom footer line
  doc.rect(40, 805, 515, 0.5).stroke('#cbd5e1');
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
  doc.text('Brand 4 Less Retail Systems • Hardware Driver Suite (TSC / DTS / SpeedX)', 40, 812);
  doc.text(`Page ${i + 1} of ${range.count}`, 40, 812, { width: 515, align: 'right' });
}

doc.end();

stream.on('finish', () => {
  console.log('✅ PDF User Manual successfully generated at:', outputPath);
});
