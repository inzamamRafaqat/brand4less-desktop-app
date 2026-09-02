import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  Users,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  Building2,
  FileSpreadsheet,
  TrendingDown,
  Clock,
  Sparkles,
  Layers,
  Banknote,
  Percent,
  Check,
  UserPlus,
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const [payrollStaff, setPayrollStaff] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DAILY_EXPENSES' | 'MONTHLY_EXPENSES' | 'STAFF_PAYROLL'>('DAILY_EXPENSES');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Modals
  const [isAddDailyExpenseOpen, setIsAddDailyExpenseOpen] = useState(false);
  const [isAddMonthlyExpenseOpen, setIsAddMonthlyExpenseOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isPayStaffOpen, setIsPayStaffOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // New Daily Expense Form
  const [newDailyExpense, setNewDailyExpense] = useState({
    category: 'Tea, Lunch & Refreshments',
    amount: 0,
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CARD',
    expenseDate: new Date().toISOString().slice(0, 10),
    title: '',
    notes: '',
  });

  // New Monthly Expense Form
  const [newMonthlyExpense, setNewMonthlyExpense] = useState({
    monthYear: new Date().toISOString().slice(0, 7), // YYYY-MM
    category: 'Shop Rent & Utilities',
    amount: 0,
    paymentMethod: 'BANK_TRANSFER' as 'CASH' | 'BANK_TRANSFER' | 'CARD',
    title: '',
    notes: '',
  });

  // New Staff Form
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    cnic: '',
    designation: 'Sales Cashier',
    monthlySalary: 35000,
    joiningDate: new Date().toISOString().slice(0, 10),
  });

  // Payroll Form
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [bonusAmount, setBonusAmount] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [expRes, monthlyRes, staffRes, catRes] = await Promise.all([
        api.get('/expenses?limit=100'),
        api.get('/expenses/monthly-summary'),
        api.get('/expenses/payroll/staff'),
        api.get('/expenses/categories'),
      ]);

      if (expRes.expenses) setExpenses(expRes.expenses);
      if (monthlyRes.summary) setMonthlySummaries(monthlyRes.summary);
      if (staffRes.employees) setPayrollStaff(staffRes.employees);
      else if (staffRes.staff) setPayrollStaff(staffRes.staff);
      if (catRes.categories) setCategories(catRes.categories);
    } catch (e) {
      console.error('Failed to load expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateDailyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDailyExpense.amount <= 0 || !newDailyExpense.category) {
      alert('Please enter a valid expense amount and category');
      return;
    }

    try {
      await api.post('/expenses', {
        category: newDailyExpense.category,
        title: newDailyExpense.title || newDailyExpense.category,
        amount: Number(newDailyExpense.amount),
        paymentMethod: newDailyExpense.paymentMethod,
        expenseDate: newDailyExpense.expenseDate,
        notes: newDailyExpense.notes,
      });

      setIsAddDailyExpenseOpen(false);
      setNewDailyExpense({
        category: 'Tea, Lunch & Refreshments',
        amount: 0,
        paymentMethod: 'CASH',
        expenseDate: new Date().toISOString().slice(0, 10),
        title: '',
        notes: '',
      });
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to record daily expense');
    }
  };

  const handleCreateMonthlyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMonthlyExpense.amount <= 0 || !newMonthlyExpense.category) {
      alert('Please enter a valid monthly overhead amount and category');
      return;
    }

    try {
      const expDate = `${newMonthlyExpense.monthYear}-01`;
      const title = newMonthlyExpense.title || `${newMonthlyExpense.category} (${newMonthlyExpense.monthYear})`;

      await api.post('/expenses', {
        category: newMonthlyExpense.category,
        title,
        amount: Number(newMonthlyExpense.amount),
        paymentMethod: newMonthlyExpense.paymentMethod,
        expenseDate: expDate,
        notes: `Monthly overhead for ${newMonthlyExpense.monthYear}. ${newMonthlyExpense.notes || ''}`.trim(),
      });

      setIsAddMonthlyExpenseOpen(false);
      setNewMonthlyExpense({
        monthYear: new Date().toISOString().slice(0, 7),
        category: 'Shop Rent & Utilities',
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        title: '',
        notes: '',
      });
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to record monthly overhead');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.phone.trim()) {
      alert('Please provide employee name and phone number');
      return;
    }

    try {
      await api.post('/expenses/payroll/staff', {
        name: newStaff.name.trim(),
        phone: newStaff.phone.trim(),
        cnic: newStaff.cnic.trim(),
        designation: newStaff.designation.trim(),
        monthlySalary: Number(newStaff.monthlySalary || 35000),
        joiningDate: newStaff.joiningDate,
      });

      setIsAddStaffOpen(false);
      setNewStaff({
        name: '',
        phone: '',
        cnic: '',
        designation: 'Sales Cashier',
        monthlySalary: 35000,
        joiningDate: new Date().toISOString().slice(0, 10),
      });
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to add staff member');
    }
  };

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      await api.post('/expenses/payroll/process', {
        staffId: selectedStaff.id,
        salaryMonth,
        baseSalary: Number(selectedStaff.base_salary || 35000),
        bonusAmount: Number(bonusAmount || 0),
        deductions: Number(deductions || 0),
        paymentMethod: salaryPaymentMethod,
      });

      setIsPayStaffOpen(false);
      setSelectedStaff(null);
      setBonusAmount(0);
      setDeductions(0);
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to disburse salary');
    }
  };

  // Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const totalAllExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const todayExpenses = expenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const thisMonthExpenses = expenses
    .filter((e) => (e.expense_date || '').startsWith(currentMonthStr))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchCat = selectedCategoryFilter === 'ALL' || e.category_name === selectedCategoryFilter;
    const matchQuery =
      !searchQuery.trim() ||
      (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* ── TOP HEADER & ACTIONS ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>Expenses & Staff Payroll</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Manage daily petty cash expenses, monthly recurring overhead bills, and staff salary disbursements
          </p>
        </div>

        {/* Action Buttons: Record Daily Expense + Record Monthly Expense */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddDailyExpenseOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>+ Record Daily Expense</span>
          </button>

          <button
            onClick={() => setIsAddMonthlyExpenseOpen(true)}
            className="px-4 py-2.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl shadow-sm transition flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>+ Record Monthly Expense</span>
          </button>
        </div>
      </div>

      {/* ── TOP KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Today's Daily Spend</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            PKR {todayExpenses.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Petty cash & refreshments</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Month Overheads</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            PKR {thisMonthExpenses.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Rent, salaries & utilities for {currentMonthStr}</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl soft-shadow transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Recorded Outflow</span>
          <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
            PKR {totalAllExpenses.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{expenses.length} operational disbursements</span>
        </div>
      </div>

      {/* ── VIEW SWITCHER TABS ───────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('DAILY_EXPENSES')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'DAILY_EXPENSES'
              ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
              : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Daily Store Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MONTHLY_EXPENSES')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'MONTHLY_EXPENSES'
              ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
              : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly Expense Summaries ({monthlySummaries.length} Months)</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF_PAYROLL')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'STAFF_PAYROLL'
              ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
              : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Payroll & Salaries ({payrollStaff.length} Employees)</span>
        </button>
      </div>

      {/* ── TAB 1: DAILY STORE EXPENSES ──────────────────────────────────── */}
      {activeTab === 'DAILY_EXPENSES' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow transition-colors">
            <div className="flex space-x-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategoryFilter === c.name
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description, category..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition"
              />
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Expense Title / Description</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        No expenses recorded yet. Click "Record Daily Expense" to add your first expense.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {exp.expense_date}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                            {exp.category_name}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{exp.title}</div>
                          {exp.notes && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{exp.notes}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {exp.payment_method}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {exp.user_name || 'Admin'}
                        </td>
                        <td className="p-4 text-right font-black text-rose-600 dark:text-rose-400 font-mono text-sm">
                          PKR {Number(exp.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MONTHLY EXPENSE SUMMARIES ─────────────────────────────── */}
      {activeTab === 'MONTHLY_EXPENSES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthlySummaries.length === 0 ? (
              <div className="col-span-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center text-slate-400">
                No monthly expense summaries available yet.
              </div>
            ) : (
              monthlySummaries.map((month) => (
                <div
                  key={month.monthYear}
                  className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 soft-shadow space-y-4 transition-colors"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <h3 className="font-black text-base text-slate-900 dark:text-white">
                        {month.monthYear}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                      {month.count} Bills
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Monthly Outflow</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                      PKR {Number(month.totalAmount).toLocaleString()}
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Category Breakdown:</span>
                    {month.categories?.map((cat: any, idx: number) => {
                      const pct = Math.round((Number(cat.amount) / Number(month.totalAmount)) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              PKR {Number(cat.amount).toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-900 dark:bg-white rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: STAFF PAYROLL & SALARIES ──────────────────────────────── */}
      {activeTab === 'STAFF_PAYROLL' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Staff Salary Register</h3>
                <p className="text-xs text-slate-400">Monthly staff salary approvals and employee directory</p>
              </div>

              {/* Add New Staff Button */}
              <button
                onClick={() => setIsAddStaffOpen(true)}
                className="px-4 py-2 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add New Staff Member</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Employee Name</th>
                    <th className="p-4">Role / Designation</th>
                    <th className="p-4">Phone / Contact</th>
                    <th className="p-4 text-right">Base Monthly Salary</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payrollStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        No staff members found. Click "+ Add New Staff Member" to add your team.
                      </td>
                    </tr>
                  ) : (
                    payrollStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{staff.name}</div>
                          {staff.cnic && <div className="text-[10px] text-slate-400 font-mono">CNIC: {staff.cnic}</div>}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                            {staff.designation || 'Staff'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                          {staff.phone || '—'}
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 dark:text-white font-mono text-sm">
                          PKR {Number(staff.base_salary || staff.monthly_salary || 35000).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px]">
                            Active
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setIsPayStaffOpen(true);
                            }}
                            className="px-4 py-1.5 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-2xs transition"
                          >
                            Disburse Salary
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: RECORD DAILY EXPENSE ─────────────────────────────────── */}
      {isAddDailyExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Record Daily Store Expense</h3>
              <button onClick={() => setIsAddDailyExpenseOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDailyExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Daily Category *</label>
                <select
                  value={newDailyExpense.category}
                  onChange={(e) => setNewDailyExpense({ ...newDailyExpense, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="Tea, Lunch & Refreshments">Tea, Lunch & Refreshments</option>
                  <option value="Packaging Bags & Stationary">Packaging Bags & Stationary</option>
                  <option value="Maintenance & Cleaning">Maintenance & Cleaning</option>
                  <option value="Electricity & Generator Fuel">Generator Fuel / Fuel Allowance</option>
                  <option value="Courier & Transport">Courier & Transport</option>
                  <option value="General Store Expense">General Store Expense</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newDailyExpense.amount || ''}
                  onChange={(e) => setNewDailyExpense({ ...newDailyExpense, amount: Number(e.target.value) })}
                  placeholder="e.g. 1500"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  value={newDailyExpense.title}
                  onChange={(e) => setNewDailyExpense({ ...newDailyExpense, title: e.target.value })}
                  placeholder="e.g. Afternoon tea & mineral water"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={newDailyExpense.expenseDate}
                    onChange={(e) => setNewDailyExpense({ ...newDailyExpense, expenseDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={newDailyExpense.paymentMethod}
                    onChange={(e) => setNewDailyExpense({ ...newDailyExpense, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card / POS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={newDailyExpense.notes}
                  onChange={(e) => setNewDailyExpense({ ...newDailyExpense, notes: e.target.value })}
                  placeholder="Optional details or receipt reference"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDailyExpenseOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold rounded-xl shadow-sm"
                >
                  Record Daily Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RECORD MONTHLY EXPENSE WITH MONTH DROPDOWN ──────────── */}
      {isAddMonthlyExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Monthly Expense / Bill</h3>
                <p className="text-xs text-slate-400">Rent, electricity, software subscriptions, and overheads</p>
              </div>
              <button onClick={() => setIsAddMonthlyExpenseOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMonthlyExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Month Dropdown / Picker */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Month *</label>
                  <input
                    type="month"
                    required
                    value={newMonthlyExpense.monthYear}
                    onChange={(e) => setNewMonthlyExpense({ ...newMonthlyExpense, monthYear: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={newMonthlyExpense.paymentMethod}
                    onChange={(e) => setNewMonthlyExpense({ ...newMonthlyExpense, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (IBFT)</option>
                    <option value="CASH">Cash Payment</option>
                    <option value="CARD">Card / Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Category *</label>
                <select
                  value={newMonthlyExpense.category}
                  onChange={(e) => setNewMonthlyExpense({ ...newMonthlyExpense, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="Shop Rent & Utilities">Shop Rent & Utilities</option>
                  <option value="Electricity & Generator Fuel">Electricity Bill (LESCO / K-Electric)</option>
                  <option value="Internet, Software & POS">Internet & POS Subscriptions</option>
                  <option value="Marketing & Promotion">Monthly Marketing & Social Ads</option>
                  <option value="Maintenance & Security">Security & Mall Maintenance</option>
                  <option value="Staff Salaries & Payroll">Staff Salaries & Allowances</option>
                  <option value="General Store Expense">Other Monthly Overhead</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newMonthlyExpense.amount || ''}
                  onChange={(e) => setNewMonthlyExpense({ ...newMonthlyExpense, amount: Number(e.target.value) })}
                  placeholder="e.g. 75000"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bill Reference / Invoice Title</label>
                <input
                  type="text"
                  value={newMonthlyExpense.title}
                  onChange={(e) => setNewMonthlyExpense({ ...newMonthlyExpense, title: e.target.value })}
                  placeholder="e.g. Shop #4 Rent for September 2026"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks / Transaction Reference</label>
                <textarea
                  rows={2}
                  value={newMonthlyExpense.notes}
                  onChange={(e) => setNewMonthlyExpense({ ...newMonthlyExpense, notes: e.target.value })}
                  placeholder="e.g. Bank IBFT Ref #1092837 to landlord account"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMonthlyExpenseOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold rounded-xl shadow-sm"
                >
                  Post Monthly Overhead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ADD NEW STAFF / EMPLOYEE ─────────────────────────────── */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Add New Staff Member</h3>
                <p className="text-xs text-slate-400">Register employee for monthly payroll register</p>
              </div>
              <button onClick={() => setIsAddStaffOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="e.g. Usman Tariq"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNIC Number</label>
                  <input
                    type="text"
                    value={newStaff.cnic}
                    onChange={(e) => setNewStaff({ ...newStaff, cnic: e.target.value })}
                    placeholder="35201-1234567-1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Designation / Role</label>
                  <select
                    value={newStaff.designation}
                    onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Sales Cashier">Sales Cashier</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Floor Sales Assistant">Floor Sales Assistant</option>
                    <option value="Inventory Handler">Inventory Handler</option>
                    <option value="Security / Guard">Security / Guard</option>
                    <option value="Office Assistant">Office Assistant</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary (PKR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newStaff.monthlySalary || ''}
                    onChange={(e) => setNewStaff({ ...newStaff, monthlySalary: Number(e.target.value) })}
                    placeholder="35000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={newStaff.joiningDate}
                  onChange={(e) => setNewStaff({ ...newStaff, joiningDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold rounded-xl shadow-sm"
                >
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DISBURSE STAFF SALARY ─────────────────────────────────── */}
      {isPayStaffOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Disburse Monthly Salary</h3>
                <p className="text-xs text-slate-400">{selectedStaff.name} ({selectedStaff.designation || 'Staff'})</p>
              </div>
              <button onClick={() => setIsPayStaffOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayroll} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Salary Month</label>
                  <input
                    type="month"
                    required
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={salaryPaymentMethod}
                    onChange={(e) => setSalaryPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank IBFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary (PKR)</label>
                <input
                  type="number"
                  disabled
                  value={selectedStaff.base_salary || selectedStaff.monthly_salary || 35000}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bonus / Allowance (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={bonusAmount || ''}
                    onChange={(e) => setBonusAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deductions / Advances (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={deductions || ''}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Net Disbursal Amount */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">Net Payable Salary:</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  PKR {Number((selectedStaff.base_salary || selectedStaff.monthly_salary || 35000) + bonusAmount - deductions).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayStaffOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold rounded-xl shadow-sm"
                >
                  Confirm & Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
