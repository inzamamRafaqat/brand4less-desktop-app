import { RawPrinterService } from './raw-printer.service.js';
import { CONFIG } from '../config/index.js';

export interface DtsReceiptOptions {
  width?: '80mm' | '58mm';
  autoCut?: boolean;
  kickDrawer?: boolean;
}

/**
 * Dedicated DTS Thermal Receipt Printer & ESC/POS Command Engine
 */
export class DtsPrinterService {
  /**
   * Generates standard ESC/POS binary buffer for thermal receipt printers
   */
  static generateEscPosReceipt(
    sale: any,
    options: DtsReceiptOptions = {}
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
    append(`${CONFIG.STORE_NAME || 'BRANDS 4 LESS'}\n`);
    appendBytes([0x1d, 0x21, 0x00]); // Normal size

    if (CONFIG.STORE_TAGLINE) append(`${CONFIG.STORE_TAGLINE}\n`);
    if (CONFIG.STORE_ADDRESS) append(`${CONFIG.STORE_ADDRESS}\n`);
    if (CONFIG.STORE_PHONE) append(`Tel: ${CONFIG.STORE_PHONE}\n`);
    append('-'.repeat(cols) + '\n');

    // 3. Left Alignment: ESC a 0
    appendBytes([0x1b, 0x61, 0x00]);
    append(`Invoice #: ${sale.invoice_number || sale.invoiceNumber || 'INV-0001'}\n`);
    append(`Date/Time: ${new Date(sale.created_at || sale.createdAt || Date.now()).toLocaleString()}\n`);
    append(`Cashier  : ${sale.cashier_name || sale.cashierName || 'Staff'}\n`);
    
    const custName = sale.customer_name || sale.customerName;
    const custPhone = sale.customer_phone || sale.customerPhone;
    if (custName && custName !== 'Walk-in Customer') {
      append(`Customer : ${custName} ${custPhone ? '(' + custPhone + ')' : ''}\n`);
    }

    append('='.repeat(cols) + '\n');
    if (is80mm) {
      append(`Item                 Qty   Price    Total\n`);
    } else {
      append(`Item          Qty  Price Total\n`);
    }
    append('-'.repeat(cols) + '\n');

    // 4. Line Items
    const items = sale.items || [];
    items.forEach((it: any) => {
      const name = (it.name || it.product_name || 'Item').substring(0, is80mm ? 18 : 12);
      const qty = String(it.quantity || 1).padStart(is80mm ? 3 : 2, ' ');
      const price = String(Math.round(Number(it.unit_price || it.unitPrice || 0))).padStart(is80mm ? 7 : 5, ' ');
      const total = String(Math.round(Number(it.subtotal || (Number(it.unit_price || it.unitPrice || 0) * Number(it.quantity || 1))))).padStart(is80mm ? 8 : 6, ' ');
      append(`${name.padEnd(is80mm ? 18 : 12, ' ')} ${qty} ${price} ${total}\n`);
    });

    append('='.repeat(cols) + '\n');

    // 5. Financial Totals (Right Aligned: ESC a 2)
    appendBytes([0x1b, 0x61, 0x02]);
    append(`Subtotal: PKR ${Number(sale.subtotal || sale.net_total || sale.netTotal || 0).toLocaleString()}\n`);
    const discount = Number(sale.discount_amount || sale.discountAmount || 0);
    if (discount > 0) {
      append(`Discount: -PKR ${discount.toLocaleString()}\n`);
    }

    // Bold Double Size Total: ESC E 1, GS ! 0x01
    appendBytes([0x1b, 0x45, 0x01, 0x1d, 0x21, 0x01]);
    append(`NET TOTAL: PKR ${Number(sale.net_total || sale.netTotal || 0).toLocaleString()}\n`);
    appendBytes([0x1b, 0x45, 0x00, 0x1d, 0x21, 0x00]);

    append(`Paid Method: ${sale.payment_method || sale.paymentMethod || 'CASH'}\n`);
    const paid = Number(sale.paid_amount || sale.paidAmount || 0);
    if (paid > 0) {
      append(`Amount Paid: PKR ${paid.toLocaleString()}\n`);
    }
    const khata = Number(sale.khata_amount || sale.khataAmount || 0);
    if (khata > 0) {
      append(`Charged to Khata: PKR ${khata.toLocaleString()}\n`);
    }

    // 6. Return Policy & Barcode
    appendBytes([0x1b, 0x61, 0x01]);
    append('\n' + (CONFIG.RECEIPT_RETURN_POLICY || 'Exchange within 7 days with tag.') + '\n');
    append('*** THANK YOU FOR SHOPPING WITH US ***\n\n\n');

    // 7. Paper Cut: GS V 66 0
    if (options.autoCut !== false) {
      appendBytes([0x1d, 0x56, 0x42, 0x00]);
    }

    // 8. Kick Cash Drawer (Pin 2, 25ms on, 250ms off): ESC p 0 25 250
    if (options.kickDrawer !== false && (sale.payment_method === 'CASH' || sale.paymentMethod === 'CASH')) {
      appendBytes([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Diagnostic Test Slip for DTS Thermal Receipt Printer
   */
  static generateTestReceiptBuffer(options: DtsReceiptOptions = {}): Buffer {
    const is80mm = (options.width || '80mm') === '80mm';
    const cols = is80mm ? 42 : 30;
    const chunks: Buffer[] = [];

    const append = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const appendBytes = (bytes: number[]) => chunks.push(Buffer.from(bytes));

    // Initialize & Center
    appendBytes([0x1b, 0x40]);
    appendBytes([0x1b, 0x61, 0x01]);

    // Bold Header
    appendBytes([0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11]);
    append('BRANDS 4 LESS\n');
    appendBytes([0x1d, 0x21, 0x00]);
    append('PRINTER TEST\n');
    append('-'.repeat(cols) + '\n');

    // Left alignment
    appendBytes([0x1b, 0x61, 0x00]);
    append(`Product: Test Product\n`);
    append(`Qty: 1\n`);
    append(`Price: PKR 100\n`);
    append(`Total: PKR 100\n`);
    append('-'.repeat(cols) + '\n');

    // Center Footer
    appendBytes([0x1b, 0x61, 0x01]);
    append('Hardware Test Successful\n\n\n');

    // Cut
    if (options.autoCut !== false) {
      appendBytes([0x1d, 0x56, 0x42, 0x00]);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Dispatches receipt print job to specified DTS printer
   */
  static async printReceipt(
    sale: any,
    printerName: string,
    options: DtsReceiptOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    const buffer = this.generateEscPosReceipt(sale, options);
    const result = await RawPrinterService.sendRaw(printerName, buffer, 'DTS Thermal Receipt');
    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Dispatches test receipt to DTS printer
   */
  static async testReceipt(
    printerName?: string,
    options: DtsReceiptOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    const buffer = this.generateTestReceiptBuffer(options);

    if (printerName) {
      await RawPrinterService.sendRaw(printerName, buffer, 'DTS Hardware Test');
      return {
        success: true,
        message: `Hardware test receipt sent to DTS printer "${printerName}".`,
      };
    }

    return {
      success: true,
      message: 'Hardware test receipt buffer generated successfully.',
    };
  }

  /**
   * Decodes ESC/POS buffer into readable command interpretation, hex dump, and byte count
   */
  static parseEscPosCommands(buffer: Buffer): {
    byteLength: number;
    hexDump: string;
    interpretedCommands: Array<{ byteRange: string; name: string; detail?: string }>;
    commandBreakdown: Array<{ offset: string; hex: string; desc: string }>;
    parsedCommands: Array<{ byteRange: string; name: string; detail?: string }>;
  } {
    const bytes = Array.from(buffer || []);
    const hexDump = bytes.map((b) => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const interpreted: Array<{ byteRange: string; name: string; detail?: string }> = [];

    let i = 0;
    while (i < bytes.length) {
      if (bytes[i] === 0x1b && bytes[i + 1] === 0x40) {
        interpreted.push({ byteRange: `[${i}..${i + 1}]`, name: 'ESC @', detail: 'Initialize Printer' });
        i += 2;
      } else if (bytes[i] === 0x1b && bytes[i + 1] === 0x61) {
        const align = bytes[i + 2] === 0 ? 'LEFT' : bytes[i + 2] === 1 ? 'CENTER' : 'RIGHT';
        interpreted.push({ byteRange: `[${i}..${i + 2}]`, name: 'ESC a n', detail: `Set Alignment: ${align}` });
        i += 3;
      } else if (bytes[i] === 0x1b && bytes[i + 1] === 0x45) {
        const bold = bytes[i + 2] === 1 ? 'ON' : 'OFF';
        interpreted.push({ byteRange: `[${i}..${i + 2}]`, name: 'ESC E n', detail: `Bold Mode: ${bold}` });
        i += 3;
      } else if (bytes[i] === 0x1d && bytes[i + 1] === 0x21) {
        interpreted.push({ byteRange: `[${i}..${i + 2}]`, name: 'GS ! n', detail: `Character Size: 0x${bytes[i + 2].toString(16).toUpperCase()}` });
        i += 3;
      } else if (bytes[i] === 0x1d && bytes[i + 1] === 0x56) {
        interpreted.push({ byteRange: `[${i}..${i + 3}]`, name: 'GS V m n', detail: 'Cut Paper (Partial/Full Cut)' });
        i += 4;
      } else if (bytes[i] === 0x1b && bytes[i + 1] === 0x70) {
        interpreted.push({ byteRange: `[${i}..${i + 4}]`, name: 'ESC p m t1 t2', detail: 'Kick Cash Drawer Pulse' });
        i += 5;
      } else {
        let textStr = '';
        const start = i;
        while (i < bytes.length && bytes[i] !== 0x1b && bytes[i] !== 0x1d) {
          textStr += String.fromCharCode(bytes[i]);
          i++;
        }
        if (textStr) {
          const clean = textStr.replace(/\n/g, '\\n').replace(/\r/g, '');
          interpreted.push({
            byteRange: `[${start}..${i - 1}]`,
            name: 'TEXT PAYLOAD',
            detail: `"${clean.substring(0, 50)}${clean.length > 50 ? '...' : ''}"`,
          });
        }
      }
    }

    return {
      byteLength: buffer.length,
      hexDump,
      interpretedCommands: interpreted,
      commandBreakdown: interpreted.map((c) => ({ offset: c.byteRange, hex: c.name, desc: c.detail || '' })),
      parsedCommands: interpreted,
    };
  }
}
