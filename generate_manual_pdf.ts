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

// Color Palette
const COLOR_PRIMARY = '#0f172a'; // Slate 900
const COLOR_ACCENT = '#059669';  // Emerald 600
const COLOR_MUTED = '#475569';   // Slate 600
const COLOR_BG_ROW = '#f8fafc';  // Slate 50
const COLOR_BORDER = '#cbd5e1';  // Slate 300

function drawSectionHeader(title: string, tag: string) {
  const y = doc.y;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(COLOR_PRIMARY);
  doc.text(title, 40, y);
  
  // Tag on right
  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR_ACCENT);
  doc.text(tag.toUpperCase(), 40, y + 3, { width: 515, align: 'right' });
  
  // Underline rule
  doc.rect(40, y + 18, 515, 1.5).fill(COLOR_PRIMARY);
  doc.y = y + 26;
}

function drawSubHeader(title: string) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLOR_PRIMARY);
  doc.text(title);
  doc.moveDown(0.3);
}

function drawParagraph(text: string) {
  doc.fontSize(9).font('Helvetica').fillColor('#1e293b').lineGap(2);
  doc.text(text);
  doc.moveDown(0.4);
}

function drawBullet(title: string, desc: string) {
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_PRIMARY);
  doc.text(`- ${title}: `, { continued: true });
  doc.font('Helvetica').fillColor('#334155');
  doc.text(desc);
  doc.moveDown(0.3);
}

function drawCard(title: string, items: string[]) {
  const y = doc.y;
  const padding = 10;
  
  doc.fontSize(9.5).font('Helvetica-Bold');
  const titleHeight = 14;
  doc.fontSize(8.5).font('Helvetica');
  const contentHeight = items.length * 13;
  const totalHeight = titleHeight + contentHeight + (padding * 2);

  doc.rect(40, y, 515, totalHeight).fillAndStroke(COLOR_BG_ROW, COLOR_BORDER);
  
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(COLOR_PRIMARY);
  doc.text(title, 50, y + padding);

  let itemY = y + padding + titleHeight;
  items.forEach((it) => {
    doc.fontSize(8.5).font('Helvetica').fillColor(COLOR_MUTED);
    doc.text(it, 50, itemY);
    itemY += 13;
  });

  doc.y = y + totalHeight + 10;
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 1: COVER PAGE
// ══════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, 595, 842).fill('#0f172a'); // Full Solid Dark Background

// Diamond Emblem
doc.save();
doc.translate(297.5, 250);
doc.rect(-45, -45, 90, 90).fill('#ffffff');
doc.fontSize(34).font('Helvetica-Bold').fillColor('#0f172a');
doc.text('B4L', -40, -15, { width: 80, align: 'center' });
doc.restore();

doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('BRAND 4 LESS', 40, 350, { align: 'center', width: 515 });

doc.fontSize(13).font('Helvetica-Bold').fillColor('#34d399');
doc.text('DESKTOP RETAIL SUITE - OFFICIAL USER MANUAL', 40, 390, { align: 'center', width: 515 });

doc.fontSize(9.5).font('Helvetica').fillColor('#94a3b8');
doc.text('Point of Sale (POS) | Inventory Management | Customer Khata | Hardware Guide', 40, 420, { align: 'center', width: 515 });

// Bottom Specs Box
doc.rect(80, 680, 435, 60).fill('#1e293b');
doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('EDITION: Enterprise Retail Desktop Edition (100% Offline-Ready)', 90, 695, { align: 'center', width: 415 });
doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
doc.text('HARDWARE DRIVERS: TSC Label Printer | DTS Thermal Printer | SpeedX Barcode Scanner', 90, 715, { align: 'center', width: 415 });

// ══════════════════════════════════════════════════════════════════════════
// PAGE 2: GETTING STARTED & ROLES
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
drawSectionHeader('1. Overview & Staff Logins', 'System Access');

drawParagraph(
  'The Brand 4 Less Desktop Retail Suite is a high-speed retail management system designed for clothing, apparel, and retail outlets. It operates completely offline and handles Point of Sale (POS) billing, barcode generation, inventory valuation with Moving Weighted Average Cost (WAC), double-entry customer credit accounts, and native hardware printing.'
);

drawCard('System Launching & Architecture', [
  '• Launching: Double-click the "Brand 4 Less" shortcut icon on your Windows Desktop',
  '• Offline Operation: 100% functional without an active internet connection',
  '• Security: All sales and inventory data are saved locally with automatic transaction protection',
]);

drawSubHeader('Staff Access Roles & Quick Numpad PINs');
drawParagraph('Cashiers and staff can log in within one second by typing their 4-digit PIN:');

// Staff Roles Table
const t1Top = doc.y;
doc.rect(40, t1Top, 515, 18).fill(COLOR_PRIMARY);
doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('ROLE', 50, t1Top + 5);
doc.text('DEFAULT USER', 140, t1Top + 5);
doc.text('QUICK PIN', 250, t1Top + 5);
doc.text('PERMISSIONS & ACCESS', 330, t1Top + 5);

const roles = [
  { role: 'Admin (Owner)', user: 'admin', pin: '9999', scope: 'Full control: P&L analytics, staff salaries, backups, settings' },
  { role: 'Store Manager', user: 'manager', pin: '5555', scope: 'Inbound stock, inventory adjustments, customer credit limits' },
  { role: 'Sales Cashier', user: 'cashier1', pin: '1234', scope: 'POS Billing Terminal, barcode scanning, receipt printing' },
];

let rY = t1Top + 18;
roles.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(40, rY, 515, 20).fillAndStroke(bg, COLOR_BORDER);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text(r.role, 50, rY + 5);
  doc.font('Helvetica').fillColor('#334155').text(r.user, 140, rY + 5);
  doc.font('Helvetica-Bold').fillColor(COLOR_ACCENT).text(r.pin, 250, rY + 5);
  doc.font('Helvetica').fillColor(COLOR_MUTED).text(r.scope, 330, rY + 5, { width: 220 });
  rY += 20;
});

