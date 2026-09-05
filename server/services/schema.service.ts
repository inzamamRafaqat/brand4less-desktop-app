import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { SchemaAttributeDef } from '../domain/custom-fields.js';

export class SchemaService {
  static getAttributes(): SchemaAttributeDef[] {
    const rows = db.prepare('SELECT * FROM schema_attributes ORDER BY display_order ASC, created_at ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      dataType: r.data_type,
      options: r.options_json ? JSON.parse(r.options_json) : undefined,
      isRequired: Boolean(r.is_required),
      isVariantLevel: Boolean(r.is_variant_level),
      isSearchable: Boolean(r.is_searchable),
      isPrintableOnLabel: Boolean(r.is_printable_on_label),
      isPrintableOnReceipt: Boolean(r.is_printable_on_receipt),
      displayOrder: r.display_order,
    }));
  }

  static createAttribute(data: {
    name: string;
    code?: string;
    dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
    options?: string[];
    isRequired?: boolean;
    isVariantLevel?: boolean;
    isSearchable?: boolean;
    isPrintableOnLabel?: boolean;
    isPrintableOnReceipt?: boolean;
    displayOrder?: number;
  }) {
    const id = uuidv4();
    const code = (data.code || data.name.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/_+/g, '_');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO schema_attributes (
        id, name, code, data_type, options_json, is_required,
        is_variant_level, is_searchable, is_printable_on_label,
        is_printable_on_receipt, display_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name.trim(),
      code,
      data.dataType,
      data.options ? JSON.stringify(data.options) : null,
      data.isRequired ? 1 : 0,
      data.isVariantLevel !== false ? 1 : 0,
      data.isSearchable !== false ? 1 : 0,
      data.isPrintableOnLabel !== false ? 1 : 0,
      data.isPrintableOnReceipt !== false ? 1 : 0,
      data.displayOrder || 0,
      now
    );

    return this.getAttributes().find((a) => a.id === id);
  }

  static updateAttribute(id: string, data: Partial<SchemaAttributeDef>) {
    db.prepare(`
      UPDATE schema_attributes SET
        name = COALESCE(?, name),
        data_type = COALESCE(?, data_type),
        options_json = COALESCE(?, options_json),
        is_required = COALESCE(?, is_required),
        is_variant_level = COALESCE(?, is_variant_level),
        is_searchable = COALESCE(?, is_searchable),
        is_printable_on_label = COALESCE(?, is_printable_on_label),
        is_printable_on_receipt = COALESCE(?, is_printable_on_receipt),
        display_order = COALESCE(?, display_order)
      WHERE id = ?
    `).run(
      data.name,
      data.dataType,
      data.options ? JSON.stringify(data.options) : null,
      data.isRequired !== undefined ? (data.isRequired ? 1 : 0) : null,
      data.isVariantLevel !== undefined ? (data.isVariantLevel ? 1 : 0) : null,
      data.isSearchable !== undefined ? (data.isSearchable ? 1 : 0) : null,
      data.isPrintableOnLabel !== undefined ? (data.isPrintableOnLabel ? 1 : 0) : null,
      data.isPrintableOnReceipt !== undefined ? (data.isPrintableOnReceipt ? 1 : 0) : null,
      data.displayOrder,
      id
    );

    return this.getAttributes().find((a) => a.id === id);
  }

  static deleteAttribute(id: string) {
    db.prepare('DELETE FROM schema_attributes WHERE id = ?').run(id);
    return { success: true };
  }
}
