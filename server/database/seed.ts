import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export const INDUSTRY_PRESETS = {
  APPAREL: {
    industry: 'APPAREL',
    name: 'Fashion & Apparel Retail Store',
    tagline: 'Premium Clothing, Footwear & Accessories',
    attributes: [
      { name: 'Size', code: 'size', dataType: 'SELECT', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36', '38'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 1 },
      { name: 'Color', code: 'color', dataType: 'SELECT', options: ['Black', 'White', 'Navy Blue', 'Charcoal Grey', 'Olive Green', 'Beige', 'Maroon', 'Sky Blue', 'Brown', 'Khaki'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 2 },
      { name: 'Fit', code: 'fit', dataType: 'SELECT', options: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Oversized', 'Skinny Fit'], isRequired: 0, isVariant: 1, isSearchable: 1, isLabel: 0, isReceipt: 0, order: 3 },
      { name: 'Fabric / Material', code: 'fabric', dataType: 'SELECT', options: ['100% Cotton', 'Denim', 'Linen', 'Fleece', 'Polyester Blend', 'Silk', 'Wool'], isRequired: 0, isVariant: 0, isSearchable: 1, isLabel: 0, isReceipt: 0, order: 4 },
      { name: 'Season', code: 'season', dataType: 'SELECT', options: ['Summer 2026', 'Winter 2026', 'All Season', 'Spring/Autumn'], isRequired: 0, isVariant: 0, isSearchable: 0, isLabel: 0, isReceipt: 0, order: 5 },
    ],
    categories: [
      { name: 'Shirts & Polos', code: 'SHIRTS', icon: 'shirt', color: '#1e3a8a' },
      { name: 'T-Shirts & Tops', code: 'TSHIRTS', icon: 'shirt', color: '#059669' },
      { name: 'Jeans & Denim', code: 'JEANS', icon: 'scissors', color: '#0284c7' },
      { name: 'Trousers & Chinos', code: 'CHINOS', icon: 'layers', color: '#d97706' },
      { name: 'Jackets & Hoodies', code: 'JACKETS', icon: 'box', color: '#7c3aed' },
      { name: 'Accessories', code: 'ACC', icon: 'watch', color: '#e11d48' },
    ],
  },
  PHARMACY: {
    industry: 'PHARMACY',
    name: 'MediCare Pharmacy & Healthcare',
    tagline: 'Authentic Medicines & Surgical Supplies',
    attributes: [
      { name: 'Batch Number', code: 'batch_no', dataType: 'TEXT', isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 1 },
      { name: 'Expiry Date', code: 'expiry_date', dataType: 'DATE', isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 2 },
      { name: 'Dosage Form', code: 'dosage_form', dataType: 'SELECT', options: ['Tablet', 'Capsule', 'Syrup / Suspension', 'Injection', 'Drop / Spray', 'Ointment / Gel', 'Inhaler'], isRequired: 1, isVariant: 0, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 3 },
      { name: 'Generic Formula', code: 'generic_name', dataType: 'TEXT', isRequired: 0, isVariant: 0, isSearchable: 1, isLabel: 0, isReceipt: 1, order: 4 },
      { name: 'Strength / Potency', code: 'strength', dataType: 'TEXT', isRequired: 0, isVariant: 0, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 5 },
      { name: 'Prescription Required (Rx)', code: 'is_rx', dataType: 'BOOLEAN', isRequired: 0, isVariant: 0, isSearchable: 0, isLabel: 0, isReceipt: 0, order: 6 },
    ],
    categories: [
      { name: 'Antibiotics & Anti-Infective', code: 'ANTIBIOTICS', icon: 'shield', color: '#dc2626' },
      { name: 'Pain Relief & Analgesics', code: 'PAINKILLERS', icon: 'zap', color: '#ea580c' },
      { name: 'Cardiac & Blood Pressure', code: 'CARDIAC', icon: 'heart', color: '#e11d48' },
      { name: 'Vitamins & Supplements', code: 'VITAMINS', icon: 'sun', color: '#16a34a' },
      { name: 'Baby Care & Nutrition', code: 'BABYCARE', icon: 'smile', color: '#0284c7' },
      { name: 'Surgical & First Aid', code: 'SURGICAL', icon: 'crosshair', color: '#4b5563' },
    ],
  },
  SUPERMARKET: {
    industry: 'SUPERMARKET',
    name: 'MetroMart Supermarket & Grocery',
    tagline: 'Fresh Groceries, Household & Daily Essentials',
    attributes: [
      { name: 'Unit of Measure', code: 'uom', dataType: 'SELECT', options: ['Piece (pcs)', 'Pack / Box', 'Kilogram (kg)', 'Gram (g)', 'Litre (L)', 'Millilitre (ml)', 'Dozen'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 1 },
      { name: 'Net Weight / Volume', code: 'net_weight', dataType: 'TEXT', isRequired: 0, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 2 },
      { name: 'Expiry Date', code: 'expiry_date', dataType: 'DATE', isRequired: 0, isVariant: 1, isSearchable: 0, isLabel: 0, isReceipt: 0, order: 3 },
      { name: 'Perishable Item', code: 'is_perishable', dataType: 'BOOLEAN', isRequired: 0, isVariant: 0, isSearchable: 0, isLabel: 0, isReceipt: 0, order: 4 },
      { name: 'Scale Barcode Prefix', code: 'scale_prefix', dataType: 'TEXT', isRequired: 0, isVariant: 0, isSearchable: 0, isLabel: 0, isReceipt: 0, order: 5 },
    ],
    categories: [
      { name: 'Fresh Fruits & Vegetables', code: 'VEG', icon: 'apple', color: '#16a34a' },
      { name: 'Dairy, Eggs & Bakery', code: 'DAIRY', icon: 'coffee', color: '#d97706' },
      { name: 'Beverages & Soft Drinks', code: 'DRINKS', icon: 'droplet', color: '#0284c7' },
      { name: 'Snacks, Biscuits & Confectionery', code: 'SNACKS', icon: 'gift', color: '#9333ea' },
      { name: 'Rice, Flour, Pulses & Oil', code: 'STAPLES', icon: 'box', color: '#ca8a04' },
      { name: 'Household & Cleaning', code: 'CLEANING', icon: 'sparkles', color: '#2563eb' },
    ],
  },
  ELECTRONICS: {
    industry: 'ELECTRONICS',
    name: 'TechZone Mobiles & Electronics',
    tagline: 'Smartphones, Laptops, Gadgets & Accessories',
    attributes: [
      { name: 'IMEI / Serial Number', code: 'imei_serial', dataType: 'TEXT', isRequired: 0, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 1 },
      { name: 'RAM & Storage Specs', code: 'ram_storage', dataType: 'SELECT', options: ['4GB / 64GB', '6GB / 128GB', '8GB / 128GB', '8GB / 256GB', '12GB / 256GB', '16GB / 512GB', '32GB / 1TB'], isRequired: 0, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 2 },
      { name: 'Color', code: 'color', dataType: 'SELECT', options: ['Midnight Black', 'Silver Titanium', 'Space Grey', 'Alpine Blue', 'Gold', 'Emerald Green', 'Phantom White'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 3 },
      { name: 'Warranty Period', code: 'warranty_period', dataType: 'SELECT', options: ['1 Year Official Warranty', '2 Years Extended', '6 Months Local', '7 Days Checking', 'No Warranty'], isRequired: 1, isVariant: 0, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 4 },
      { name: 'Device Condition', code: 'device_condition', dataType: 'SELECT', options: ['Brand New (Box Packed)', 'Open Box / Demo', 'Certified Pre-Owned (Grade A)', 'Used (Good)'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 5 },
    ],
    categories: [
      { name: 'Smartphones & Tablets', code: 'PHONES', icon: 'smartphone', color: '#2563eb' },
      { name: 'Laptops & Computers', code: 'LAPTOPS', icon: 'laptop', color: '#4f46e5' },
      { name: 'Smart Watches & Audio', code: 'AUDIO', icon: 'headphones', color: '#059669' },
      { name: 'Chargers, Cables & Powerbanks', code: 'CHARGERS', icon: 'battery-charging', color: '#d97706' },
      { name: 'Cases, Protectors & Covers', code: 'CASES', icon: 'shield', color: '#7c3aed' },
    ],
  },
  FOOTWEAR: {
    industry: 'FOOTWEAR',
    name: 'StepCraft Shoes & Footwear',
    tagline: 'Casual, Formal, Sports & Comfort Shoes',
    attributes: [
      { name: 'Shoe Size (EU)', code: 'shoe_size', dataType: 'SELECT', options: ['38', '39', '40', '41', '42', '43', '44', '45', '46'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 1 },
      { name: 'Color', code: 'color', dataType: 'SELECT', options: ['Black', 'Dark Brown', 'Tan / Camel', 'Navy Blue', 'Pure White', 'Grey', 'Burgundy'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 2 },
      { name: 'Upper Material', code: 'upper_material', dataType: 'SELECT', options: ['Full Grain Leather', 'Genuine Leather', 'Suede', 'Breathable Mesh', 'Synthetic / Rexine', 'Canvas'], isRequired: 0, isVariant: 0, isSearchable: 1, isLabel: 0, isReceipt: 0, order: 3 },
      { name: 'Sole Type', code: 'sole_type', dataType: 'SELECT', options: ['Rubber Sole', 'PU / Light Cushion', 'Leather Sole', 'Air Cushion Sole', 'EVA Sports Sole'], isRequired: 0, isVariant: 0, isSearchable: 0, isLabel: 0, isReceipt: 0, order: 4 },
      { name: 'Gender / Target', code: 'gender', dataType: 'SELECT', options: ['Men', 'Women', 'Unisex', 'Kids / Boys', 'Kids / Girls'], isRequired: 1, isVariant: 0, isSearchable: 1, isLabel: 1, isReceipt: 0, order: 5 },
    ],
    categories: [
      { name: 'Men Formal Leather', code: 'MEN_FORMAL', icon: 'briefcase', color: '#1e293b' },
      { name: 'Men Casual Loafers', code: 'MEN_CASUAL', icon: 'compass', color: '#b45309' },
      { name: 'Sneakers & Running Shoes', code: 'SNEAKERS', icon: 'activity', color: '#059669' },
      { name: 'Women Heels & Flats', code: 'WOMEN_HEELS', icon: 'heart', color: '#db2777' },
      { name: 'Sandals, Slippers & Chappals', code: 'SANDALS', icon: 'sun', color: '#0284c7' },
    ],
  },
  GENERAL: {
    industry: 'GENERAL',
    name: 'Universal Retail Store & POS',
    tagline: 'Quality Products at the Best Value',
    attributes: [
      { name: 'Item Variant / Model', code: 'variant_name', dataType: 'TEXT', isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 1 },
      { name: 'Unit of Measure', code: 'uom', dataType: 'SELECT', options: ['Piece (pcs)', 'Pack', 'Box', 'Set', 'Kilogram (kg)', 'Metre (m)'], isRequired: 1, isVariant: 1, isSearchable: 1, isLabel: 1, isReceipt: 1, order: 2 },
      { name: 'Specifications', code: 'specs', dataType: 'TEXT', isRequired: 0, isVariant: 0, isSearchable: 1, isLabel: 0, isReceipt: 0, order: 3 },
    ],
    categories: [
      { name: 'General Merchandise', code: 'GEN', icon: 'package', color: '#475569' },
      { name: 'Hardware & Tools', code: 'TOOLS', icon: 'tool', color: '#d97706' },
      { name: 'Home & Kitchen', code: 'HOME', icon: 'home', color: '#059669' },
      { name: 'Stationery & Office', code: 'OFFICE', icon: 'edit-3', color: '#2563eb' },
    ],
  },
};

export function seedDatabase(selectedIndustry: keyof typeof INDUSTRY_PRESETS = 'APPAREL') {
  const now = new Date().toISOString();
  const preset = INDUSTRY_PRESETS[selectedIndustry] || INDUSTRY_PRESETS.APPAREL;

  db.transaction(() => {
    // 1. Seed Organization Profile
    const existingOrg = db.prepare('SELECT id FROM organizations LIMIT 1').get();
    if (!existingOrg) {
      db.prepare(`
        INSERT INTO organizations (
          id, name, tagline, industry, currency_code, currency_symbol,
          currency_position, decimal_places, tax_rate, tax_label, phone,
          email, address, return_policy, barcode_standard, theme_color,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        'org_default_01',
        preset.name,
        preset.tagline,
        preset.industry,
        'PKR',
        'Rs.',
        'BEFORE',
        0,
        0.0,
        'Sales Tax / GST',
        '+92 300 1234567',
        'contact@retailstore.com',
        'Commercial Center, Lahore, Pakistan',
        'Items can be exchanged within 7 days with original receipt. No cash refunds.',
        'CODE128',
        '#059669',
        now,
        now
      );
    }

    // 2. Seed Default Custom Attributes Schema
    const existingAttrs = db.prepare('SELECT COUNT(*) as count FROM schema_attributes').get() as { count: number };
    if (existingAttrs.count === 0) {
      const insertAttr = db.prepare(`
        INSERT INTO schema_attributes (
          id, name, code, data_type, options_json, is_required,
          is_variant_level, is_searchable, is_printable_on_label,
          is_printable_on_receipt, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const attr of preset.attributes) {
        insertAttr.run(
          uuidv4(),
          attr.name,
          attr.code,
          attr.dataType,
          attr.options ? JSON.stringify(attr.options) : null,
          attr.isRequired || 0,
          attr.isVariant ?? 1,
          attr.isSearchable ?? 1,
          attr.isLabel ?? 1,
          attr.isReceipt ?? 1,
          attr.order || 0,
          now
        );
      }
    }

    // 3. Seed Default Categories
    const existingCats = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    if (existingCats.count === 0) {
      const insertCat = db.prepare(`
        INSERT INTO categories (id, name, code, icon, color, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const cat of preset.categories) {
        insertCat.run(uuidv4(), cat.name, cat.code, cat.icon, cat.color, now);
      }
    }

    // 4. Seed Expense Categories
    const existingExpCats = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as { count: number };
    if (existingExpCats.count === 0) {
      const insertExpCat = db.prepare(`INSERT INTO expense_categories (id, name, type, created_at) VALUES (?, ?, ?, ?)`);
      insertExpCat.run('exp_cat_1', 'Petty Cash & Refreshments', 'DAILY', now);
      insertExpCat.run('exp_cat_2', 'Shop Packaging & Carry Bags', 'DAILY', now);
      insertExpCat.run('exp_cat_3', 'Generator Fuel & Utilities', 'DAILY', now);
      insertExpCat.run('exp_cat_4', 'Shop Rental & Lease', 'MONTHLY', now);
      insertExpCat.run('exp_cat_5', 'Electricity & Power Bill (LESCO)', 'MONTHLY', now);
      insertExpCat.run('exp_cat_6', 'Staff Monthly Payroll & Salaries', 'MONTHLY', now);
    }

    // 5. Seed Default Staff Accounts
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (existingUsers.count === 0) {
      const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
      const passwordHashManager = bcrypt.hashSync('manager123', 10);
      const passwordHashCashier = bcrypt.hashSync('cashier123', 10);

      const insertUser = db.prepare(`
        INSERT INTO users (id, username, password_hash, pin_code, full_name, role, phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `);

      insertUser.run('usr_admin_1', 'admin', passwordHashAdmin, '9999', 'Store Owner / Administrator', 'ADMIN', '+92 300 0000001', now);
      insertUser.run('usr_manager_1', 'manager', passwordHashManager, '5555', 'Store General Manager', 'MANAGER', '+92 300 0000002', now);
      insertUser.run('usr_cashier_1', 'cashier1', passwordHashCashier, '1234', 'Counter Cashier 1', 'STAFF', '+92 300 0000003', now);
    }
  })();
}
