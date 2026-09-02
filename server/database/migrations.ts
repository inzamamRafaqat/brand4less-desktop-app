import { getDb } from './db.js';

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pin_code TEXT,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'STAFF')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon_type TEXT NOT NULL DEFAULT 'clothing',
      requires_size INTEGER NOT NULL DEFAULT 1,
      requires_color INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      brand TEXT,
      origin TEXT NOT NULL DEFAULT 'Local' CHECK(origin IN ('Local', 'Imported')),
      description TEXT,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Product Variants
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE,
      color TEXT,
      size TEXT,
      cost_price REAL NOT NULL DEFAULT 0.0 CHECK(cost_price >= 0),
      selling_price REAL NOT NULL DEFAULT 0.0 CHECK(selling_price >= 0),
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 3,
      qr_code_data TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Stock Movements
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
      movement_type TEXT NOT NULL CHECK(movement_type IN (
        'OPENING_STOCK', 'PURCHASE', 'SALE', 'SALE_RETURN', 
        'EXCHANGE_OUT', 'EXCHANGE_IN', 'MANUAL_ADJUSTMENT', 'DAMAGED_WRITE_OFF'
      )),
      quantity_change INTEGER NOT NULL,
      cost_per_unit REAL NOT NULL DEFAULT 0.0,
      resulting_stock INTEGER NOT NULL,
      reference_id TEXT,
      notes TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      cnic TEXT,
      address TEXT,
      credit_limit REAL NOT NULL DEFAULT 0.0,
      current_balance REAL NOT NULL DEFAULT 0.0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Customer Khata Ledger
    CREATE TABLE IF NOT EXISTS customer_khata_ledger (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      entry_type TEXT NOT NULL CHECK(entry_type IN ('SALE_CREDIT', 'PAYMENT_RECEIVED', 'RETURN_REFUND_CREDIT', 'ADJUSTMENT')),
      reference_id TEXT,
      debit REAL NOT NULL DEFAULT 0.0,
      credit REAL NOT NULL DEFAULT 0.0,
      running_balance REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'MANUAL')),
      notes TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT NOT NULL,
      address TEXT,
      current_payable REAL NOT NULL DEFAULT 0.0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Purchases
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      purchase_invoice_no TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      discount REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      balance_due REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
      receipt_attachment_url TEXT,
      notes TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
      subtotal REAL NOT NULL CHECK(subtotal >= 0)
    );

    -- 10. Supplier Ledger
    CREATE TABLE IF NOT EXISTS supplier_ledger (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      entry_type TEXT NOT NULL CHECK(entry_type IN ('PURCHASE_BILL', 'PAYMENT_MADE', 'PURCHASE_RETURN', 'ADJUSTMENT')),
      reference_id TEXT,
      debit REAL NOT NULL DEFAULT 0.0,
      credit REAL NOT NULL DEFAULT 0.0,
      running_payable REAL NOT NULL,
      payment_method TEXT,
      notes TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. Sales
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE RESTRICT,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      discount_amount REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      net_total REAL NOT NULL CHECK(net_total >= 0),
      total_cost REAL NOT NULL DEFAULT 0.0,
      total_profit REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      khata_amount REAL NOT NULL DEFAULT 0.0,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'KHATA', 'SPLIT')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PARTIAL', 'KHATA_UNPAID')),
      status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'RETURNED', 'EXCHANGED', 'CANCELLED')),
      cashier_id TEXT NOT NULL REFERENCES users(id),
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
      discount_amount REAL NOT NULL DEFAULT 0.0,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      profit REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'KHATA')),
      amount REAL NOT NULL CHECK(amount > 0),
      reference_note TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. Returns & Exchanges
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      original_sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT,
      customer_id TEXT REFERENCES customers(id),
      total_refund_amount REAL NOT NULL DEFAULT 0.0,
      refund_method TEXT NOT NULL CHECK(refund_method IN ('CASH', 'KHATA_CREDIT', 'EXCHANGE_OFFSET')),
      reason TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      sale_item_id TEXT REFERENCES sale_items(id),
      variant_id TEXT NOT NULL REFERENCES product_variants(id),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      refund_unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exchanges (
      id TEXT PRIMARY KEY,
      exchange_number TEXT UNIQUE NOT NULL,
      return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE RESTRICT,
      new_sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
      difference_amount REAL NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Expense Categories & Expenses
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'BANK_TRANSFER', 'CARD')),
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      receipt_image_url TEXT,
      notes TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Staff & Salaries
    CREATE TABLE IF NOT EXISTS staff_employees (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cnic TEXT,
      designation TEXT NOT NULL,
      monthly_salary REAL NOT NULL CHECK(monthly_salary >= 0),
      joining_date DATE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salary_disbursements (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES staff_employees(id) ON DELETE RESTRICT,
      month_year TEXT NOT NULL,
      base_salary REAL NOT NULL,
      bonus REAL NOT NULL DEFAULT 0.0,
      deductions REAL NOT NULL DEFAULT 0.0,
      net_salary REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'BANK_TRANSFER')),
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'DISBURSED')),
      expense_id TEXT REFERENCES expenses(id),
      approved_by TEXT REFERENCES users(id),
      disbursed_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 15. App Settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      description TEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_or_device TEXT,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for lightning fast lookups
    CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
    CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
    CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_khata_customer_id ON customer_khata_ledger(customer_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_id ON stock_movements(variant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  `);

  console.log('✅ SQLite database schema & indexes verified successfully.');
}
