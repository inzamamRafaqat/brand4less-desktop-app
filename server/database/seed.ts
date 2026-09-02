import { getDb } from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config/index.js';

export function seedDatabase(): void {
  const db = getDb();

  // 1. Seed Users (Admin & Staff)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const staffPasswordHash = bcrypt.hashSync('staff123', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, pin_code, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    insertUser.run(uuidv4(), 'admin', adminPasswordHash, '1234', 'System Administrator', 'ADMIN');
    insertUser.run(uuidv4(), 'manager', adminPasswordHash, '5678', 'Store Manager', 'MANAGER');
    insertUser.run(uuidv4(), 'cashier', staffPasswordHash, '0000', 'Front Desk Cashier', 'STAFF');
    console.log('✅ Default users seeded (admin/admin123, manager/admin123, cashier/staff123)');
  }

  // 2. Seed Standard Categories with specific icon types and attribute requirements
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const categories = [
      { name: 'T-Shirts', icon_type: 'shirt', requires_size: 1, requires_color: 1 },
      { name: 'Polo Shirts', icon_type: 'shirt', requires_size: 1, requires_color: 1 },
      { name: 'Casual Shirts', icon_type: 'shirt', requires_size: 1, requires_color: 1 },
      { name: 'Party Shirts', icon_type: 'shirt', requires_size: 1, requires_color: 1 },
      { name: 'Full Sleeve Shirts', icon_type: 'shirt', requires_size: 1, requires_color: 1 },
      { name: 'Half Sleeve Shirts', icon_type: 'shirt', requires_size: 1, requires_color: 1 },
      { name: 'Pants', icon_type: 'pants', requires_size: 1, requires_color: 1 },
      { name: 'Jeans', icon_type: 'pants', requires_size: 1, requires_color: 1 },
      { name: 'Trousers', icon_type: 'pants', requires_size: 1, requires_color: 1 },
      { name: 'Slippers', icon_type: 'shoes', requires_size: 1, requires_color: 1 },
      { name: 'Watches', icon_type: 'watch', requires_size: 0, requires_color: 1 },
      { name: 'Caps', icon_type: 'cap', requires_size: 0, requires_color: 1 },
      { name: 'Belts', icon_type: 'belt', requires_size: 1, requires_color: 1 },
      { name: 'Wallets', icon_type: 'wallet', requires_size: 0, requires_color: 1 },
      { name: 'Leather Wallets', icon_type: 'wallet', requires_size: 0, requires_color: 1 },
      { name: 'Imported Wallets', icon_type: 'wallet', requires_size: 0, requires_color: 1 },
      { name: 'Perfumes', icon_type: 'perfume', requires_size: 0, requires_color: 0 },
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, icon_type, requires_size, requires_color, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const cat of categories) {
      insertCat.run(uuidv4(), cat.name, cat.icon_type, cat.requires_size, cat.requires_color, `${cat.name} Collection`);
    }
    console.log(`✅ ${categories.length} standard categories seeded.`);
  }

  // 3. Seed Expense Categories
  const expenseCatCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as { count: number };
  if (expenseCatCount.count === 0) {
    const expenseCats = [
      { name: 'Shop Rent', description: 'Monthly store rental' },
      { name: 'Electricity Bill', description: 'Utility electricity power charges' },
      { name: 'Internet & Telephone', description: 'Broadband and mobile communication' },
      { name: 'Transport & Freight', description: 'Stock transportation and delivery fees' },
      { name: 'Store Maintenance', description: 'Repairs, cleaning, fixtures' },
      { name: 'Staff Salaries', description: 'Auto-disbursed staff payroll' },
      { name: 'Tea & Refreshment', description: 'Daily staff tea and refreshments' },
      { name: 'Inventory Shrinkage & Damage', description: 'Damaged or lost stock cost write-offs' },
      { name: 'Miscellaneous Expenses', description: 'Other unclassified operational expenses' }
    ];

    const insertExpCat = db.prepare(`
      INSERT INTO expense_categories (id, name, description)
      VALUES (?, ?, ?)
    `);

    for (const exp of expenseCats) {
      insertExpCat.run(uuidv4(), exp.name, exp.description);
    }
    console.log(`✅ ${expenseCats.length} expense categories seeded.`);
  }

  // 4. Seed Default App Settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM app_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: 'store_name', value: CONFIG.STORE_NAME, category: 'GENERAL', description: 'Store Business Name' },
      { key: 'store_tagline', value: CONFIG.STORE_TAGLINE, category: 'GENERAL', description: 'Receipt Tagline' },
      { key: 'store_address', value: CONFIG.STORE_ADDRESS, category: 'GENERAL', description: 'Physical Shop Address' },
      { key: 'store_phone', value: CONFIG.STORE_PHONE, category: 'GENERAL', description: 'Contact Numbers' },
      { key: 'currency', value: CONFIG.CURRENCY, category: 'FINANCIAL', description: 'Default Currency Symbol' },
      { key: 'inventory_costing_method', value: 'WEIGHTED_AVERAGE', category: 'INVENTORY', description: 'Costing method: WEIGHTED_AVERAGE or FIFO' },
      { key: 'staff_max_discount_percent', value: '10', category: 'POS', description: 'Max discount percentage staff can give without admin PIN' },
      { key: 'thermal_printer_paper_width', value: '80mm', category: 'PRINTER', description: '80mm or 58mm thermal paper' },
      { key: 'receipt_return_policy', value: CONFIG.RECEIPT_RETURN_POLICY, category: 'PRINTER', description: 'Footer return and exchange policy' },
      { key: 'allow_negative_inventory_sales', value: 'false', category: 'POS', description: 'Disallow selling when stock is zero' },
      { key: 'min_stock_alert_threshold', value: '3', category: 'INVENTORY', description: 'Low stock warning threshold' },
      { key: 'auto_backup_enabled', value: 'true', category: 'SYSTEM', description: 'Automatic daily database backup' }
    ];

    const insertSetting = db.prepare(`
      INSERT INTO app_settings (key, value, category, description)
      VALUES (?, ?, ?, ?)
    `);

    for (const setting of defaultSettings) {
      insertSetting.run(setting.key, setting.value, setting.category, setting.description);
    }
    console.log(`✅ App settings initialized.`);
  }

  // 6. Seed Initial Rich Product Catalog
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    const categoriesList = db.prepare('SELECT id, name FROM categories').all() as { id: string; name: string }[];
    const categoryMap = new Map(categoriesList.map(c => [c.name, c.id]));
    const adminUser = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").get() as { id: string };
    const adminId = adminUser ? adminUser.id : uuidv4();

    const insertProduct = db.prepare(`
      INSERT INTO products (id, category_id, name, brand, origin, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (id, product_id, sku, barcode, color, size, cost_price, selling_price, stock_quantity, min_stock_level, qr_code_payload, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertStockMovement = db.prepare(`
      INSERT INTO stock_movements (id, variant_id, movement_type, quantity_change, resulting_stock, unit_cost, reference_type, notes, user_id)
      VALUES (?, ?, 'OPENING_STOCK', ?, ?, ?, 'MANUAL', 'Initial Store Opening Stock', ?)
    `);

    const sampleCatalog = [
      {
        name: 'Crewneck Essential T-Shirt',
        category: 'T-Shirts',
        brand: 'Brand 4 Less',
        origin: 'Local',
        variants: [
          { sku: 'B4L-TSH-BLK-M', color: 'Black', size: 'M', cost: 650, price: 1200, qty: 30, min: 5 },
          { sku: 'B4L-TSH-BLK-L', color: 'Black', size: 'L', cost: 650, price: 1200, qty: 45, min: 5 },
          { sku: 'B4L-TSH-WHT-M', color: 'White', size: 'M', cost: 650, price: 1200, qty: 25, min: 5 },
          { sku: 'B4L-TSH-NVY-L', color: 'Navy', size: 'L', cost: 650, price: 1200, qty: 20, min: 5 },
        ]
      },
      {
        name: 'Classic Pique Polo Shirt',
        category: 'Polo Shirts',
        brand: 'Zara Men',
        origin: 'Imported',
        variants: [
          { sku: 'B4L-POL-NVY-M', color: 'Navy Blue', size: 'M', cost: 1200, price: 2400, qty: 20, min: 4 },
          { sku: 'B4L-POL-NVY-L', color: 'Navy Blue', size: 'L', cost: 1200, price: 2400, qty: 25, min: 4 },
          { sku: 'B4L-POL-BLK-XL', color: 'Black', size: 'XL', cost: 1200, price: 2400, qty: 15, min: 3 },
          { sku: 'B4L-POL-RED-M', color: 'Maroon', size: 'M', cost: 1200, price: 2400, qty: 18, min: 4 },
        ]
      },
      {
        name: 'Oxford Button-Down Shirt',
        category: 'Casual Shirts',
        brand: 'Outfitters',
        origin: 'Local',
        variants: [
          { sku: 'B4L-CSH-WHT-M', color: 'Pure White', size: 'M', cost: 1400, price: 2800, qty: 22, min: 4 },
          { sku: 'B4L-CSH-WHT-L', color: 'Pure White', size: 'L', cost: 1400, price: 2800, qty: 28, min: 4 },
          { sku: 'B4L-CSH-SBLU-L', color: 'Sky Blue', size: 'L', cost: 1400, price: 2800, qty: 16, min: 3 },
        ]
      },
      {
        name: 'Party Wear Printed Satin Shirt',
        category: 'Party Shirts',
        brand: 'Royal Tag',
        origin: 'Imported',
        variants: [
          { sku: 'B4L-PSH-BLK-M', color: 'Jet Black Print', size: 'M', cost: 1600, price: 3200, qty: 12, min: 3 },
          { sku: 'B4L-PSH-BLK-L', color: 'Jet Black Print', size: 'L', cost: 1600, price: 3200, qty: 15, min: 3 },
        ]
      },
      {
        name: 'Slim Fit Stretch Denim Jeans',
        category: 'Jeans',
        brand: 'Levi Strauss',
        origin: 'Imported',
        variants: [
          { sku: 'B4L-JNS-BLU-30', color: 'Dark Blue Wash', size: '30', cost: 1800, price: 3500, qty: 18, min: 3 },
          { sku: 'B4L-JNS-BLU-32', color: 'Dark Blue Wash', size: '32', cost: 1800, price: 3500, qty: 24, min: 4 },
          { sku: 'B4L-JNS-BLU-34', color: 'Dark Blue Wash', size: '34', cost: 1800, price: 3500, qty: 20, min: 3 },
          { sku: 'B4L-JNS-BLK-32', color: 'Charcoal Black', size: '32', cost: 1800, price: 3500, qty: 15, min: 3 },
        ]
      },
      {
        name: 'Cotton Casual Chino Pants',
        category: 'Pants',
        brand: 'Dockers',
        origin: 'Local',
        variants: [
          { sku: 'B4L-PNT-KHK-32', color: 'Khaki Beige', size: '32', cost: 1500, price: 2900, qty: 16, min: 3 },
          { sku: 'B4L-PNT-KHK-34', color: 'Khaki Beige', size: '34', cost: 1500, price: 2900, qty: 14, min: 3 },
          { sku: 'B4L-PNT-OLV-32', color: 'Olive Green', size: '32', cost: 1500, price: 2900, qty: 12, min: 3 },
        ]
      },
      {
        name: 'Chronograph Quartz Wristwatch',
        category: 'Watches',
        brand: 'Curren',
        origin: 'Imported',
        variants: [
          { sku: 'B4L-WCH-SLV', color: 'Silver Steel', size: 'Standard', cost: 2200, price: 4500, qty: 10, min: 2 },
          { sku: 'B4L-WCH-GLD', color: 'Gold / Black Dial', size: 'Standard', cost: 2500, price: 5200, qty: 8, min: 2 },
          { sku: 'B4L-WCH-LTH', color: 'Brown Leather', size: 'Standard', cost: 2000, price: 4200, qty: 12, min: 2 },
        ]
      },
      {
        name: 'Genuine Leather Bi-Fold Wallet',
        category: 'Leather Wallets',
        brand: 'J. Leather',
        origin: 'Local',
        variants: [
          { sku: 'B4L-WLT-BRN', color: 'Vintage Brown', size: 'Standard', cost: 850, price: 1800, qty: 20, min: 3 },
          { sku: 'B4L-WLT-BLK', color: 'Midnight Black', size: 'Standard', cost: 850, price: 1800, qty: 25, min: 4 },
        ]
      },
      {
        name: 'Carbon Fiber Imported Slim Wallet',
        category: 'Imported Wallets',
        brand: 'Ridge Style',
        origin: 'Imported',
        variants: [
          { sku: 'B4L-WLT-CRB', color: 'Matte Carbon', size: 'Standard', cost: 1100, price: 2400, qty: 15, min: 3 },
        ]
      },
      {
        name: 'Formal Reversible Leather Belt',
        category: 'Belts',
        brand: 'Hub Leather',
        origin: 'Local',
        variants: [
          { sku: 'B4L-BLT-34', color: 'Black/Brown Dual', size: '34', cost: 700, price: 1500, qty: 15, min: 3 },
          { sku: 'B4L-BLT-36', color: 'Black/Brown Dual', size: '36', cost: 700, price: 1500, qty: 18, min: 3 },
        ]
      },
      {
        name: 'Royal Oud Eau De Parfum 100ml',
        category: 'Perfumes',
        brand: 'Lattafa',
        origin: 'Imported',
        variants: [
          { sku: 'B4L-PRF-OUD', color: 'Gold Spray', size: '100ml', cost: 3200, price: 6500, qty: 10, min: 2 },
        ]
      },
      {
        name: 'Aqua Marine Fresh Perfume 100ml',
        category: 'Perfumes',
        brand: 'J. Fragrances',
        origin: 'Local',
        variants: [
          { sku: 'B4L-PRF-AQU', color: 'Ocean Blue', size: '100ml', cost: 2400, price: 4800, qty: 12, min: 2 },
        ]
      },
      {
        name: 'Embroidered Premium Baseball Cap',
        category: 'Caps',
        brand: 'Brand 4 Less',
        origin: 'Local',
        variants: [
          { sku: 'B4L-CAP-BLK', color: 'Black Onyx', size: 'Adjustable', cost: 450, price: 950, qty: 25, min: 5 },
          { sku: 'B4L-CAP-NVY', color: 'Navy Blue', size: 'Adjustable', cost: 450, price: 950, qty: 20, min: 4 },
        ]
      },
      {
        name: 'Comfort Memory Foam Slippers',
        category: 'Slippers',
        brand: 'Bata Comfort',
        origin: 'Local',
        variants: [
          { sku: 'B4L-SLP-41', color: 'Charcoal', size: '41', cost: 600, price: 1300, qty: 14, min: 3 },
          { sku: 'B4L-SLP-42', color: 'Charcoal', size: '42', cost: 600, price: 1300, qty: 16, min: 3 },
          { sku: 'B4L-SLP-43', color: 'Charcoal', size: '43', cost: 600, price: 1300, qty: 12, min: 3 },
        ]
      }
    ];

    for (const prod of sampleCatalog) {
      const catId = categoryMap.get(prod.category) || categoriesList[0]?.id;
      const productId = uuidv4();
      insertProduct.run(productId, catId, prod.name, prod.brand, prod.origin, `${prod.name} - ${prod.brand}`);

      for (const v of prod.variants) {
        const variantId = uuidv4();
        const qrPayload = `B4L|${v.sku}|${v.price}|${prod.name}`;
        insertVariant.run(
          variantId,
          productId,
          v.sku,
          v.sku.replace(/-/g, ''),
          v.color,
          v.size,
          v.cost,
          v.price,
          v.qty,
          v.min,
          qrPayload
        );
        insertStockMovement.run(uuidv4(), variantId, v.qty, v.qty, v.cost, adminId);
      }
    }
    console.log(`✅ Sample catalog seeded with ${sampleCatalog.length} products and variants.`);
  }
}
