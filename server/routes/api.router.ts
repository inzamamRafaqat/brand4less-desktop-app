import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config/index.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
} from '../middlewares/auth.middleware.js';
import {
  AuthController,
  OrganizationController,
  SchemaController,
  ProductController,
  PosController,
  ImportController,
  CustomerController,
  SupplierController,
  ExpenseController,
  ReportController,
  HardwareController,
  BackupController,
} from '../controllers/index.js';

export const apiRouter = Router();

// Configure Multer for memory buffers (import) and disk storage (receipts/logos)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    cb(null, CONFIG.UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── 1. AUTHENTICATION & USERS ─────────────────────────────────────────────
apiRouter.post('/auth/login', AuthController.login);
apiRouter.post('/auth/login-pin', AuthController.loginWithPin);
apiRouter.post('/auth/verify-admin-pin', authenticateToken, AuthController.verifyAdminPin);
apiRouter.get('/auth/me', authenticateToken, AuthController.me);
apiRouter.get('/auth/users', authenticateToken, requireRole('ADMIN'), AuthController.getUsers);
apiRouter.post('/auth/users', authenticateToken, requireRole('ADMIN'), AuthController.createUser);

// ── 2. ORGANIZATION & WHITE-LABEL BRANDING ────────────────────────────────
apiRouter.get('/organization', authenticateToken, OrganizationController.getProfile);
apiRouter.put('/organization', authenticateToken, requireRole('ADMIN'), OrganizationController.updateProfile);
apiRouter.post('/organization/switch-preset', authenticateToken, requireRole('ADMIN'), OrganizationController.switchIndustryPreset);

// ── 3. DYNAMIC CUSTOM ATTRIBUTES SCHEMA ───────────────────────────────────
apiRouter.get('/schema/attributes', authenticateToken, SchemaController.getAttributes);
apiRouter.post('/schema/attributes', authenticateToken, requirePermission('MANAGE_SCHEMA'), SchemaController.createAttribute);
apiRouter.put('/schema/attributes/:id', authenticateToken, requirePermission('MANAGE_SCHEMA'), SchemaController.updateAttribute);
apiRouter.delete('/schema/attributes/:id', authenticateToken, requirePermission('MANAGE_SCHEMA'), SchemaController.deleteAttribute);

// ── 4. CATEGORIES, PRODUCTS & VARIANTS ────────────────────────────────────
apiRouter.get('/categories', authenticateToken, ProductController.getCategories);
apiRouter.post('/categories', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.createCategory);
apiRouter.get('/products', authenticateToken, ProductController.getProducts);
apiRouter.get('/products/:id', authenticateToken, ProductController.getProductById);
apiRouter.post('/products', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.createProduct);
apiRouter.put('/products/:id', authenticateToken, requirePermission('MANAGE_PRODUCTS'), ProductController.updateProduct);
apiRouter.post('/inventory/adjust', authenticateToken, requirePermission('ADJUST_STOCK'), ProductController.adjustStock);
apiRouter.post('/products/labels/pdf', authenticateToken, ProductController.downloadBarcodeLabelsPdf);

// ── 5. DYNAMIC SPREADSHEET IMPORTER ───────────────────────────────────────
apiRouter.post('/import/analyze', authenticateToken, requirePermission('MANAGE_PRODUCTS'), memoryUpload.single('file'), ImportController.analyzeImportFile);
apiRouter.post('/import/commit', authenticateToken, requirePermission('MANAGE_PRODUCTS'), memoryUpload.single('file'), ImportController.commitImport);

// ── 6. POS & SALES ────────────────────────────────────────────────────────
apiRouter.get('/pos/search', authenticateToken, PosController.searchPos);
apiRouter.post('/pos/checkout', authenticateToken, requirePermission('POS_CHECKOUT'), PosController.checkout);
apiRouter.get('/sales', authenticateToken, requirePermission('VIEW_SALES'), PosController.getSales);