doc.y = rY + 12;
drawSubHeader('Left Navigation Application Modules');
drawBullet('Executive Dashboard', 'Real-time overview of daily sales, profit margins, receivables, and category performance.');
drawBullet('POS Billing Terminal', 'High-speed cashier counter with SpeedX barcode scanner auto-detection.');
drawBullet('Customer Records', 'Directory of customers, lifetime spend totals, completed orders, and past receipt reprints.');
drawBullet('Product Inventory', 'Garment variant catalog (Size, Color, Cost, Price, Stock) with barcode generator.');
drawBullet('Purchases & Invoices', 'Receiving supplier consignments with Moving Weighted Average Cost (WAC) calculations.');
drawBullet('Customer Khata Ledger', 'Double-entry credit ledger, payment vouchers, and PDF/Excel statement exports.');
drawBullet('Expenses & Payroll', 'Daily petty cash logging, monthly store overhead bills, and staff salary register.');
drawBullet('Financial Analytics', 'Official Profit & Loss (P&L) statements and inventory stock valuation at cost.');
drawBullet('Settings & Hardware', 'Hardware printer tests (TSC/DTS), scanner diagnostics, and instant database backups.');

// ══════════════════════════════════════════════════════════════════════════
// PAGE 3: HARDWARE CONFIGURATION GUIDE
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
drawSectionHeader('2. Hardware Setup & Integration Guide', 'Direct Drivers');

drawParagraph(
  'Brand 4 Less includes native drivers for your store equipment. No third-party bridge software is required.'
);

// 1. TSC Printer Card
drawSubHeader('[A] TSC Brand Barcode Label Printer');
drawParagraph('Supported Models: TSC TE200, TTP-244 Pro, DA210, TC200, MB240 (TSPL Engine)');
drawBullet('Physical Setup', 'Connect power and plug the USB cable into your computer. Insert a roll of 50mm x 30mm (or 40mm x 25mm) sticky garment labels.');
drawBullet('Gap Calibration (Important)', 'Turn printer OFF. Press and HOLD the FEED button while turning power ON. Release when it feeds 2 labels. Solid green light = calibrated.');
drawBullet('Direct Printing', 'In Product Inventory, click "Print Barcode Labels" -> Click "[Direct Print (TSC)]" to send raw TSPL vector commands straight to the printer.');
drawBullet('Self-Test in App', 'Go to Settings -> Hardware tab -> Click "[Test TSC Label Printer]" to print a sample test sticker.');

