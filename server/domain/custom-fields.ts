export interface SchemaAttributeDef {
  id: string;
  name: string;
  code: string;
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
  options?: string[];
  isRequired: boolean;
  isVariantLevel: boolean;
  isSearchable: boolean;
  isPrintableOnLabel: boolean;
  isPrintableOnReceipt: boolean;
  displayOrder: number;
}

/**
 * Validates a dictionary of custom attributes against the active schema definitions
 */
export function validateCustomAttributes(
  attributesMap: Record<string, any>,
  schemaDefs: SchemaAttributeDef[]
): { isValid: boolean; errors: string[]; sanitized: Record<string, any> } {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  for (const def of schemaDefs) {
    const rawVal = attributesMap[def.code];

    // Check required fields
    if (def.isRequired && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
      errors.push(`Field "${def.name}" (${def.code}) is required.`);
      continue;
    }

    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      continue;
    }

    // Type validation & sanitation
    if (def.dataType === 'NUMBER') {
      const num = Number(rawVal);
      if (isNaN(num)) {
        errors.push(`Field "${def.name}" must be a valid number.`);
      } else {
        sanitized[def.code] = num;
      }
    } else if (def.dataType === 'BOOLEAN') {
      sanitized[def.code] = Boolean(rawVal);
    } else if (def.dataType === 'SELECT') {
      const strVal = String(rawVal).trim();
      sanitized[def.code] = strVal;
    } else if (def.dataType === 'MULTISELECT') {
      if (Array.isArray(rawVal)) {
        sanitized[def.code] = rawVal;
      } else {
        sanitized[def.code] = [String(rawVal).trim()];
      }
    } else {
      sanitized[def.code] = String(rawVal).trim();
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}
