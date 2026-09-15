import { RawPrinterService } from './raw-printer.service.js';
import { CONFIG } from '../config/index.js';

export interface TscLabelItem {
  name: string;
  categoryName?: string;
  color?: string;
  size?: string;
  sellingPrice: number;
  sku: string;
  barcode: string;
  quantity?: number;
}

export interface TscPrintOptions {
  widthMm?: number;
  heightMm?: number;
  gapMm?: number;
  speed?: number;
  density?: number;
  direction?: 0 | 1;
  storeName?: string;
}

/**
 * Dedicated TSC TTP-244 Pro & TSPL-EZ Command Engine
 */
export class TscPrinterService {
  /**
   * Generates native TSPL command string for TSC Label Printers
   */
  static generateTspl(
    items: TscLabelItem[],
    options: TscPrintOptions = {}
  ): string {
    const width = options.widthMm || 50;
    const height = options.heightMm || 30;
    const gap = options.gapMm || 2;
    const speed = options.speed || 4;
    const density = options.density || 8;
    const direction = options.direction !== undefined ? options.direction : 1;
    const store = (options.storeName || CONFIG.STORE_NAME || 'BRAND 4 LESS').toUpperCase();

    let commands = '';

    // Global Printer Config header
    commands += `SPEED ${speed}\r\n`;
    commands += `DENSITY ${density}\r\n`;
    commands += `DIRECTION ${direction}\r\n`;
    commands += `OFFSET 0 mm\r\n`;

    const sanitizeText = (str: string) => (str || '').replace(/"/g, '\\"').replace(/[\r\n]/g, ' ').trim();

    items.forEach((item) => {
      const code = (item.barcode || item.sku || '').trim().toUpperCase();
      if (!code) {
        throw new Error(`Cannot generate TSPL label for "${item.name || 'product'}": Barcode and SKU are both empty.`);
      }
      const title = sanitizeText(item.name || 'Apparel').substring(0, 24);
      const category = sanitizeText(item.categoryName || '').toUpperCase().substring(0, 14);
      const attr = sanitizeText([item.color || '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | '));
      const skuStr = sanitizeText(item.sku || code);
      const storeStr = sanitizeText(store);
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

      commands += `SIZE ${width} mm,${height} mm\r\n`;
      commands += `GAP ${gap} mm,0\r\n`;
      commands += `DIRECTION ${direction}\r\n`;
      commands += `CLS\r\n`;

      // 1. Store Header & Category
      commands += `TEXT 15,12,"2",0,1,1,"${storeStr}"\r\n`;
      if (category) {
        commands += `TEXT 250,12,"1",0,1,1,"${category}"\r\n`;
      }

      // 2. Product Name
      commands += `TEXT 15,36,"2",0,1,1,"${title}"\r\n`;

      // 3. Variant Attributes (Color & Size)
      if (attr) {
        commands += `TEXT 15,58,"1",0,1,1,"${attr}"\r\n`;
      }

      // 4. Real Code 128 Barcode: BARCODE X, Y, "CodeType", height, human_readable, rotation, narrow, wide, "content"
      // "128" instructs the TSC firmware to generate a genuine ISO/IEC 15417 Code 128 barcode
      commands += `BARCODE 15,78,"128",48,1,0,2,4,"${code}"\r\n`;

      // 5. Retail Price and SKU Footer
      commands += `TEXT 15,152,"2",0,1,1,"PKR ${Number(item.sellingPrice).toLocaleString()}"\r\n`;
      commands += `TEXT 240,154,"1",0,1,1,"${skuStr}"\r\n`;

      // 6. Print command for requested quantity of this item
      commands += `PRINT ${qty},1\r\n`;
    });

    return commands;
  }

  /**
   * Validates TSPL command string against hardware specification requirements
   */
  static validateTspl(tspl: string): {
    isValid: boolean;
    checks: {
      hasSize: boolean;
      hasGap: boolean;
      hasCls: boolean;
      hasBarcode: boolean;
      isBarcode128: boolean;
      hasBarcode128: boolean;
      hasBarcodeData: boolean;
      hasPrint: boolean;
    };
    errors: string[];
    commandsCount: number;
    breakdown: { line: number; command: string; raw: string; desc: string }[];
  } {
    const lines = (tspl || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    const hasSize = lines.some((l) => /^SIZE\s+\d+(\.\d+)?\s*mm\s*,\s*\d+(\.\d+)?/i.test(l));
    const hasGap = lines.some((l) => /^GAP\s+\d+(\.\d+)?\s*mm\s*,\s*\d+(\.\d+)?/i.test(l));
    const hasCls = lines.some((l) => /^CLS/i.test(l));
    const barcodeLine = lines.find((l) => /^BARCODE\s+/i.test(l));
    const hasBarcode = !!barcodeLine;
    const isBarcode128 = !!(barcodeLine && barcodeLine.includes('"128"'));
    const hasBarcodeData = !!(barcodeLine && /"[^"]+"$/.test(barcodeLine));
    const hasPrint = lines.some((l) => /^PRINT\s+\d+/i.test(l));

    const errors: string[] = [];
    if (!hasSize) errors.push('Missing "SIZE" command');
    if (!hasGap) errors.push('Missing "GAP" command');
    if (!hasCls) errors.push('Missing "CLS" command');
    if (!hasBarcode) errors.push('Missing "BARCODE" command');
    else {
      if (!isBarcode128) errors.push('Barcode type must be Code 128 ("128")');
      if (!hasBarcodeData) errors.push('Barcode payload missing or invalid');
    }
    if (!hasPrint) errors.push('Missing "PRINT" command');

    const breakdown = lines.map((line, index) => {
      const match = line.match(/^([A-Z]+)/i);
      const command = match ? match[1].toUpperCase() : 'UNKNOWN';
      return {
        line: index + 1,
        command,
        raw: line,
        desc: `Command: ${command}`
      };
    });

    return {
      isValid: errors.length === 0,
      checks: {
        hasSize,
        hasGap,
        hasCls,
        hasBarcode,
        isBarcode128,
        hasBarcode128: isBarcode128,
        hasBarcodeData,
        hasPrint,
      },
      errors,
      commandsCount: lines.length,
      breakdown,
    };
  }

  /**
   * Dispatches TSPL label batch to specified TSC printer
   */
  static async printLabels(
    items: TscLabelItem[],
    printerName: string,
    options: TscPrintOptions = {}
  ): Promise<{ success: boolean; message: string; tspl: string }> {
    const tspl = this.generateTspl(items, options);
    const result = await RawPrinterService.sendRaw(printerName, tspl, 'TSC Label Batch');
    return {
      success: result.success,
      message: result.message,
      tspl,
    };
  }

  /**
   * Diagnostic Test Label for TSC TTP-244 Pro
   */
  static async testLabel(
    printerName?: string,
    options: TscPrintOptions = {}
  ): Promise<{ success: boolean; message: string; tspl: string }> {
    const testItems: TscLabelItem[] = [
      {
        name: 'TEST PRODUCT',
        categoryName: 'TESTING',
        color: 'BLACK',
        size: 'L',
        sellingPrice: 1850,
        sku: 'TEST-001',
        barcode: '8901234567890',
        quantity: 1,
      },
    ];

    const tspl = this.generateTspl(testItems, options);

    if (printerName) {
      await RawPrinterService.sendRaw(printerName, tspl, 'TSC Diagnostic Test');
      return {
        success: true,
        message: `Diagnostic test label sent to TSC printer "${printerName}".`,
        tspl,
      };
    }

    return {
      success: true,
      message: 'TSPL diagnostic test label generated successfully.',
      tspl,
    };
  }

  /**
   * Hardware Calibration Action for TSC TTP-244 Pro
   */
  static async calibrate(
    printerName: string,
    options: { sensorType?: 'GAP' | 'BLINE'; widthMm?: number; heightMm?: number } = {}
  ): Promise<{ success: boolean; message: string }> {
    if (!printerName) {
      throw new Error('Printer name is required to calibrate TSC label printer');
    }

    const width = options.widthMm || 50;
    const height = options.heightMm || 30;

    // TSPL Calibration Command Sequence for standard die-cut gap labels
    let calibrateCommands = `SIZE ${width} mm, ${height} mm\n`;
    calibrateCommands += `GAP 2 mm, 0 mm\n`;
    calibrateCommands += `DIRECTION 1\n`;
    calibrateCommands += `GAPDETECT\n`;

    await RawPrinterService.sendRaw(printerName, calibrateCommands, 'TSC Sensor Calibration');

    return {
      success: true,
      message: `Calibration command dispatched to TSC printer "${printerName}". The printer will feed and align gap sensors.`,
    };
  }
}
