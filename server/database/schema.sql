-- ══════════════════════════════════════════════════════════════════════════
-- OMNIRETAIL UNIVERSAL RETAIL SUITE - SQLITE DATABASE SCHEMA
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Organization & Store White-Label Profile
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  industry TEXT NOT NULL DEFAULT 'GENERAL', -- 'APPAREL', 'PHARMACY', 'SUPERMARKET', 'ELECTRONICS', 'FOOTWEAR', 'GENERAL'
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
  currency_position TEXT NOT NULL DEFAULT 'BEFORE', -- 'BEFORE' or 'AFTER'
  decimal_places INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0.0,
  tax_label TEXT NOT NULL DEFAULT 'GST / Sales Tax',
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  receipt_header TEXT,
  receipt_footer TEXT,
  return_policy TEXT,
  barcode_standard TEXT NOT NULL DEFAULT 'CODE128',
  theme_color TEXT NOT NULL DEFAULT '#059669',
  label_printer_name TEXT,
  receipt_printer_name TEXT,
  auto_cut_receipt INTEGER NOT NULL DEFAULT 1,
  kick_drawer INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Dynamic Product Custom Attributes Schema Engine
CREATE TABLE IF NOT EXISTS schema_attributes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  data_type TEXT NOT NULL, -- 'TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'BOOLEAN'
  options_json TEXT, -- JSON Array for select options: '["S", "M", "L"]'
  is_required INTEGER NOT NULL DEFAULT 0,
  is_variant_level INTEGER NOT NULL DEFAULT 1, -- 1 = variant-level, 0 = product-level
  is_searchable INTEGER NOT NULL DEFAULT 1,
  is_printable_on_label INTEGER NOT NULL DEFAULT 1,
  is_printable_on_receipt INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 3. Product Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'tag',
  color TEXT DEFAULT '#475569',
  parent_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. Products Master
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku_prefix TEXT,
  brand TEXT,
  description TEXT,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  custom_fields_json TEXT, -- Product-level custom fields
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- 5. Product Variants (with EAV JSON Dynamic Attributes)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL UNIQUE,
  cost_price REAL NOT NULL DEFAULT 0.0,
  selling_price REAL NOT NULL DEFAULT 0.0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  custom_attributes_json TEXT, -- Dynamic variant attributes: {"size":"XL","color":"Navy","batch":"B10"}
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 6. Customers Directory & CRM
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  cnic_or_tax_id TEXT,
  email TEXT,
  address TEXT,
  credit_limit REAL NOT NULL DEFAULT 50000.0,
  current_balance REAL NOT NULL DEFAULT 0.0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 7. Double-Entry Customer Khata Ledger
CREATE TABLE IF NOT EXISTS customer_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'DEBIT' (Credit Sale), 'CREDIT' (Payment Received), 'ADJUSTMENT'
  amount REAL NOT NULL,
  reference_type TEXT NOT NULL, -- 'SALE', 'PAYMENT_VOUCHER', 'RETURN'
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 8. Suppliers & Vendors Directory
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  current_balance REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 9. Supplier Payables Ledger
CREATE TABLE IF NOT EXISTS supplier_ledger (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'CREDIT' (Bill Incurred), 'DEBIT' (Payment Made)
  amount REAL NOT NULL,
  reference_type TEXT NOT NULL, -- 'PURCHASE_BILL', 'PAYMENT_VOUCHER'
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 10. Inbound Consignments / Purchase Orders
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  subtotal REAL NOT NULL,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  shipping_amount REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  grand_total REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0.0,
  payment_status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'UNPAID'
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  bill_image_url TEXT,
  notes TEXT,
  received_at TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- 11. Purchase Line Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost REAL NOT NULL,
  subtotal REAL NOT NULL,
  batch_number TEXT,
  expiry_date TEXT,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

-- 12. POS Sales Invoices
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  subtotal REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  net_total REAL NOT NULL,
  paid_amount REAL NOT NULL,
  change_amount REAL NOT NULL DEFAULT 0.0,
  khata_amount REAL NOT NULL DEFAULT 0.0,
  payment_method TEXT NOT NULL DEFAULT 'CASH', -- 'CASH', 'CARD', 'IBFT', 'KHATA', 'SPLIT'
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  cashier_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- 13. Sales Itemized Lines
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  unit_cost REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  subtotal REAL NOT NULL,
  custom_snapshot_json TEXT,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

-- 14. Split Payment Tender Ledger
CREATE TABLE IF NOT EXISTS sale_payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount REAL NOT NULL,
  reference_number TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- 15. Operating Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'DAILY', -- 'DAILY' (Petty Cash), 'MONTHLY' (Overhead)
  created_at TEXT NOT NULL
);

-- 16. Store Operating Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  billing_month TEXT, -- e.g. "2026-09" for monthly bills
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  reference_number TEXT,
  receipt_image_url TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT
);

-- 17. Staff Payroll Directory
CREATE TABLE IF NOT EXISTS payroll_employees (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  phone TEXT,
  cnic TEXT,
  base_salary REAL NOT NULL DEFAULT 30000.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  joined_date TEXT,
  created_at TEXT NOT NULL
);

-- 18. Payroll Salary Disbursements
CREATE TABLE IF NOT EXISTS payroll_disbursements (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  billing_month TEXT NOT NULL, -- e.g. "2026-09"
  base_salary REAL NOT NULL,
  bonus_amount REAL NOT NULL DEFAULT 0.0,
  deduction_amount REAL NOT NULL DEFAULT 0.0,
  net_paid REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  disbursed_at TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  FOREIGN KEY (employee_id) REFERENCES payroll_employees(id) ON DELETE RESTRICT
);

-- 19. Staff User Accounts & Quick PINs
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF', -- 'ADMIN', 'MANAGER', 'STAFF'
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 20. System Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_prod ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_cust_ledger ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_supp_ledger ON supplier_ledger(supplier_id);
