import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/database/migrations.js';
import { seedDatabase } from '../server/database/seed.js';
import { getDb } from '../server/database/db.js';
import { ExpenseService } from '../server/services/expense.service.js';

/**
 * QA #6 — disburseDirectSalary must leave a payroll audit row and refuse to
 * pay the same employee twice for one month.
 */
describe('Direct salary disbursement', () => {
  let adminId: string;
  const mkEmployee = (salary = 30000) =>
    ExpenseService.createEmployee(
      {
        name: `Sal ${Math.random().toString(36).slice(2, 8)}`,
        phone: `03${Math.floor(100000000 + Math.random() * 899999999)}`,
        designation: 'Cashier',
        monthlySalary: salary,
        joiningDate: '2026-01-01',
      },
      adminId
    );

  beforeAll(() => {
    runMigrations();
    seedDatabase();
    adminId = (getDb().prepare("SELECT id FROM users WHERE role = 'ADMIN'").get() as any).id;
  });

  it('records a DISBURSED payroll row and a payroll-month-dated expense', () => {
    const emp = mkEmployee(40000);
    const res = ExpenseService.disburseDirectSalary(
      { staffId: emp.id, salaryMonth: '2026-07', baseSalary: 40000, bonusAmount: 2000, deductions: 500 },
      adminId
    );
    expect(res.netSalary).toBe(41500);
    expect(res.disbursementId).toBeTruthy();

    const db = getDb();
    const disb = db.prepare('SELECT * FROM salary_disbursements WHERE id = ?').get(res.disbursementId) as any;
    expect(disb.status).toBe('DISBURSED');
    expect(disb.month_year).toBe('2026-07');
    expect(disb.net_salary).toBe(41500);
    expect(disb.expense_id).toBe(res.expenseId);

    const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(res.expenseId) as any;
    expect(exp.amount).toBe(41500);
    expect(exp.expense_date).toBe('2026-07-01');
  });

  it('refuses a second disbursement for the same employee and month', () => {
    const emp = mkEmployee();
    ExpenseService.disburseDirectSalary({ staffId: emp.id, salaryMonth: '2026-07', baseSalary: 30000 }, adminId);
    expect(() =>
      ExpenseService.disburseDirectSalary({ staffId: emp.id, salaryMonth: '2026-07', baseSalary: 30000 }, adminId)
    ).toThrow(/already been paid/i);

    // A different month is still allowed.
    expect(() =>
      ExpenseService.disburseDirectSalary({ staffId: emp.id, salaryMonth: '2026-08', baseSalary: 30000 }, adminId)
    ).not.toThrow();

    const count = (
      getDb()
        .prepare('SELECT COUNT(*) as c FROM salary_disbursements WHERE employee_id = ?')
        .get(emp.id) as any
    ).c;
    expect(count).toBe(2);
  });

  it('defers to an existing generated payroll row instead of double-recording', () => {
    const emp = mkEmployee();
    ExpenseService.generateMonthlyPayroll('2026-09', adminId);
    expect(() =>
      ExpenseService.disburseDirectSalary({ staffId: emp.id, salaryMonth: '2026-09', baseSalary: 30000 }, adminId)
    ).toThrow(/already exists|approve that record/i);
  });

  it('validates input', () => {
    const emp = mkEmployee();
    expect(() =>
      ExpenseService.disburseDirectSalary({ staffId: emp.id, salaryMonth: '2026-13', baseSalary: 30000 }, adminId)
    ).toThrow(/YYYY-MM/);
    expect(() =>
      ExpenseService.disburseDirectSalary({ staffId: emp.id, salaryMonth: '2026-07', baseSalary: 1000, deductions: 5000 }, adminId)
    ).toThrow(/negative/i);
    expect(() =>
      ExpenseService.disburseDirectSalary(
        { staffId: emp.id, salaryMonth: '2026-07', baseSalary: 30000, paymentMethod: 'CARD' as any },
        adminId
      )
    ).toThrow(/cash or bank transfer/i);
    expect(() =>
      ExpenseService.disburseDirectSalary({ salaryMonth: '2026-07', baseSalary: 30000 }, adminId)
    ).toThrow(/select an employee/i);
  });

  it('getEmployees returns rows without throwing', () => {
    // Guards the users fallback branch, which previously selected a
    // non-existent users.phone column and crashed the payroll screen.
    expect(Array.isArray(ExpenseService.getEmployees())).toBe(true);
  });
});
