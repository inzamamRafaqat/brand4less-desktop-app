import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config/index.js';
import { authenticateToken, requireRole, requirePermission } from '../middlewares/auth.middleware.js';
import {
  AuthController,
  ProductController,
  PosController,
  ReturnsController,
  KhataController,
  SupplierController,
  ExpenseController,
  ReportController,
  BackupController,
  HardwareController,
} from '../controllers/index.js';

// Configure Multer for Excel spreadsheets and receipt image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CONFIG.UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export const apiRouter = Router();

// ── 1. AUTHENTICATION & USERS ─────────────────────────────────────────────
apiRouter.post('/auth/login', AuthController.login);
apiRouter.post('/auth/login-pin', AuthController.loginWithPin);
apiRouter.post('/auth/verify-admin-pin', AuthController.verifyAdminPin);
apiRouter.get('/auth/me', authenticateToken, AuthController.me);
apiRouter.get('/auth/users', authenticateToken, requireRole('ADMIN', 'MANAGER'), AuthController.getUsers);
apiRouter.post('/auth/users', authenticateToken, requireRole('ADMIN'), AuthController.createUser);
apiRouter.put('/auth/users/:id', authenticateToken, requireRole('ADMIN'), AuthController.updateUser);
apiRouter.get('/settings', authenticateToken, AuthController.getSettings);
apiRouter.put('/settings', authenticateToken, requireRole('ADMIN'), AuthController.updateSettings);

// ── 2. PRODUCTS & INVENTORY ───────────────────────────────────────────────
apiRouter.get('/categories', authenticateToken, ProductController.getCategories);
apiRouter.post('/categories', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.createCategory);
apiRouter.get('/products', authenticateToken, ProductController.getProducts);
apiRouter.get('/products/pos-search', authenticateToken, ProductController.searchPos);
apiRouter.get('/products/low-stock', authenticateToken, ProductController.getLowStock);
apiRouter.get('/products/:id', authenticateToken, ProductController.getProductById);
apiRouter.post('/products', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.createProduct);
apiRouter.put('/products/:id', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.updateProduct);
apiRouter.delete('/products/:id', authenticateToken, requirePermission('DELETE_PRODUCTS'), ProductController.deleteProduct);
apiRouter.post('/inventory/adjust', authenticateToken, requirePermission('ADJUST_STOCK'), ProductController.adjustStock);

// Bulk Import
apiRouter.get('/products/import/template', ProductController.downloadTemplate);
apiRouter.post('/products/import/analyze', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.single('file'), ProductController.analyzeImportFile);
apiRouter.post('/products/import/preview', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.previewImport);
apiRouter.post('/products/import/error-report', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.downloadErrorReport);
apiRouter.post('/products/import/commit', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.commitImport);
apiRouter.post('/products/labels/pdf', authenticateToken, ProductController.downloadBarcodeLabelsPdf);

// File Upload endpoint
apiRouter.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// ── 3. POS & SALES ────────────────────────────────────────────────────────
apiRouter.post('/pos/checkout', authenticateToken, requirePermission('POS_CHECKOUT'), PosController.checkout);
apiRouter.get('/sales', authenticateToken, PosController.getSales);
apiRouter.get('/sales/:id', authenticateToken, PosController.getSaleById);
apiRouter.get('/sales/:id/receipt', authenticateToken, PosController.getReceipt);

// ── 4. RETURNS & EXCHANGES ────────────────────────────────────────────────
apiRouter.post('/returns', authenticateToken, requirePermission('PROCESS_RETURNS'), ReturnsController.processReturn);
apiRouter.post('/exchanges', authenticateToken, requirePermission('PROCESS_EXCHANGES'), ReturnsController.processExchange);
apiRouter.get('/returns', authenticateToken, ReturnsController.getReturns);
apiRouter.get('/returns/:id', authenticateToken, ReturnsController.getReturnById);

// ── 5. CUSTOMERS & KHATA ──────────────────────────────────────────────────
apiRouter.get('/customers', authenticateToken, KhataController.getCustomers);
apiRouter.get('/customers/:id', authenticateToken, KhataController.getCustomerById);
apiRouter.get('/customers/:id/purchases', authenticateToken, KhataController.getCustomerPurchases);
apiRouter.post('/customers', authenticateToken, requirePermission('MANAGE_CUSTOMERS'), KhataController.createCustomer);
apiRouter.put('/customers/:id', authenticateToken, requirePermission('MANAGE_CUSTOMERS'), KhataController.updateCustomer);
apiRouter.get('/customers/:id/ledger', authenticateToken, KhataController.getLedger);
apiRouter.post('/customers/:id/payments', authenticateToken, requirePermission('RECORD_KHATA_PAYMENT'), KhataController.recordPayment);
apiRouter.get('/customers/:id/export-excel', authenticateToken, KhataController.exportExcel);
apiRouter.get('/customers/:id/export-pdf', authenticateToken, KhataController.exportPdf);