// ── 7. CUSTOMERS & KHATA ──────────────────────────────────────────────────
apiRouter.get('/customers', authenticateToken, requirePermission('VIEW_CUSTOMERS'), CustomerController.getCustomers);
apiRouter.get('/customers/:id', authenticateToken, requirePermission('VIEW_CUSTOMERS'), CustomerController.getCustomerById);
apiRouter.get('/customers/:id/purchases', authenticateToken, requirePermission('VIEW_CUSTOMERS'), CustomerController.getCustomerPurchases);
apiRouter.post('/customers', authenticateToken, requirePermission('MANAGE_CUSTOMERS'), CustomerController.createCustomer);
apiRouter.put('/customers/:id', authenticateToken, requirePermission('MANAGE_CUSTOMERS'), CustomerController.updateCustomer);
apiRouter.get('/customers/:id/ledger', authenticateToken, requirePermission('VIEW_CUSTOMERS'), CustomerController.getLedger);
apiRouter.post('/customers/:id/payments', authenticateToken, requirePermission('RECORD_KHATA_PAYMENT'), CustomerController.recordPayment);

// ── 8. SUPPLIERS & PURCHASES (WAC COSTING) ────────────────────────────────
apiRouter.get('/suppliers', authenticateToken, requirePermission('VIEW_SUPPLIERS'), SupplierController.getSuppliers);
apiRouter.post('/suppliers', authenticateToken, requirePermission('MANAGE_SUPPLIERS'), SupplierController.createSupplier);
apiRouter.get('/purchases', authenticateToken, requirePermission('VIEW_SUPPLIERS'), SupplierController.getPurchases);
apiRouter.post('/purchases', authenticateToken, requirePermission('CREATE_PURCHASES'), SupplierController.createPurchase);

// ── 9. EXPENSES & PAYROLL ─────────────────────────────────────────────────
apiRouter.get('/expenses/categories', authenticateToken, requirePermission('VIEW_EXPENSES'), ExpenseController.getCategories);
apiRouter.get('/expenses', authenticateToken, requirePermission('VIEW_EXPENSES'), ExpenseController.getExpenses);
apiRouter.post('/expenses', authenticateToken, requirePermission('MANAGE_EXPENSES'), ExpenseController.createExpense);
apiRouter.get('/expenses/monthly-summary', authenticateToken, requirePermission('VIEW_EXPENSES'), ExpenseController.getMonthlySummary);
apiRouter.get('/payroll/staff', authenticateToken, requirePermission('VIEW_SALARIES'), ExpenseController.getEmployees);
apiRouter.post('/payroll/staff', authenticateToken, requirePermission('MANAGE_USERS'), ExpenseController.createEmployee);
apiRouter.post('/payroll/disburse', authenticateToken, requirePermission('APPROVE_SALARIES'), ExpenseController.disburseSalary);

// ── 10. FINANCIAL ANALYTICS & P&L ─────────────────────────────────────────
apiRouter.get('/reports/dashboard', authenticateToken, ReportController.getDashboard);
apiRouter.get('/reports/pnl', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.getProfitAndLoss);
apiRouter.get('/reports/inventory-valuation', authenticateToken, requirePermission('VIEW_FINANCIAL_REPORTS'), ReportController.getInventoryValuation);

// ── 11. HARDWARE INTEGRATION (TSC, DTS, SPEEDX) ───────────────────────────
apiRouter.get('/hardware/printers', authenticateToken, HardwareController.getPrinters);
apiRouter.post('/hardware/test-tsc', authenticateToken, HardwareController.testTscPrinter);
apiRouter.post('/hardware/test-dts', authenticateToken, HardwareController.testDtsPrinter);
apiRouter.post('/hardware/print-tspl', authenticateToken, HardwareController.printTspl);
apiRouter.post('/hardware/print-escpos', authenticateToken, HardwareController.printEscPos);

// ── 12. DATABASE BACKUP & RESTORE ─────────────────────────────────────────
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

// File upload handler
apiRouter.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});