doc.moveDown(0.4);

// 2. DTS Receipt Printer Card
drawSubHeader('[B] DTS Brand POS Thermal Receipt Printer');
drawParagraph('Supported Models: DTS POS-80, DTS POS-58, Epson ESC/POS Standard Thermal Printers');
drawBullet('Physical Setup', 'Plug USB into the computer and connect the RJ11 cable from your Cash Drawer into the printer port marked "DK". Insert an 80mm thermal paper roll.');
drawBullet('Checkout Printing', 'When a sale finishes in POS, click "[Direct Print (DTS Thermal)]". The printer prints the receipt in under 1 second, cuts the paper cleanly, and kicks open the cash drawer on Cash sales.');
drawBullet('Self-Test in App', 'In Settings -> Hardware tab -> Click "[Test DTS Receipt Printer]" to print a diagnostic test slip and open the cash drawer.');

doc.moveDown(0.4);

// 3. SpeedX Barcode Scanner Card
drawSubHeader('[C] SpeedX Barcode Scanner');
drawParagraph('Supported Models: SpeedX 1D Laser and 2D Barcode / QR Readers (USB HID Keyboard Wedge)');
drawBullet('Physical Setup', 'Plug the SpeedX USB cable into any free USB port on your Windows PC. It is ready for use in 3 seconds.');
drawBullet('Zero-Click Global Detection', 'You do NOT need to click on any search bar. Simply point the scanner at any garment tag from anywhere on the POS screen and pull the trigger.');
drawBullet('Automated Actions', 'The app detects the barcode in 20ms, sounds an audio confirmation BEEP, adds the exact variant to the cart, and displays a green confirmation banner.');

// ══════════════════════════════════════════════════════════════════════════
// PAGE 4: POS BILLING & CUSTOMERS
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
drawSectionHeader('3. POS Billing Terminal & Customers', 'Cashier Guide');

drawSubHeader('Cashier Keyboard Shortcuts:');
const t2Top = doc.y;
doc.rect(40, t2Top, 515, 18).fill(COLOR_PRIMARY);
doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('KEY SHORTCUT', 50, t2Top + 5);
doc.text('ACTION', 150, t2Top + 5);
doc.text('DESCRIPTION', 270, t2Top + 5);

const shortcuts = [
  { key: 'F1', action: 'Focus Search Box', desc: 'Selects search input to type product name, color, or manual code' },
  { key: 'F4', action: 'Collect Payment', desc: 'Opens checkout payment window when items are in active cart' },
  { key: 'F8', action: 'Hold Active Cart', desc: 'Saves current cart in memory when customer picks extra clothes' },
  { key: 'ESC', action: 'Cancel / Close Modal', desc: 'Closes active checkout popup, receipt preview, or discount modal' },
];

let sY = t2Top + 18;
shortcuts.forEach((s, idx) => {
  const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(40, sY, 515, 20).fillAndStroke(bg, COLOR_BORDER);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLOR_ACCENT).text(s.key, 50, sY + 5);
  doc.font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text(s.action, 150, sY + 5);
  doc.font('Helvetica').fillColor(COLOR_MUTED).text(s.desc, 270, sY + 5);
  sY += 20;
});

doc.y = sY + 12;
drawSubHeader('Step-by-Step POS Checkout Flow:');
drawBullet('1. Scan Items', 'Scan garment tags with the SpeedX Scanner or select product cards from the category grid.');
drawBullet('2. Customer Registration', 'Type the Customer Name and Mobile Phone (e.g. Usman Tariq, 03001234567). New customers are automatically enrolled in the customer directory upon checkout!');
drawBullet('3. Discounts (Optional)', 'Click "Add Discount" to apply a flat PKR amount or percentage deduction.');
drawBullet('4. Collect Payment', 'Press F4. Select Cash (system calculates change), Card, Bank Transfer (IBFT), Khata (Credit), or Split Payment.');
drawBullet('5. Thermal Receipt', 'Click "Confirm & Print Receipt" -> DTS thermal printer prints receipt and opens cash drawer.');

