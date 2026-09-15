import { RawPrinterService, PrinterDiagnostic } from './raw-printer.service.js';
import { TscPrinterService, TscLabelItem, TscPrintOptions } from './tsc-printer.service.js';
import { EplPrinterService, EplLabelItem, EplPrintOptions } from './epl-printer.service.js';
import { DtsPrinterService, DtsReceiptOptions } from './dts-printer.service.js';

export interface PrinterDevice {
  name: string;
  driverName: string;
  portName: string;
  status: number;
  isDefault?: boolean;
}

export interface HardwareSettings {
  labelPrinterName: string;
  labelPrinterType: 'TSC_TSPL' | 'EPL2' | 'WINDOWS_GENERIC' | 'PDF';
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
   * Retrieves all installed printers with diagnostic metadata
   */
  static async getConnectedPrinters(): Promise<PrinterDevice[]> {
    const diagnostics = await RawPrinterService.getPrinterDiagnostics();
    return diagnostics.map((d) => ({
      name: d.name,
      driverName: d.driverName,
      portName: d.portName,
      status: d.status,
      isDefault: d.isDefault,
    }));
  }

  /**
   * Full diagnostics including online status and capabilities
   */
  static async getPrinterDiagnostics(): Promise<PrinterDiagnostic[]> {
    return RawPrinterService.getPrinterDiagnostics();
  }

  /**
   * Generates native TSPL / TSPL2 command batch for TSC Brand Label Printers
   */
  static generateTsplCommands(
    items: TscLabelItem[],
    options: TscPrintOptions = {}
  ): string {
    return TscPrinterService.generateTspl(items, options);
  }

  /**
   * Generates native EPL2 command batch (for EPL emulators & TSC TSPL-EZ)
   */
  static generateEplCommands(
    items: EplLabelItem[],
    options: EplPrintOptions = {}
  ): string {
    return EplPrinterService.generateEpl(items, options);
  }

  /**
   * Generates standard ESC/POS binary buffer for DTS Thermal Receipt Printers
   */
  static generateEscPosReceipt(
    sale: any,
    options: DtsReceiptOptions = {}
  ): Buffer {
    return DtsPrinterService.generateEscPosReceipt(sale, options);
  }

  /**
   * Dispatches exact binary RAW data to Windows Print Spooler using Winspool API
   */
  static async sendRawToPrinter(printerName: string, rawData: Buffer | string, jobName?: string): Promise<boolean> {
    const res = await RawPrinterService.sendRaw(printerName, rawData, jobName);
    return res.success;
  }

  /**
   * Diagnostic Test: Prints a sample barcode label on TSC Brand Label Printer (TSPL)
   */
  static async testTscPrinter(printerName?: string, options?: TscPrintOptions): Promise<{ success: boolean; tspl: string; message: string }> {
    return TscPrinterService.testLabel(printerName, options);
  }

  /**
   * Diagnostic Test: Prints a sample barcode label in EPL2 format (for EPL emulators)
   */
  static async testEplPrinter(printerName?: string, options?: EplPrintOptions): Promise<{ success: boolean; epl: string; message: string }> {
    const testItems: EplLabelItem[] = [
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
    const epl = EplPrinterService.generateEpl(testItems, options);
    if (printerName) {
      await RawPrinterService.sendRaw(printerName, epl, 'EPL Diagnostic Test');
      return {
        success: true,
        epl,
        message: `Diagnostic test label (EPL) sent to "${printerName}".`,
      };
    }
    return {
      success: true,
      epl,
      message: 'EPL diagnostic test label generated successfully.',
    };
  }

  /**
   * Calibrates TSC Label Printer Sensors
   */
  static async calibrateTscPrinter(printerName: string, options?: { sensorType?: 'GAP' | 'BLINE'; widthMm?: number; heightMm?: number }): Promise<{ success: boolean; message: string }> {
    return TscPrinterService.calibrate(printerName, options);
  }

  /**
   * Diagnostic Test: Prints a sample receipt slip on DTS Thermal Receipt Printer
   */
  static async testDtsPrinter(printerName?: string, options?: DtsReceiptOptions): Promise<{ success: boolean; message: string }> {
    return DtsPrinterService.testReceipt(printerName, options);
  }

  /**
   * Validates TSPL command string for syntax requirements
   */
  static validateTspl(tspl: string) {
    return TscPrinterService.validateTspl(tspl);
  }

  /**
   * Interprets ESC/POS binary command buffer
   */
  static parseEscPosCommands(buffer: Buffer) {
    return DtsPrinterService.parseEscPosCommands(buffer);
  }
}
