import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CONFIG } from '../config/index.js';
import { getDb } from '../database/db.js';

const execPromise = util.promisify(exec);

export interface PrinterDevice {
  name: string;
  driverName: string;
  portName: string;
  status: number;
  isDefault?: boolean;
}

export interface HardwareSettings {
  labelPrinterName: string;
  labelPrinterType: 'TSC_TSPL' | 'WINDOWS_GENERIC' | 'PDF';
  labelWidthMm: number;
  labelHeightMm: number;
  receiptPrinterName: string;
  receiptPrinterType: 'DTS_ESCPOS' | 'WINDOWS_GENERIC';
  receiptWidthMm: number;
  autoCutReceipt: boolean;
  kickCashDrawer: boolean;
  scannerMode: 'SPEEDX_KEYBOARD_WEDGE' | 'SERIAL_COM';
  scannerBeep: boolean;
}

export class HardwareService {
  /**
   * Retrieves all installed local and network printers on Windows system
   */
  static async getConnectedPrinters(): Promise<PrinterDevice[]> {
    if (process.platform !== 'win32') {
      return [
        { name: 'TSC TE200 (Mock Driver)', driverName: 'TSC TSPL Driver', portName: 'USB001', status: 0 },
        { name: 'DTS 80mm Thermal (Mock Driver)', driverName: 'POS-80 Driver', portName: 'USB002', status: 0 },
        { name: 'Microsoft Print to PDF', driverName: 'Microsoft Print To PDF', portName: 'PORTPROMPT:', status: 0 },
      ];
    }

    try {
      const psCommand = `Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json`;
      const { stdout } = await execPromise(`powershell -NoProfile -Command "${psCommand}"`);
      if (!stdout || !stdout.trim()) return [];

      const parsed = JSON.parse(stdout);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      return list.map((p: any) => ({
        name: p.Name || '',
        driverName: p.DriverName || '',
        portName: p.PortName || '',
        status: p.PrinterStatus !== undefined ? p.PrinterStatus : 0,
      }));
    } catch (err) {
      console.error('Error querying Windows printers:', err);
      return [];
    }
  }

  /**
   * Generates native TSPL / TSPL2 command batch for TSC Brand Label Printers
   */
  static generateTsplCommands(
    items: {
      name: string;
      categoryName?: string;
      color?: string;
      size?: string;
      sellingPrice: number;
      sku: string;
      barcode: string;
    }[],
    options: {
      widthMm?: number;
      heightMm?: number;
      gapMm?: number;
      storeName?: string;
    } = {}
  ): string {
    const width = options.widthMm || 50;
    const height = options.heightMm || 30;
    const gap = options.gapMm || 2;
    const store = (options.storeName || CONFIG.STORE_NAME || 'BRAND 4 LESS').toUpperCase();

    let commands = '';

    items.forEach((item) => {
      const code = (item.barcode || item.sku || '000000').toUpperCase();
      const title = (item.name || 'Apparel').substring(0, 24);
      const attr = [item.color || '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ');

      commands += `SIZE ${width} mm, ${height} mm\n`;
      commands += `GAP ${gap} mm, 0 mm\n`;
      commands += `DIRECTION 1\n`;
      commands += `CLS\n`;
      // Header: Store Name
      commands += `TEXT 15,12,"2",0,1,1,"${store}"\n`;
      if (item.categoryName) {
        commands += `TEXT 250,12,"1",0,1,1,"${item.categoryName.toUpperCase()}"\n`;
      }
      // Product Title
      commands += `TEXT 15,36,"2",0,1,1,"${title}"\n`;
      // Variant (Color & Size)
      if (attr) {
        commands += `TEXT 15,58,"1",0,1,1,"${attr}"\n`;
      }
      // Code 128 Barcode: BARCODE X, Y, "CodeType", height, readable, rotate, narrow, wide, "content"
      commands += `BARCODE 15,78,"128",48,1,0,2,4,"${code}"\n`;
      // Price & SKU footer
      commands += `TEXT 15,152,"2",0,1,1,"PKR ${Number(item.sellingPrice).toLocaleString()}"\n`;
      commands += `TEXT 240,154,"1",0,1,1,"${item.sku}"\n`;
      commands += `PRINT 1,1\n\n`;
    });

    return commands;
  }

