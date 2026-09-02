import { getDb, runTransaction } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './audit.service.js';

export interface CreateExpenseInput {
  categoryId?: string;
  category?: string;
  categoryName?: string;
  title?: string;
  description?: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD';
  expenseDate?: string;
  receiptImageUrl?: string;
  notes?: string;
}

export interface CreateEmployeeInput {
  name: string;
  phone: string;
  cnic?: string;
  designation: string;
  monthlySalary: number;
  joiningDate?: string;
}

export class ExpenseService {
  // ── EXPENSE CATEGORIES ──────────────────────────────────────────────────
  static getExpenseCategories(): any[] {
    const db = getDb();
    return db.prepare(`
      SELECT ec.*, COUNT(e.id) as expense_count, COALESCE(SUM(e.amount), 0) as total_amount
      FROM expense_categories ec
      LEFT JOIN expenses e ON ec.id = e.category_id
      GROUP BY ec.id
      ORDER BY ec.name ASC
    `).all();
  }

  static createExpenseCategory(name: string, description?: string): any {
    const db = getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO expense_categories (id, name, description) VALUES (?, ?, ?)')
      .run(id, name.trim(), description || null);
    return db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id);
  }

  // ── EXPENSES ────────────────────────────────────────────────────────────
  static getExpenses(filters?: { categoryId?: string; startDate?: string; endDate?: string; monthYear?: string; page?: number; limit?: number }): any {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 100;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.categoryId) {
      whereClause += ' AND e.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters?.monthYear) {
      whereClause += " AND strftime('%Y-%m', e.expense_date) = ?";
      params.push(filters.monthYear);
    }
    if (filters?.startDate) {
      whereClause += ' AND e.expense_date >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      whereClause += ' AND e.expense_date <= ?';
      params.push(filters.endDate);
    }

    const count = db.prepare(`SELECT COUNT(*) as count FROM expenses e ${whereClause}`).get(...params) as { count: number };
    const totalAmount = db.prepare(`SELECT COALESCE(SUM(e.amount), 0) as sum FROM expenses e ${whereClause}`).get(...params) as { sum: number };

    const expenses = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name,
        u.full_name as user_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      JOIN users u ON e.user_id = u.id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      expenses,
      total: count.count,
      totalAmount: totalAmount.sum,
    };
  }

  /**
   * Retrieves monthly aggregated totals and category breakdown
   */
  static getMonthlyExpensesSummary(year?: string): any[] {
    const db = getDb();
    const targetYear = year || new Date().getFullYear().toString();

    const monthlyRows = db.prepare(`
      SELECT 
        strftime('%Y-%m', e.expense_date) as month_year,
        ec.name as category_name,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COUNT(e.id) as transaction_count
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE strftime('%Y', e.expense_date) = ?
      GROUP BY strftime('%Y-%m', e.expense_date), ec.name
      ORDER BY month_year DESC, total_amount DESC
    `).all(targetYear) as any[];

    // Group by month
    const map = new Map<string, { monthYear: string; totalAmount: number; count: number; categories: { name: string; amount: number; count: number }[] }>();

    monthlyRows.forEach((row) => {
      if (!map.has(row.month_year)) {
        map.set(row.month_year, {
          monthYear: row.month_year,
          totalAmount: 0,
          count: 0,
          categories: [],
        });
      }

      const item = map.get(row.month_year)!;
      item.totalAmount += Number(row.total_amount);
      item.count += Number(row.transaction_count);
      item.categories.push({
        name: row.category_name,
        amount: Number(row.total_amount),
        count: Number(row.transaction_count),
      });
    });

    return Array.from(map.values());
  }

  static createExpense(input: CreateExpenseInput, userId: string): any {
    const db = getDb();
    const id = uuidv4();

    if (input.amount <= 0) throw new Error('Expense amount must be greater than 0');

    // Resolve Category ID
    let catId = input.categoryId;
    const catName = input.category || input.categoryName;

    if (!catId && catName) {
      const existing = db.prepare('SELECT id FROM expense_categories WHERE name = ?').get(catName) as any;
      if (existing) {
        catId = existing.id;
      } else {
        catId = uuidv4();
        db.prepare('INSERT INTO expense_categories (id, name, description) VALUES (?, ?, ?)')
          .run(catId, catName.trim(), 'Auto-created category');
      }
    } else if (!catId) {
      const firstCat = db.prepare('SELECT id FROM expense_categories LIMIT 1').get() as any;
      if (firstCat) {
        catId = firstCat.id;
      } else {
        catId = uuidv4();
        db.prepare('INSERT INTO expense_categories (id, name, description) VALUES (?, ?, ?)')
          .run(catId, 'General Store Expense', 'Default expense category');
      }
    }

    const title = input.title || input.description || catName || 'Store Expense';

    db.prepare(`
      INSERT INTO expenses (id, category_id, title, amount, payment_method, expense_date, receipt_image_url, notes, user_id)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?)
    `).run(
      id,
      catId,
      title.trim(),
      input.amount,
      input.paymentMethod || 'CASH',
      input.expenseDate || null,
      input.receiptImageUrl || null,
      input.notes || input.description || null,
      userId
    );

    AuditService.log({
      userId,
      action: 'CREATE_EXPENSE',
      entityType: 'EXPENSE',
      entityId: id,
      newValue: { ...input, categoryId: catId, title },
    });

    return db.prepare(`
      SELECT e.*, ec.name as category_name, u.full_name as user_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `).get(id);
  }

  // ── STAFF EMPLOYEES & DIRECT SALARY DISBURSEMENT ──────────────────────────
  static getEmployees(): any[] {
    const db = getDb();
    // Return staff employees joined with users
    const employees = db.prepare(`
      SELECT 
        e.id,
        e.name,
        e.phone,
        e.cnic,
        e.designation,
        e.monthly_salary as base_salary,
        e.is_active,
        u.username
      FROM staff_employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.is_active DESC, e.name ASC
    `).all() as any[];

    if (employees.length === 0) {
      // Return active users as fallback
      const users = db.prepare(`
        SELECT id, username as name, username, full_name, phone, role as designation, 35000 as base_salary, is_active
        FROM users
        WHERE is_active = 1
      `).all() as any[];
      return users;
    }

    return employees;
  }

  static createEmployee(input: CreateEmployeeInput, userId: string): any {
    const db = getDb();
    const id = uuidv4();
    const salary = Number(input.monthlySalary || (input as any).baseSalary || (input as any).salary || 35000);

    db.prepare(`
      INSERT INTO staff_employees (id, name, phone, cnic, designation, monthly_salary, joining_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE), 1)
    `).run(
      id,
      input.name.trim(),
      input.phone.trim(),
      input.cnic?.trim() || null,
      (input.designation || 'Staff').trim(),
      salary,
      input.joiningDate || null
    );

    AuditService.log({
      userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      newValue: { ...input, monthlySalary: salary },
    });

    return db.prepare('SELECT * FROM staff_employees WHERE id = ?').get(id);
  }

  static getSalaryDisbursements(monthYear?: string): any[] {
    const db = getDb();
    let query = `
      SELECT 
        sd.*,
        e.name as employee_name,
        e.phone as employee_phone,
        e.designation,
        u.full_name as approver_name
      FROM salary_disbursements sd
      JOIN staff_employees e ON sd.employee_id = e.id
      LEFT JOIN users u ON sd.approved_by = u.id
    `;
    const params: any[] = [];

    if (monthYear) {
      query += ' WHERE sd.month_year = ?';
      params.push(monthYear);
    }

    query += ' ORDER BY sd.created_at DESC';
    return db.prepare(query).all(...params);
  }

  static generateMonthlyPayroll(monthYear: string, userId: string): any {
    return runTransaction((db) => {
      const activeEmployees = db.prepare('SELECT * FROM staff_employees WHERE is_active = 1').all() as any[];
      if (activeEmployees.length === 0) throw new Error('No active employees found');

      const insertStmt = db.prepare(`
        INSERT INTO salary_disbursements (
          id, employee_id, month_year, base_salary, bonus, deductions, net_salary, payment_method, status
        ) VALUES (?, ?, ?, ?, 0.0, 0.0, ?, 'CASH', 'PENDING')
      `);

      const checkExisting = db.prepare('SELECT id FROM salary_disbursements WHERE employee_id = ? AND month_year = ?');

      let generatedCount = 0;
      for (const emp of activeEmployees) {
        const existing = checkExisting.get(emp.id, monthYear);
        if (!existing) {
          insertStmt.run(uuidv4(), emp.id, monthYear, emp.monthly_salary, emp.monthly_salary);
          generatedCount++;
        }
      }

      AuditService.log({
        userId,
        action: 'GENERATE_PAYROLL',
        entityType: 'SALARY',
        newValue: { monthYear, generatedCount },
      });

      return { monthYear, generatedCount };
    });
  }

  static approveSalary(
    disbursementId: string,
    bonus = 0,
    deductions = 0,
    paymentMethod: 'CASH' | 'BANK_TRANSFER' = 'CASH',
    userId: string
  ): any {
    return runTransaction((db) => {
      const disb = db.prepare(`
        SELECT sd.*, e.name as employee_name 
        FROM salary_disbursements sd
        JOIN staff_employees e ON sd.employee_id = e.id
        WHERE sd.id = ?
      `).get(disbursementId) as any;

      if (!disb) throw new Error('Salary record not found');
      if (disb.status === 'DISBURSED') throw new Error('Salary already disbursed');

      const netSalary = disb.base_salary + bonus - deductions;
      if (netSalary < 0) throw new Error('Net salary cannot be negative');

      // Auto-post to Expenses under 'Staff Salaries' category
      let salaryCat = db.prepare("SELECT id FROM expense_categories WHERE name LIKE '%Salary%' OR name LIKE '%Salaries%'").get() as { id: string } | undefined;
      if (!salaryCat) {
        const catId = uuidv4();
        db.prepare("INSERT INTO expense_categories (id, name, description) VALUES (?, 'Staff Salaries & Payroll', 'Staff Salaries')").run(catId);
        salaryCat = { id: catId };
      }

      const expenseId = uuidv4();
      const expenseTitle = `Salary Disbursement: ${disb.employee_name} (${disb.month_year})`;
      db.prepare(`
        INSERT INTO expenses (id, category_id, title, amount, payment_method, expense_date, notes, user_id)
        VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?, ?)
      `).run(
        expenseId,
        salaryCat.id,
        expenseTitle,
        netSalary,
        paymentMethod,
        `Auto-posted salary for ${disb.month_year}. Base: PKR ${disb.base_salary}, Bonus: PKR ${bonus}, Deductions: PKR ${deductions}`,
        userId
      );

      db.prepare(`
        UPDATE salary_disbursements 
        SET bonus = ?, deductions = ?, net_salary = ?, payment_method = ?, status = 'DISBURSED', approved_by = ?, expense_id = ?, disbursed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(bonus, deductions, netSalary, paymentMethod, userId, expenseId, disbursementId);

      AuditService.log({
        userId,
        action: 'APPROVE_SALARY',
        entityType: 'SALARY',
        entityId: disbursementId,
        newValue: { bonus, deductions, netSalary, paymentMethod },
      });

      return {
        ...disb,
        bonus,
        deductions,
        netSalary,
        paymentMethod,
        status: 'DISBURSED',
        expenseId,
      };
    });
  }

  static disburseDirectSalary(
    input: {
      staffId?: string;
      employeeId?: string;
      salaryMonth: string;
      baseSalary: number;
      bonusAmount?: number;
      deductions?: number;
      paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CARD';
      notes?: string;
    },
    userId: string
  ): any {
    return runTransaction((db) => {
      const bonus = input.bonusAmount || 0;
      const deduct = input.deductions || 0;
      const netSalary = input.baseSalary + bonus - deduct;
      const empId = input.staffId || input.employeeId || uuidv4();

      // Check / Create Salary Category in Expenses
      let salaryCat = db.prepare("SELECT id FROM expense_categories WHERE name LIKE '%Salary%' OR name LIKE '%Salaries%' OR name LIKE '%Payroll%'").get() as { id: string } | undefined;
      if (!salaryCat) {
        const catId = uuidv4();
        db.prepare("INSERT INTO expense_categories (id, name, description) VALUES (?, 'Staff Salaries & Payroll', 'Monthly staff salaries')")
          .run(catId);
        salaryCat = { id: catId };
      }

      // Check if employee exists or create
      const emp = db.prepare('SELECT name FROM staff_employees WHERE id = ?').get(empId) as any;
      const empName = emp ? emp.name : 'Staff Member';

      // Record Expense
      const expenseId = uuidv4();
      const expenseTitle = `Salary: ${empName} (${input.salaryMonth})`;
      db.prepare(`
        INSERT INTO expenses (id, category_id, title, amount, payment_method, expense_date, notes, user_id)
        VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?, ?)
      `).run(
        expenseId,
        salaryCat.id,
        expenseTitle,
        netSalary,
        input.paymentMethod || 'CASH',
        `Monthly salary for ${input.salaryMonth}. Base: PKR ${input.baseSalary}, Bonus: PKR ${bonus}, Deductions: PKR ${deduct}`,
        userId
      );

      return {
        success: true,
        expenseId,
        netSalary,
        monthYear: input.salaryMonth,
      };
    });
  }
}
