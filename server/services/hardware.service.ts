import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OrganizationService } from './organization.service.js';

const execAsync = util.promisify(exec);

export class HardwareService {
  /**
   * Enumerate installed Windows Printers
   */
  static async getConnectedPrinters(): Promise<{ name: string; driverName: string; isDefault: boolean }[]> {
    try {
      const psCommand = `powershell -NoProfile -Command "Get-Printer | Select-Object Name, DriverName | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand);
      if (!stdout || !stdout.trim()) return [];

      const parsed = JSON.parse(stdout);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      return list.map((p: any) => ({
        name: p.Name,
        driverName: p.DriverName,
        isDefault: false,
      }));
    } catch (err) {
      console.warn('Could not query Windows printers:', err);
      return [
        { name: 'TSC TE200 Label Printer', driverName: 'TSC TSPL Driver', isDefault: true },
        { name: 'DTS POS-80 Thermal Printer', driverName: 'Generic / Text Only', isDefault: false },
      ];
    }
  }

  /**
   * Native TSPL/TSPL2 Command Generator for TSC Label Printers
   */
  static generateTsplCommands(
    items: { name: string; sku: string; barcode: string; price: number; attributes?: Record<string, any> }[],
    widthMm: number = 50,
    heightMm: number = 30,
    storeName: string = 'OmniRetail'
  ): string {
    let tspl = '';
    for (const it of items) {
      const barcodeVal = it.barcode || it.sku;
      const attrSummary = Object.entries(it.attributes || {})
        .slice(0, 2)
        .map(([k, v]) => `${v}`)
        .join(' / ');

      tspl += `SIZE ${widthMm} mm, ${heightMm} mm\n`;
      tspl += `GAP 2 mm, 0 mm\n`;
      tspl += `DIRECTION 1\n`;
      tspl += `CLS\n`;
      tspl += `TEXT 20,20,"3",0,1,1,"${storeName.toUpperCase().slice(0, 24)}"\n`;
      tspl += `TEXT 20,50,"2",0,1,1,"${it.name.slice(0, 26)}"\n`;
      if (attrSummary) {
        tspl += `TEXT 20,75,"1",0,1,1,"${attrSummary.slice(0, 30)}"\n`;
      }
      tspl += `BARCODE 20,95,"128",48,1,0,2,2,"${barcodeVal}"\n`;
      tspl += `TEXT 20,150,"1",0,1,1,"SKU: ${it.sku}"\n`;
      tspl += `TEXT 20,175,"3",0,1,1,"PRICE: Rs. ${Number(it.price || 0).toLocaleString()}"\n`;
      tspl += `PRINT 1, 1\n\n`;
    }
    return tspl;
  }

  /**
   * Native ESC/POS Command Generator for DTS Brand Thermal Receipt Printers
   */
  static generateEscPosReceipt(
    sale: any,
    org: any,
    options: { width?: '80mm' | '58mm'; autoCut?: boolean; kickDrawer?: boolean } = {}
  ): Buffer {
    const commands: number[] = [];

    const append = (bytes: number[]) => commands.push(...bytes);
    const appendText = (text: string) => {
      for (let i = 0; i < text.length; i++) {
        commands.push(text.charCodeAt(i));
      }
    };

    // ESC/POS Constants
    const ESC = 0x1b;
    const GS = 0x1d;

    // 1. Initialize Printer
    append([ESC, 0x40]);

    // 2. Center Align Header
    append([ESC, 0x61, 0x01]);
    append([ESC, 0x45, 0x01]); // Bold ON
    append([ESC, 0x21, 0x20]); // Double height/width
    appendText(`${(org?.name || 'OMNIRETAIL').toUpperCase()}\n`);
    append([ESC, 0x21, 0x00]); // Normal size
    append([ESC, 0x45, 0x00]); // Bold OFF

    if (org?.tagline) appendText(`${org.tagline}\n`);
    if (org?.address) appendText(`${org.address}\n`);
    if (org?.phone) appendText(`Helpline: ${org.phone}\n`);

    // Separator line
    appendText('------------------------------------------------\n');

    // 3. Left Align Invoice Details
    append([ESC, 0x61, 0x00]);
    appendText(`Invoice #: ${sale.invoiceNumber || sale.invoice_number || 'INV-001'}\n`);
    appendText(`Date/Time: ${new Date(sale.createdAt || sale.created_at || Date.now()).toLocaleString()}\n`);
    appendText(`Cashier  : ${sale.cashierName || 'Staff Cashier'}\n`);
    if (sale.customerName && sale.customerName !== 'Walk-in Customer') {
      appendText(`Customer : ${sale.customerName} ${sale.customerPhone ? '(' + sale.customerPhone + ')' : ''}\n`);
    }

    appendText('================================================\n');
    appendText('Item Description               Qty    Rate   Total\n');
    appendText('------------------------------------------------\n');

    // 4. Line Items
    for (const it of sale.items || []) {
      const name = (it.name || it.product_name || 'Item').slice(0, 24).padEnd(26);
      const qty = String(it.quantity || 1).padStart(4);
      const price = String(Math.round(it.unitPrice || it.unit_price || 0)).padStart(7);
      const total = String(Math.round(it.subtotal || 0)).padStart(8);
      appendText(`${name}${qty}${price}${total}\n`);
    }

    appendText('------------------------------------------------\n');

    // 5. Right Align Totals
    append([ESC, 0x61, 0x02]);
    appendText(`Subtotal: Rs. ${Number(sale.subtotal || 0).toLocaleString()}\n`);
    if (sale.discountAmount > 0) {
      appendText(`Discount: -Rs. ${Number(sale.discountAmount).toLocaleString()}\n`);
    }
    if (sale.taxAmount > 0) {
      appendText(`Tax (${org?.tax_label || 'GST'}): Rs. ${Number(sale.taxAmount).toLocaleString()}\n`);
    }

    append([ESC, 0x45, 0x01]); // Bold
    appendText(`NET TOTAL: Rs. ${Number(sale.netTotal || sale.net_total || 0).toLocaleString()}\n`);
    append([ESC, 0x45, 0x00]); // Bold OFF

    appendText(`Payment (${sale.paymentMethod || 'CASH'}): Rs. ${Number(sale.paidAmount || sale.netTotal || 0).toLocaleString()}\n`);
    if (sale.changeAmount > 0) {
      appendText(`Change Returned: Rs. ${Number(sale.changeAmount).toLocaleString()}\n`);
    }

    // 6. Center Footer & Return Policy
    append([ESC, 0x61, 0x01]);
    appendText('------------------------------------------------\n');
    appendText(`${org?.return_policy || 'Exchange within 7 days with receipt. No cash refunds.'}\n\n`);
    appendText('*** THANK YOU FOR YOUR VISIT ***\n\n\n');

    // 7. Auto Paper Cut
    if (options.autoCut !== false) {
      append([GS, 0x56, 0x42, 0x00]); // Full Cut
    }

    // 8. Cash Drawer Kick Pulse (Pin 2: 25ms on, 250ms off)
    if (options.kickDrawer !== false) {
      append([ESC, 0x70, 0x00, 0x19, 0xfa]);
    }

    return Buffer.from(commands);
  }

  /**
   * Dispatch Raw Command Stream to Windows Spooler
   */
  static async sendRawToPrinter(printerName: string, rawData: Buffer | string): Promise<boolean> {
    const tempFile = path.join(os.tmpdir(), `omniretail_print_${Date.now()}.raw`);
    fs.writeFileSync(tempFile, rawData);

    try {
      const psCommand = `powershell -NoProfile -Command "Get-Content -Path '${tempFile}' -Raw | Out-Printer -Name '${printerName}'"`;
      await execAsync(psCommand);
      return true;
    } catch (err: any) {
      console.error(`Spooler dispatch error to [${printerName}]:`, err);
      throw new Error(`Failed to dispatch print job to "${printerName}": ${err.message}`);
    } finally {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {
        // ignore
      }
    }
  }

  static async testTscPrinter(printerName?: string): Promise<{ success: boolean; message: string }> {
    const org = OrganizationService.getProfile();
    const target = printerName || org.label_printer_name || 'TSC';

    const testTspl = this.generateTsplCommands(
      [
        {
          name: 'Classic Cotton Polo Shirt',
          sku: 'B4L-POLO-01',
          barcode: '890123456789',
          price: 1850,
          attributes: { Size: 'XL', Color: 'Navy' },
        },
      ],
      50,
      30,
      org.name || 'OmniRetail'
    );

    await this.sendRawToPrinter(target, testTspl);
    return { success: true, message: `TSPL sample test sticker sent to "${target}".` };
  }

  static async testDtsPrinter(printerName?: string): Promise<{ success: boolean; message: string }> {
    const org = OrganizationService.getProfile();
    const target = printerName || org.receipt_printer_name || 'DTS';

    const testEscPos = this.generateEscPosReceipt(
      {
        invoiceNumber: 'TEST-0001',
        createdAt: new Date().toISOString(),
        cashierName: 'Manager Test',
        customerName: 'Diagnostic Self-Test',
        items: [
          { name: 'Hardware Self-Test Item 1', quantity: 1, unitPrice: 1500, subtotal: 1500 },
          { name: 'Hardware Self-Test Item 2', quantity: 2, unitPrice: 850, subtotal: 1700 },
        ],
        subtotal: 3200,
        discountAmount: 200,
        taxAmount: 0,
        netTotal: 3000,
        paidAmount: 3000,
        changeAmount: 0,
        paymentMethod: 'CASH',
      },
      org,
      { autoCut: true, kickDrawer: true }
    );

    await this.sendRawToPrinter(target, testEscPos);
    return { success: true, message: `ESC/POS test receipt slip dispatched to "${target}". Cash drawer kicked.` };
  }
}
