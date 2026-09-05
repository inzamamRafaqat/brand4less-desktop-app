import { db } from '../database/db.js';
import { INDUSTRY_PRESETS } from '../database/seed.js';
import { v4 as uuidv4 } from 'uuid';

export class OrganizationService {
  static getProfile() {
    let org = db.prepare('SELECT * FROM organizations LIMIT 1').get() as any;
    if (!org) {
      // Auto-initialize if empty
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO organizations (
          id, name, tagline, industry, currency_code, currency_symbol,
          currency_position, decimal_places, tax_rate, tax_label, phone,
          email, address, return_policy, barcode_standard, theme_color,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'org_default_01', 'Universal Retail Enterprise', 'All-in-One Retail Management & POS Suite',
        'GENERAL', 'PKR', 'Rs.', 'BEFORE', 0, 0.0, 'Sales Tax / GST',
        '+92 300 1234567', 'info@omniretail.com', 'Commercial Plaza, Lahore',
        'Items can be exchanged within 7 days with original receipt. No cash refunds.',
        'CODE128', '#059669', now, now
      );
      org = db.prepare('SELECT * FROM organizations LIMIT 1').get() as any;
    }
    return org;
  }

  static updateProfile(data: Partial<any>) {
    const now = new Date().toISOString();
    const current = this.getProfile();

    db.prepare(`
      UPDATE organizations SET
        name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        currency_code = COALESCE(?, currency_code),
        currency_symbol = COALESCE(?, currency_symbol),
        currency_position = COALESCE(?, currency_position),
        decimal_places = COALESCE(?, decimal_places),
        tax_rate = COALESCE(?, tax_rate),
        tax_label = COALESCE(?, tax_label),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        logo_url = COALESCE(?, logo_url),
        receipt_header = COALESCE(?, receipt_header),
        receipt_footer = COALESCE(?, receipt_footer),
        return_policy = COALESCE(?, return_policy),
        barcode_standard = COALESCE(?, barcode_standard),
        theme_color = COALESCE(?, theme_color),
        label_printer_name = COALESCE(?, label_printer_name),
        receipt_printer_name = COALESCE(?, receipt_printer_name),
        auto_cut_receipt = COALESCE(?, auto_cut_receipt),
        kick_drawer = COALESCE(?, kick_drawer),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name, data.tagline, data.currency_code, data.currency_symbol,
      data.currency_position, data.decimal_places, data.tax_rate, data.tax_label,
      data.phone, data.email, data.address, data.logo_url, data.receipt_header,
      data.receipt_footer, data.return_policy, data.barcode_standard, data.theme_color,
      data.label_printer_name, data.receipt_printer_name, data.auto_cut_receipt,
      data.kick_drawer, now, current.id
    );

    return this.getProfile();
  }

  /**
   * 1-Click Industry Preset Switcher
   */
  static switchIndustryPreset(industryKey: string) {
    const preset = (INDUSTRY_PRESETS as any)[industryKey.toUpperCase()];
    if (!preset) {
      throw new Error(`Invalid industry preset: ${industryKey}`);
    }

    const now = new Date().toISOString();
    const current = this.getProfile();

    db.transaction(() => {
      // 1. Update Org Info
      db.prepare(`
        UPDATE organizations SET
          name = ?, tagline = ?, industry = ?, updated_at = ?
        WHERE id = ?
      `).run(preset.name, preset.tagline, preset.industry, now, current.id);

      // 2. Clear old schema attributes and replace with industry preset
      db.prepare('DELETE FROM schema_attributes').run();
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

      // 3. Clear and insert categories
      db.prepare('DELETE FROM categories').run();
      const insertCat = db.prepare(`
        INSERT INTO categories (id, name, code, icon, color, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const cat of preset.categories) {
        insertCat.run(uuidv4(), cat.name, cat.code, cat.icon, cat.color, now);
      }
    })();

    return this.getProfile();
  }
}
