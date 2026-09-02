import { Request, Response } from 'express';
import path from 'path';
import { routeParam } from '../utils/http.js';
import { clientMessage } from '../utils/errors.js';
import { AuthService } from '../services/auth.service.js';
import { ProductService } from '../services/product.service.js';
import { ImportService } from '../services/import.service.js';
import { PosService } from '../services/pos.service.js';
import { ReturnsService } from '../services/returns.service.js';
import { KhataService } from '../services/khata.service.js';
import { SupplierService } from '../services/supplier.service.js';
import { ExpenseService } from '../services/expense.service.js';
import { ReportService } from '../services/report.service.js';
import { BackupService } from '../services/backup.service.js';
import { AuditService } from '../services/audit.service.js';
import { HardwareService } from '../services/hardware.service.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const result = AuthService.login(username, password);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async loginWithPin(req: Request, res: Response): Promise<void> {
    try {
      const { pin } = req.body;
      const result = AuthService.loginWithPin(pin);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async verifyAdminPin(req: Request, res: Response): Promise<void> {
    try {
      const { pin } = req.body;
      const isValid = AuthService.verifyAdminPin(pin);
      res.json({ success: true, valid: isValid });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    res.json({ success: true, user: req.user });
  }

  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = AuthService.getUsers();
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.createUser(req.body, req.user!.id);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.updateUser(routeParam(req.params.id), req.body, req.user!.id);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = AuthService.getSettings();
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = AuthService.updateSettings(req.body, req.user!.id);
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class ProductController {
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = ProductService.getCategories();
      res.json({ success: true, categories });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = ProductService.createCategory(req.body);
      res.json({ success: true, category });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { query, categoryId, origin, page, limit } = req.query;
      const result = ProductService.getProducts({
        query: query as string,
        categoryId: categoryId as string,
        origin: origin as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const product = ProductService.getProductById(routeParam(req.params.id));
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = ProductService.createProductWithVariants(req.body, req.user!.id);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = ProductService.updateProduct(routeParam(req.params.id), req.body, req.user!.id);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      ProductService.deleteProduct(routeParam(req.params.id), req.user!.id);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async searchPos(req: Request, res: Response): Promise<void> {
    try {
      const { q, categoryId } = req.query;
      const variants = ProductService.searchVariantsForPos(q as string || '', categoryId as string || '');
      res.json({ success: true, variants });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { variantId, movementType, quantityChange, notes } = req.body;
      const result = ProductService.adjustStock(variantId, movementType, quantityChange, notes, req.user!.id);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getLowStock(req: Request, res: Response): Promise<void> {
    try {
      const items = ProductService.getLowStockVariants();
      res.json({ success: true, items });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  // Bulk Import
  static async analyzeImportFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file.' });
        return;
      }
      const result = await ImportService.analyzeFile(req.file.path);
      res.json({ success: true, ...result, filePath: req.file.path });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async previewImport(req: Request, res: Response): Promise<void> {
    try {
      const { filePath, mapping } = req.body;
      const result = await ImportService.previewAndValidate(filePath, mapping);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async downloadTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templatePath = path.join(process.cwd(), 'Brand4Less_Product_Import_Template.xlsx');
      res.download(templatePath, 'Brand4Less_Product_Import_Template.xlsx');
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async downloadErrorReport(req: Request, res: Response): Promise<void> {
    try {
      const { previewRows } = req.body;
      const buffer = await ImportService.generateErrorReport(previewRows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="import_errors.xlsx"');
      res.send(buffer);
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async commitImport(req: Request, res: Response): Promise<void> {
    try {
      const { filePath, mapping } = req.body;
      const result = await ImportService.commitBulkImport({ filePath, mapping }, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async downloadBarcodeLabelsPdf(req: Request, res: Response): Promise<void> {
    try {
      const { items, layout } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'No items provided for barcode generation' });
        return;
      }
      const buffer = await ProductService.generateBarcodeLabelsPdf(items, layout || 'A4_SHEET');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="brand4less_barcode_labels.pdf"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class PosController {
  static async checkout(req: Request, res: Response): Promise<void> {
    try {
      const sale = PosService.checkout(req.body, req.user!.id);
      res.json({ success: true, sale });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getSaleById(req: Request, res: Response): Promise<void> {
    try {
      const sale = PosService.getSaleById(routeParam(req.params.id));
      if (!sale) {
        res.status(404).json({ success: false, message: 'Sale not found' });
        return;
      }
      res.json({ success: true, sale });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getSales(req: Request, res: Response): Promise<void> {
    try {
      const { query, paymentMethod, paymentStatus, startDate, endDate, page, limit } = req.query;
      const result = PosService.getSales({
        query: query as string,
        paymentMethod: paymentMethod as string,
        paymentStatus: paymentStatus as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const receipt = await PosService.getReceiptPayload(routeParam(req.params.id));
      res.json({ success: true, receipt });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class ReturnsController {
  static async processReturn(req: Request, res: Response): Promise<void> {
    try {
      const result = ReturnsService.processReturn(req.body, req.user!.id);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async processExchange(req: Request, res: Response): Promise<void> {
    try {
      const result = ReturnsService.processExchange(req.body, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getReturns(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query;
      const result = ReturnsService.getReturns({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getReturnById(req: Request, res: Response): Promise<void> {
    try {
      const record = ReturnsService.getReturnById(routeParam(req.params.id));
      if (!record) {
        res.status(404).json({ success: false, message: 'Return record not found' });
        return;
      }
      res.json({ success: true, return: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class KhataController {
  static async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { query, hasBalance, page, limit } = req.query;
      const result = KhataService.getCustomers({
        query: query as string,
        hasBalance: hasBalance === 'true',
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const customer = KhataService.getCustomerById(routeParam(req.params.id));
      if (!customer) {
        res.status(404).json({ success: false, message: 'Customer not found' });
        return;
      }
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customer = KhataService.createCustomer(req.body, req.user!.id);
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customer = KhataService.updateCustomer(routeParam(req.params.id), req.body, req.user!.id);
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getCustomerPurchases(req: Request, res: Response): Promise<void> {
    try {
      const purchases = KhataService.getCustomerPurchases(routeParam(req.params.id));
      res.json({ success: true, purchases });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getLedger(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const result = KhataService.getCustomerLedger(routeParam(req.params.id), startDate as string, endDate as string);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, paymentMethod, notes } = req.body;
      const result = KhataService.recordPayment(routeParam(req.params.id), amount, paymentMethod, notes, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async exportExcel(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const buffer = await KhataService.exportStatementExcel(routeParam(req.params.id), startDate as string, endDate as string);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="khata_statement.xlsx"');
      res.send(buffer);
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async exportPdf(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const buffer = await KhataService.exportStatementPdf(routeParam(req.params.id), startDate as string, endDate as string);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="khata_statement.pdf"');
      res.send(buffer);
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class SupplierController {
  static async getSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const { query, page, limit } = req.query;
      const result = SupplierService.getSuppliers({
        query: query as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getSupplierById(req: Request, res: Response): Promise<void> {
    try {
      const supplier = SupplierService.getSupplierById(routeParam(req.params.id));
      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }
      res.json({ success: true, supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      const supplier = SupplierService.createSupplier(req.body, req.user!.id);
      res.json({ success: true, supplier });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async updateSupplier(req: Request, res: Response): Promise<void> {
    try {
      const supplier = SupplierService.updateSupplier(routeParam(req.params.id), req.body, req.user!.id);
      res.json({ success: true, supplier });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createPurchase(req: Request, res: Response): Promise<void> {
    try {
      const purchase = SupplierService.createPurchase(req.body, req.user!.id);
      res.json({ success: true, purchase });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getPurchases(req: Request, res: Response): Promise<void> {
    try {
      const { query, supplierId, page, limit } = req.query;
      const result = SupplierService.getPurchases({
        query: query as string,
        supplierId: supplierId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getPurchaseById(req: Request, res: Response): Promise<void> {
    try {
      const purchase = SupplierService.getPurchaseById(routeParam(req.params.id));
      if (!purchase) {
        res.status(404).json({ success: false, message: 'Purchase not found' });
        return;
      }
      res.json({ success: true, purchase });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getLedger(req: Request, res: Response): Promise<void> {
    try {
      const result = SupplierService.getSupplierLedger(routeParam(req.params.id));
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, paymentMethod, notes } = req.body;
      const result = SupplierService.recordPayment(routeParam(req.params.id), amount, paymentMethod, notes, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class ExpenseController {
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = ExpenseService.getExpenseCategories();
      res.json({ success: true, categories });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = ExpenseService.createExpenseCategory(req.body.name, req.body.description);
      res.json({ success: true, category });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getExpenses(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, startDate, endDate, page, limit } = req.query;
      const result = ExpenseService.getExpenses({
        categoryId: categoryId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const expense = ExpenseService.createExpense(req.body, req.user!.id);
      res.json({ success: true, expense });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const employees = ExpenseService.getEmployees();
      res.json({ success: true, employees });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const employee = ExpenseService.createEmployee(req.body, req.user!.id);
      res.json({ success: true, employee });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getPayroll(req: Request, res: Response): Promise<void> {
    try {
      const disbursements = ExpenseService.getSalaryDisbursements(req.query.monthYear as string);
      res.json({ success: true, disbursements });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async generatePayroll(req: Request, res: Response): Promise<void> {
    try {
      const result = ExpenseService.generateMonthlyPayroll(req.body.monthYear, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getMonthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = ExpenseService.getMonthlyExpensesSummary(req.query.year as string);
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async processPayroll(req: Request, res: Response): Promise<void> {
    try {
      const result = ExpenseService.disburseDirectSalary(req.body, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async approveSalary(req: Request, res: Response): Promise<void> {
    try {
      const { bonus, deductions, paymentMethod } = req.body;
      const result = ExpenseService.approveSalary(routeParam(req.params.id), bonus, deductions, paymentMethod, req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class ReportController {
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const data = ReportService.getDashboardSummary();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getProfitAndLoss(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const data = ReportService.getProfitAndLoss(startDate as string, endDate as string);
      res.json({ success: true, pnl: data, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getSalesReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, paymentMethod, cashierId, page, limit } = req.query;
      const result = ReportService.getSalesReport({
        startDate: startDate as string,
        endDate: endDate as string,
        paymentMethod: paymentMethod as string,
        cashierId: cashierId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, sales: result.sales, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getStockMovements(req: Request, res: Response): Promise<void> {
    try {
      const { variantId, movementType, startDate, endDate, page, limit } = req.query;
      const result = ReportService.getStockMovements({
        variantId: variantId as string,
        movementType: movementType as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getInventoryValuation(req: Request, res: Response): Promise<void> {
    try {
      const data = ReportService.getInventoryValuation();
      res.json({ success: true, valuation: data, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async exportSalesExcel(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const buffer = await ReportService.exportSalesExcel(startDate as string, endDate as string);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
      res.send(buffer);
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }

  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { action, entityType, limit, offset } = req.query;
      const logs = AuditService.getLogs({
        action: action as string,
        entityType: entityType as string,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class BackupController {
  static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const backup = BackupService.createBackup(req.body.label);
      res.json({ success: true, backup });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const backups = BackupService.listBackups();
      res.json({ success: true, backups });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      BackupService.restoreBackup(req.body.filename, req.user!.id);
      res.json({ success: true, message: `Database successfully restored from ${req.body.filename}` });
    } catch (err: any) {
      res.status(400).json({ success: false, message: clientMessage(err) });
    }
  }
}

export class HardwareController {
  static async getPrinters(req: Request, res: Response): Promise<void> {
    try {
      const printers = await HardwareService.getConnectedPrinters();
      res.json({ success: true, printers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async testTscPrinter(req: Request, res: Response): Promise<void> {
    try {
      const { printerName } = req.body;
      const result = await HardwareService.testTscPrinter(printerName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async testDtsPrinter(req: Request, res: Response): Promise<void> {
    try {
      const { printerName } = req.body;
      const result = await HardwareService.testDtsPrinter(printerName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async printTspl(req: Request, res: Response): Promise<void> {
    try {
      const { items, printerName, widthMm, heightMm } = req.body;
      const tspl = HardwareService.generateTsplCommands(items, { widthMm, heightMm });
      if (printerName) {
        await HardwareService.sendRawToPrinter(printerName, tspl);
      }
      res.json({ success: true, tspl, message: 'TSPL command dispatched to TSC printer' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }

  static async printEscPos(req: Request, res: Response): Promise<void> {
    try {
      const { sale, printerName, width, autoCut, kickDrawer } = req.body;
      const buffer = HardwareService.generateEscPosReceipt(sale, { width, autoCut, kickDrawer });
      if (printerName) {
        await HardwareService.sendRawToPrinter(printerName, buffer);
      }
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, message: clientMessage(err) });
    }
  }
}