doc.moveDown(0.4);
drawSubHeader('Customer Records & Purchase History Module:');
drawParagraph(
  'Accessible via "Customer Records" in the left sidebar. The system maintains an aggregated lifecycle profile for every customer:'
);
drawBullet('Lifetime Purchase Tracking', 'View total completed store visits, total lifetime spend in PKR, and active Khata balance.');
drawBullet('Historical Invoice Drawer', 'Click "[History]" on any customer row to inspect all past sales bills and items purchased.');
drawBullet('1-Click Receipt Reprint', 'Click "[Reprint DTS Receipt]" on any past bill to reprint an exact copy on your thermal printer.');
drawBullet('Khata Credit Settlement', 'Record incoming customer credit payments, print signed vouchers, and export PDF/Excel statements.');

// ══════════════════════════════════════════════════════════════════════════
// PAGE 5: INVENTORY, EXPENSES, P&L & BACKUPS
// ══════════════════════════════════════════════════════════════════════════
doc.addPage();
drawSectionHeader('4. Inventory, Expenses, P&L & Backups', 'Management');

drawSubHeader('Product Inventory & Moving WAC Costing');
drawBullet('Variant Matrix', 'Manage garment items with multiple sizes (S, M, L, XL, 30, 32, 34) and colors with individual barcodes.');
drawBullet('Automatic Weighted Average Cost (WAC)', 'When receiving new shipments at fluctuating prices, the system recalculates true stock valuation automatically: WAC = (Old Stock Cost + New Shipment Cost) / Total Quantity.');
drawBullet('Barcode Sticker Printing', 'Generate 50x30mm retail price stickers with scannable Code-128 barcodes directly to your TSC printer.');

doc.moveDown(0.3);
drawSubHeader('Operating Expenses & Staff Salaries');
drawBullet('Daily Petty Cash', 'Record shop expenses (tea, customer refreshments, generator fuel, shopping bags) with instant daily totals.');
drawBullet('Monthly Overheads', 'Track major monthly expenses (Shop Rent, Electricity Bills, Internet) with billing month tracking.');
drawBullet('Staff Payroll Register', 'Register cashiers and sales staff with monthly salaries. Click [Disburse Salary] at month-end to auto-post payout entries.');

doc.moveDown(0.3);
drawSubHeader('Financial Analytics & Profit/Loss Statement');
drawBullet('Trading Profit Statement', 'Gross Sales - Customer Discounts = Net Revenue. Net Revenue - Cost of Goods Sold (COGS at Moving WAC) = Gross Trading Profit.');
drawBullet('Net Operating Profit', 'Gross Profit - Operating Expenses (Rent, Bills, Salaries, Petty Cash) = Net Take-Home Profit.');
drawBullet('Stock Valuation', 'Complete audit of total capital invested in inventory at cost vs gross realizable retail value.');
drawBullet('Excel Exports', 'Download official financial spreadsheet reports with one click.');

doc.moveDown(0.3);
drawSubHeader('Database Backups & Data Protection');
drawBullet('1-Second Hot Snapshot', 'Go to Settings -> Database Backup -> Click [Create Backup Now]. A complete transactional database snapshot is generated instantly.');
drawBullet('USB Flash Drive Copy', 'Click [Download] on any backup snapshot to copy the database file to a USB flash drive for safe offline storage.');

// ══════════════════════════════════════════════════════════════════════════
// FOOTER & PAGE NUMBERING (ALL PAGES)
// ══════════════════════════════════════════════════════════════════════════
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  if (i === 0) continue; // Skip cover page

  // Top header line
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94a3b8');
  doc.text('BRAND 4 LESS DESKTOP RETAIL SUITE - OFFICIAL USER MANUAL', 40, 20, { width: 515 });
  doc.text('CONFIDENTIAL & PROPRIETARY', 40, 20, { width: 515, align: 'right' });

  // Bottom footer line
  doc.rect(40, 805, 515, 0.5).stroke('#cbd5e1');
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
  doc.text('Brand 4 Less Retail Systems | Hardware Integration (TSC / DTS / SpeedX)', 40, 812);
  doc.text(`Page ${i + 1} of ${range.count}`, 40, 812, { width: 515, align: 'right' });
}

doc.end();

stream.on('finish', () => {
  console.log('✅ Clean, perfectly formatted PDF User Manual successfully generated at:', outputPath);
});