  /**
   * Generates standard ESC/POS binary buffer for DTS Thermal Receipt Printers
   */
  static generateEscPosReceipt(
    sale: any,
    options: {
      width?: '80mm' | '58mm';
      autoCut?: boolean;
      kickDrawer?: boolean;
    } = {}
  ): Buffer {
    const is80mm = (options.width || '80mm') === '80mm';
    const cols = is80mm ? 42 : 30;
    const chunks: Buffer[] = [];

    const append = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const appendBytes = (bytes: number[]) => chunks.push(Buffer.from(bytes));

    // 1. Initialize Printer: ESC @
    appendBytes([0x1b, 0x40]);

    // 2. Center Alignment: ESC a 1
    appendBytes([0x1b, 0x61, 0x01]);

    // Bold On: ESC E 1, Double Height & Width: GS ! 0x11
    appendBytes([0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11]);
    append(`${CONFIG.STORE_NAME}\n`);
    appendBytes([0x1d, 0x21, 0x00]); // Normal size

    if (CONFIG.STORE_TAGLINE) append(`${CONFIG.STORE_TAGLINE}\n`);
    if (CONFIG.STORE_ADDRESS) append(`${CONFIG.STORE_ADDRESS}\n`);
    if (CONFIG.STORE_PHONE) append(`Tel: ${CONFIG.STORE_PHONE}\n`);
    append('------------------------------------------\n'.substring(0, cols) + '\n');

    // 3. Left Alignment: ESC a 0
    appendBytes([0x1b, 0x61, 0x00]);
    append(`Invoice #: ${sale.invoice_number || 'INV-0001'}\n`);
    append(`Date/Time: ${new Date(sale.created_at || Date.now()).toLocaleString()}\n`);
    append(`Cashier  : ${sale.cashier_name || 'Staff'}\n`);
    if (sale.customer_name && sale.customer_name !== 'Walk-in Customer') {
      append(`Customer : ${sale.customer_name} ${sale.customer_phone ? '(' + sale.customer_phone + ')' : ''}\n`);
    }

    append('==========================================\n'.substring(0, cols) + '\n');
    append(`Item                 Qty   Price    Total\n`.substring(0, cols) + '\n');
    append('------------------------------------------\n'.substring(0, cols) + '\n');

    // 4. Line Items
    const items = sale.items || [];
    items.forEach((it: any) => {
      const name = (it.product_name || it.name || 'Item').substring(0, 18);
      const qty = String(it.quantity || 1).padStart(3, ' ');
      const price = String(Math.round(Number(it.unit_price || it.unitPrice || 0))).padStart(7, ' ');
      const total = String(Math.round(Number(it.subtotal || (Number(it.unit_price || 0) * Number(it.quantity || 1))))).padStart(8, ' ');
      append(`${name.padEnd(18, ' ')} ${qty} ${price} ${total}\n`);
    });

    append('==========================================\n'.substring(0, cols) + '\n');

    // 5. Financial Totals (Right Aligned: ESC a 2)
    appendBytes([0x1b, 0x61, 0x02]);
    append(`Subtotal: PKR ${Number(sale.subtotal || sale.net_total || 0).toLocaleString()}\n`);
    if (Number(sale.discount_amount || 0) > 0) {
      append(`Discount: -PKR ${Number(sale.discount_amount).toLocaleString()}\n`);
    }

    // Bold Double Size Total: ESC E 1, GS ! 0x01
    appendBytes([0x1b, 0x45, 0x01, 0x1d, 0x21, 0x01]);
    append(`NET TOTAL: PKR ${Number(sale.net_total || 0).toLocaleString()}\n`);
    appendBytes([0x1b, 0x45, 0x00, 0x1d, 0x21, 0x00]);

    append(`Paid Method: ${sale.payment_method || 'CASH'}\n`);
    if (Number(sale.paid_amount || 0) > 0) {
      append(`Amount Paid: PKR ${Number(sale.paid_amount).toLocaleString()}\n`);
    }
    if (Number(sale.khata_amount || 0) > 0) {
      append(`Charged to Khata: PKR ${Number(sale.khata_amount).toLocaleString()}\n`);
    }

    // 6. Return Policy & Barcode
    appendBytes([0x1b, 0x61, 0x01]);
    append('\n' + (CONFIG.RECEIPT_RETURN_POLICY || 'Exchange within 7 days with tag.') + '\n');
    append('*** THANK YOU FOR SHOPPING WITH US ***\n\n');

    // 7. Paper Cut: GS V 66 0
    if (options.autoCut !== false) {
      appendBytes([0x1d, 0x56, 0x42, 0x00]);
    }

    // 8. Kick Cash Drawer (Pin 2, 25ms on, 250ms off): ESC p 0 25 250
    if (options.kickDrawer !== false && sale.payment_method === 'CASH') {
      appendBytes([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Dispatches raw data to local Windows printer using PowerShell / Raw Print Spooler
   */
  static async sendRawToPrinter(printerName: string, rawData: Buffer | string): Promise<boolean> {
    if (process.platform !== 'win32') {
      console.log(`[Mock Printer Dispatch to "${printerName}"]:\n`, typeof rawData === 'string' ? rawData : `[Buffer ${rawData.length} bytes]`);
      return true;
    }

    try {
      const tempPath = path.join(os.tmpdir(), `brand4less_raw_${Date.now()}.prn`);
      if (typeof rawData === 'string') {
        fs.writeFileSync(tempPath, rawData, 'utf-8');
      } else {
        fs.writeFileSync(tempPath, rawData);
      }

      // Send to Windows Spooler using Out-Printer or raw spooler copy
      const command = `powershell -NoProfile -Command "Get-Content -Path '${tempPath.replace(/'/g, "''")}' -Raw | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
      await execPromise(command);

      // Cleanup
      setTimeout(() => {
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
      }, 2000);

      return true;
    } catch (err) {
      console.error(`Failed to dispatch raw print to printer "${printerName}":`, err);
      throw err;
    }
  }

  /**
   * Diagnostic Test: Prints a sample barcode label on TSC Brand Label Printer
   */
  static async testTscPrinter(printerName?: string): Promise<{ success: boolean; tspl: string; message: string }> {
    const testItems = [
      {
        name: 'Classic Cotton Polo Shirt',
        categoryName: 'Men Shirts',
        color: 'Navy Blue',
        size: 'L',
        sellingPrice: 1850,
        sku: 'B4L-TSH-TEST',
        barcode: '8901234567890',
      },
    ];

    const tspl = this.generateTsplCommands(testItems, { widthMm: 50, heightMm: 30, gapMm: 2 });

    if (printerName) {
      await this.sendRawToPrinter(printerName, tspl);
    }

    return {
      success: true,
      tspl,
      message: printerName
        ? `Test label command successfully sent to TSC Printer "${printerName}".`
        : 'TSPL test commands generated successfully for TSC printer.',
    };
  }

  /**
   * Diagnostic Test: Prints a sample receipt slip on DTS Thermal Receipt Printer
   */
  static async testDtsPrinter(printerName?: string): Promise<{ success: boolean; message: string }> {
    const mockSale = {
      invoice_number: 'INV-TEST-0001',
      created_at: new Date().toISOString(),
      cashier_name: 'Admin Station',
      customer_name: 'SpeedX Hardware Test',
      customer_phone: '0300-1234567',
      subtotal: 3500,
      discount_amount: 500,
      net_total: 3000,
      paid_amount: 3000,
      payment_method: 'CASH',
      items: [
        { product_name: 'Polo Shirt Navy', quantity: 1, unit_price: 1850, subtotal: 1850 },
        { product_name: 'Chino Pant Beige', quantity: 1, unit_price: 1650, subtotal: 1650 },
      ],
    };

    const escposBuffer = this.generateEscPosReceipt(mockSale, { width: '80mm', autoCut: true, kickDrawer: true });

    if (printerName) {
      await this.sendRawToPrinter(printerName, escposBuffer);
    }

    return {
      success: true,
      message: printerName
        ? `Test receipt command successfully sent to DTS Thermal Printer "${printerName}".`
        : 'ESC/POS test receipt generated successfully for DTS printer.',
    };
  }
}
