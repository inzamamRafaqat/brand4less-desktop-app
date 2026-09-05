import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { OrganizationService } from '../services/organization.service.js';
import { SchemaService } from '../services/schema.service.js';
import { ProductService } from '../services/product.service.js';
import { PosService } from '../services/pos.service.js';
import { ImportService } from '../services/import.service.js';
import { CustomerService } from '../services/customer.service.js';
import { SupplierService } from '../services/supplier.service.js';
import { ExpenseService } from '../services/expense.service.js';
import { ReportService } from '../services/report.service.js';
import { HardwareService } from '../services/hardware.service.js';
import { BackupService } from '../services/backup.service.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const result = AuthService.login(username, password);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async loginWithPin(req: Request, res: Response) {
    try {
      const { pin } = req.body;
      const result = AuthService.loginWithPin(pin);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async verifyAdminPin(req: Request, res: Response) {
    try {
      const { pin } = req.body;
      const isValid = AuthService.verifyAdminPin(pin);
      res.json({ success: true, isValid });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async me(req: any, res: Response) {
    res.json({ success: true, user: req.user });
  }

  static async getUsers(req: Request, res: Response) {
    const users = AuthService.getUsers();
    res.json({ success: true, users });
  }

  static async createUser(req: Request, res: Response) {
    try {
      const user = AuthService.createUser(req.body);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class OrganizationController {
  static async getProfile(req: Request, res: Response) {
    const org = OrganizationService.getProfile();
    res.json({ success: true, organization: org });
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const org = OrganizationService.updateProfile(req.body);
      res.json({ success: true, organization: org });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async switchIndustryPreset(req: Request, res: Response) {
    try {
      const { industry } = req.body;
      const org = OrganizationService.switchIndustryPreset(industry);
      res.json({ success: true, organization: org, message: `Industry preset switched to ${industry}` });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class SchemaController {
  static async getAttributes(req: Request, res: Response) {
    const attributes = SchemaService.getAttributes();
    res.json({ success: true, attributes });
  }

  static async createAttribute(req: Request, res: Response) {
    try {
      const attribute = SchemaService.createAttribute(req.body);
      res.json({ success: true, attribute });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateAttribute(req: Request, res: Response) {
    try {
      const attribute = SchemaService.updateAttribute(req.params.id, req.body);
      res.json({ success: true, attribute });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deleteAttribute(req: Request, res: Response) {
    try {
      SchemaService.deleteAttribute(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class ProductController {
  static async getCategories(req: Request, res: Response) {
    const categories = ProductService.getCategories();
    res.json({ success: true, categories });
  }

  static async createCategory(req: Request, res: Response) {
    try {
      const category = ProductService.createCategory(req.body);
      res.json({ success: true, category });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getProducts(req: Request, res: Response) {
    const { query, categoryId, page, limit } = req.query as any;
    const result = ProductService.getProducts({
      query,
      categoryId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    res.json({ success: true, ...result });
  }

  static async getProductById(req: Request, res: Response) {
    const product = ProductService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const product = ProductService.createProduct(req.body);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const product = ProductService.updateProduct(req.params.id, req.body);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async adjustStock(req: Request, res: Response) {
    try {
      const { variantId, quantityDelta, reason } = req.body;
      const variant = ProductService.adjustStock(variantId, quantityDelta, reason);
      res.json({ success: true, variant });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async downloadBarcodeLabelsPdf(req: Request, res: Response) {
    try {
      const { items, layout } = req.body;
      const pdfBuffer = await ProductService.generateBarcodeLabelsPdf(items, layout);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="barcode_labels.pdf"');
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export class PosController {
  static async searchPos(req: Request, res: Response) {
    const query = (req.query.query as string) || '';
    const variants = PosService.searchPosProducts(query);
    res.json({ success: true, variants });
  }

  static async checkout(req: any, res: Response) {
    try {
      const cashierId = req.user?.id || 'usr_cashier_1';
      const result = PosService.checkout({ ...req.body, cashierId });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getSales(req: Request, res: Response) {
    const { query, page, limit } = req.query as any;
    const result = PosService.getSales({
      query,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({ success: true, ...result });
  }
}

export class ImportController {
  static async analyzeImportFile(req: any, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No spreadsheet file uploaded' });
      const analysis = ImportService.analyzeSpreadsheet(req.file.buffer);
      res.json({ success: true, ...analysis });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async commitImport(req: any, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No spreadsheet file provided' });
      const mapping = JSON.parse(req.body.mapping || '{}');
      const result = ImportService.commitDynamicImport(req.file.buffer, mapping);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class CustomerController {
  static async getCustomers(req: Request, res: Response) {
    const query = (req.query.query as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const customers = CustomerService.getCustomers(query, limit);
    res.json({ success: true, customers });
  }

  static async getCustomerById(req: Request, res: Response) {
    const customer = CustomerService.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer });
  }

  static async createCustomer(req: Request, res: Response) {
    try {
      const customer = CustomerService.createCustomer(req.body);
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateCustomer(req: Request, res: Response) {
    try {
      const customer = CustomerService.updateCustomer(req.params.id, req.body);
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getCustomerPurchases(req: Request, res: Response) {
    const purchases = CustomerService.getCustomerPurchases(req.params.id);
    res.json({ success: true, purchases });
  }

  static async getLedger(req: Request, res: Response) {
    const result = CustomerService.getCustomerLedger(req.params.id);
    res.json({ success: true, ...result });
  }

  static async recordPayment(req: any, res: Response) {
    try {
      const result = CustomerService.recordPayment({
        ...req.body,
        customerId: req.params.id,
        createdBy: req.user?.fullName || 'Staff',
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class SupplierController {
  static async getSuppliers(req: Request, res: Response) {
    const suppliers = SupplierService.getSuppliers();
    res.json({ success: true, suppliers });
  }

  static async createSupplier(req: Request, res: Response) {
    try {
      const supplier = SupplierService.createSupplier(req.body);
      res.json({ success: true, supplier });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getPurchases(req: Request, res: Response) {
    const purchases = SupplierService.getPurchases();
    res.json({ success: true, purchases });
  }

  static async createPurchase(req: any, res: Response) {
    try {
      const result = SupplierService.createPurchase({
        ...req.body,
        createdBy: req.user?.fullName || 'Manager',
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class ExpenseController {
  static async getCategories(req: Request, res: Response) {
    const categories = ExpenseService.getCategories();
    res.json({ success: true, categories });
  }

  static async getExpenses(req: Request, res: Response) {
    const expenses = ExpenseService.getExpenses(req.query as any);
    res.json({ success: true, expenses });
  }

  static async createExpense(req: any, res: Response) {
    try {
      const expense = ExpenseService.createExpense({
        ...req.body,
        createdBy: req.user?.fullName || 'Staff',
      });
      res.json({ success: true, expense });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getMonthlySummary(req: Request, res: Response) {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const summary = ExpenseService.getMonthlySummary(month);
    res.json({ success: true, summary });
  }

  static async getEmployees(req: Request, res: Response) {
    const employees = ExpenseService.getEmployees();
    res.json({ success: true, employees });
  }

  static async createEmployee(req: Request, res: Response) {
    try {
      const employee = ExpenseService.createEmployee(req.body);
      res.json({ success: true, employee });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async disburseSalary(req: any, res: Response) {
    try {
      const result = ExpenseService.disburseSalary({
        ...req.body,
        createdBy: req.user?.fullName || 'Admin',
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export class ReportController {
  static async getDashboard(req: Request, res: Response) {
    const metrics = ReportService.getDashboardMetrics();
    res.json({ success: true, ...metrics });
  }

  static async getProfitAndLoss(req: Request, res: Response) {
    const { startDate, endDate } = req.query as any;
    const pnl = ReportService.getProfitAndLoss(startDate, endDate);
    res.json({ success: true, pnl });
  }

  static async getInventoryValuation(req: Request, res: Response) {
    const valuation = ReportService.getInventoryValuation();
    res.json({ success: true, ...valuation });
  }
}

export class HardwareController {
  static async getPrinters(req: Request, res: Response) {
    const printers = await HardwareService.getConnectedPrinters();
    res.json({ success: true, printers });
  }

  static async testTscPrinter(req: Request, res: Response) {
    try {
      const result = await HardwareService.testTscPrinter(req.body.printerName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async testDtsPrinter(req: Request, res: Response) {
    try {
      const result = await HardwareService.testDtsPrinter(req.body.printerName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async printTspl(req: Request, res: Response) {
    try {
      const { items, widthMm = 50, heightMm = 30, printerName } = req.body;
      const org = OrganizationService.getProfile();
      const target = printerName || org.label_printer_name || 'TSC';

      const tspl = HardwareService.generateTsplCommands(items, widthMm, heightMm, org.name);
      await HardwareService.sendRawToPrinter(target, tspl);
      res.json({ success: true, message: `Dispatched ${items.length} label(s) to ${target}` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async printEscPos(req: Request, res: Response) {
    try {
      const { sale, printerName, width = '80mm', autoCut = true, kickDrawer = true } = req.body;
      const org = OrganizationService.getProfile();
      const target = printerName || org.receipt_printer_name || 'DTS';

      const buffer = HardwareService.generateEscPosReceipt(sale, org, { width, autoCut, kickDrawer });
      await HardwareService.sendRawToPrinter(target, buffer);
      res.json({ success: true, message: `Dispatched ESC/POS receipt to ${target}` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export class BackupController {
  static async createBackup(req: Request, res: Response) {
    try {
      const label = req.body.label || 'manual';
      const backup = BackupService.createBackup(label);
      res.json({ success: true, backup });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listBackups(req: Request, res: Response) {
    const backups = BackupService.listBackups();
    res.json({ success: true, backups });
  }

  static async restoreBackup(req: Request, res: Response) {
    try {
      const { filename } = req.body;
      const result = BackupService.restoreBackup(filename);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
