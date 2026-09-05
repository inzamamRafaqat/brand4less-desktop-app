import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';

export class ExpenseService {
  static getCategories() {
    return db.prepare('SELECT * FROM expense_categories ORDER BY type ASC, name ASC').all();
  }

  static getExpenses(options: { startDate?: string; endDate?: string; categoryId?: string; type?: 'DAILY' | 'MONTHLY' } = {}) {
    let sql = `
      SELECT e.*, c.name as category_name, c.type as category_type
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options.startDate) {
      sql += ' AND e.expense_date >= ?';
      params.push(options.startDate);
    }
    if (options.endDate) {
      sql += ' AND e.expense_date <= ?';
      params.push(options.endDate);
    }
    if (options.categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(options.categoryId);
    }
    if (options.type) {
      sql += ' AND c.type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    return db.prepare(sql).all(...params);
  }

  static createExpense(data: {
    categoryId: string;
    title: string;
    amount: number;
    expenseDate?: string;
    billingMonth?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    receiptImageUrl?: string;
    notes?: string;
    createdBy?: string;
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const expenseDate = data.expenseDate || now.slice(0, 10);

    db.prepare(`
      INSERT INTO expenses (
        id, category_id, title, amount, expense_date, billing_month,
        payment_method, reference_number, receipt_image_url, notes,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.categoryId, data.title.trim(), Number(data.amount || 0),
      expenseDate, data.billingMonth || null, data.paymentMethod || 'CASH',
      data.referenceNumber || null, data.receiptImageUrl || null,
      data.notes || null, data.createdBy || 'Staff', now
    );

    return db.prepare(`
      SELECT e.*, c.name as category_name, c.type as category_type
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      WHERE e.id = ?
    `).get(id);
  }

  static getMonthlySummary(month: string) {
    // month in format YYYY-MM
    const rows = db.prepare(`
      SELECT 
        c.name as category_name,
        c.type as category_type,
        COUNT(e.id) as count,
        COALESCE(SUM(e.amount), 0) as total_amount
      FROM expense_categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND (e.billing_month = ? OR e.expense_date LIKE ?)
      GROUP BY c.id
      ORDER BY total_amount DESC
    `).all(month, `${month}%`);

    return rows;
  }

  // ── STAFF PAYROLL & SALARIES ────────────────────────────────────────────
  static getEmployees() {
    return db.prepare(`
      SELECT e.*, COUNT(d.id) as disbursements_count, MAX(d.disbursed_at) as last_disbursed_at
      FROM payroll_employees e
      LEFT JOIN payroll_disbursements d ON d.employee_id = e.id
      GROUP BY e.id
      ORDER BY e.full_name ASC
    `).all();
  }

  static createEmployee(data: {
    fullName: string;
    roleTitle: string;
    phone?: string;
    cnic?: string;
    baseSalary: number;
    joinedDate?: string;
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payroll_employees (
        id, full_name, role_title, phone, cnic, base_salary,
        is_active, joined_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, data.fullName.trim(), data.roleTitle.trim(),
      data.phone || null, data.cnic || null,
      Number(data.baseSalary || 30000), data.joinedDate || now.slice(0, 10), now
    );

    return db.prepare('SELECT * FROM payroll_employees WHERE id = ?').get(id);
  }

  static disburseSalary(data: {
    employeeId: string;
    billingMonth: string;
    bonusAmount?: number;
    deductionAmount?: number;
    paymentMethod?: string;
    notes?: string;
    createdBy?: string;
  }) {
    const emp = db.prepare('SELECT * FROM payroll_employees WHERE id = ?').get(data.employeeId) as any;
    if (!emp) throw new Error('Employee not found');

    const bonus = Number(data.bonusAmount || 0);
    const deduction = Number(data.deductionAmount || 0);
    const netPaid = Math.round((emp.base_salary + bonus) - deduction);
    const now = new Date().toISOString();
    const disbId = uuidv4();

    return db.transaction(() => {
      // 1. Insert Payroll Disbursement
      db.prepare(`
        INSERT INTO payroll_disbursements (
          id, employee_id, billing_month, base_salary, bonus_amount,
          deduction_amount, net_paid, payment_method, disbursed_at,
          notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        disbId, data.employeeId, data.billingMonth, emp.base_salary,
        bonus, deduction, netPaid, data.paymentMethod || 'CASH',
        now, data.notes || null, data.createdBy || 'Admin'
      );

      // 2. Auto-post to Expenses under Staff Salaries category
      let salaryCat = db.prepare("SELECT id FROM expense_categories WHERE name LIKE '%Salary%' OR name LIKE '%Payroll%' LIMIT 1").get() as any;
      const catId = salaryCat ? salaryCat.id : 'exp_cat_6';

      db.prepare(`
        INSERT INTO expenses (
          id, category_id, title, amount, expense_date, billing_month,
          payment_method, reference_number, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), catId, `Salary Payout: ${emp.full_name} (${data.billingMonth})`,
        netPaid, now.slice(0, 10), data.billingMonth, data.paymentMethod || 'CASH',
        disbId, `Base: Rs. ${emp.base_salary}, Bonus: Rs. ${bonus}, Deduct: Rs. ${deduction}`,
        data.createdBy || 'Admin', now
      );

      return {
        success: true,
        disbursementId: disbId,
        netPaid,
      };
    })();
  }
}