// ── 6. SUPPLIERS & PURCHASES ──────────────────────────────────────────────
apiRouter.get('/suppliers', authenticateToken, SupplierController.getSuppliers);
apiRouter.get('/suppliers/:id', authenticateToken, SupplierController.getSupplierById);
apiRouter.post('/suppliers', authenticateToken, requirePermission('MANAGE_SUPPLIERS'), SupplierController.createSupplier);
apiRouter.put('/suppliers/:id', authenticateToken, requirePermission('MANAGE_SUPPLIERS'), SupplierController.updateSupplier);
apiRouter.get('/suppliers/:id/ledger', authenticateToken, SupplierController.getLedger);
apiRouter.post('/suppliers/:id/payments', authenticateToken, requirePermission('RECORD_SUPPLIER_PAYMENT'), SupplierController.recordPayment);
apiRouter.get('/purchases', authenticateToken, SupplierController.getPurchases);
apiRouter.get('/purchases/:id', authenticateToken, SupplierController.getPurchaseById);
apiRouter.post('/purchases', authenticateToken, requirePermission('CREATE_PURCHASES'), SupplierController.createPurchase);

// ── 7. EXPENSES & SALARIES ────────────────────────────────────────────────
apiRouter.get('/expenses/categories', authenticateToken, ExpenseController.getCategories);
apiRouter.post('/expenses/categories', authenticateToken, requirePermission('MANAGE_EXPENSES'), ExpenseController.createCategory);
apiRouter.get('/expenses/monthly-summary', authenticateToken, ExpenseController.getMonthlySummary);
apiRouter.get('/expenses/payroll/staff', authenticateToken, ExpenseController.getEmployees);
apiRouter.post('/expenses/payroll/staff', authenticateToken, ExpenseController.createEmployee);
apiRouter.post('/expenses/payroll/process', authenticateToken, ExpenseController.processPayroll);
apiRouter.get('/expenses', authenticateToken, requirePermission('VIEW_EXPENSES'), ExpenseController.getExpenses);
apiRouter.post('/expenses', authenticateToken, requirePermission('MANAGE_EXPENSES'), ExpenseController.createExpense);

apiRouter.get('/salaries/employees', authenticateToken, requirePermission('VIEW_SALARIES'), ExpenseController.getEmployees);
apiRouter.post('/salaries/employees', authenticateToken, requirePermission('MANAGE_USERS'), ExpenseController.createEmployee);
apiRouter.get('/salaries/disbursements', authenticateToken, requirePermission('VIEW_SALARIES'), ExpenseController.getPayroll);
apiRouter.post('/salaries/generate', authenticateToken, requirePermission('APPROVE_SALARIES'), ExpenseController.generatePayroll);
apiRouter.post('/salaries/disbursements/:id/approve', authenticateToken, requirePermission('APPROVE_SALARIES'), ExpenseController.approveSalary);

// ── 8. REPORTS & ANALYTICS ────────────────────────────────────────────────
apiRouter.get('/reports/dashboard', authenticateToken, ReportController.getDashboard);
apiRouter.get('/reports/profit-loss', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.getProfitAndLoss);
apiRouter.get('/reports/pnl', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.getProfitAndLoss);
apiRouter.get('/reports/sales', authenticateToken, ReportController.getSalesReport);
apiRouter.get('/reports/daily-sales', authenticateToken, ReportController.getSalesReport);
apiRouter.get('/reports/stock-movements', authenticateToken, requirePermission('VIEW_PRODUCTS'), ReportController.getStockMovements);
apiRouter.get('/reports/inventory-valuation', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.getInventoryValuation);
apiRouter.get('/reports/valuation', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.getInventoryValuation);
apiRouter.get('/reports/sales/export-excel', authenticateToken, ReportController.exportSalesExcel);
apiRouter.get('/reports/pnl/export-excel', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.exportSalesExcel);
apiRouter.get('/reports/audit-logs', authenticateToken, requirePermission('VIEW_AUDIT_LOGS'), ReportController.getAuditLogs);

// ── 9. BACKUP & RESTORE ───────────────────────────────────────────────────
apiRouter.post('/backups/create', authenticateToken, requirePermission('MANAGE_BACKUPS'), BackupController.createBackup);
apiRouter.get('/backups', authenticateToken, requirePermission('MANAGE_BACKUPS'), BackupController.listBackups);
apiRouter.post('/backups/restore', authenticateToken, requirePermission('MANAGE_BACKUPS'), BackupController.restoreBackup);

apiRouter.post('/backup/create', authenticateToken, requirePermission('MANAGE_BACKUPS'), BackupController.createBackup);
apiRouter.get('/backup/list', authenticateToken, requirePermission('MANAGE_BACKUPS'), BackupController.listBackups);
apiRouter.post('/backup/restore', authenticateToken, requirePermission('MANAGE_BACKUPS'), BackupController.restoreBackup);
apiRouter.get('/backup/download/:filename', (req, res) => {
  const filePath = path.join(CONFIG.BACKUPS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ success: false, message: 'Backup file not found' });
  }
});

// ── 10. HARDWARE INTEGRATION (TSC, DTS, SPEEDX) ───────────────────────────
apiRouter.get('/hardware/printers', authenticateToken, HardwareController.getPrinters);
apiRouter.post('/hardware/test-tsc', authenticateToken, HardwareController.testTscPrinter);
apiRouter.post('/hardware/test-dts', authenticateToken, HardwareController.testDtsPrinter);
apiRouter.post('/hardware/print-tspl', authenticateToken, HardwareController.printTspl);
apiRouter.post('/hardware/print-escpos', authenticateToken, HardwareController.printEscPos);
