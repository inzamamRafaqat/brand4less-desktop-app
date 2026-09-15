export interface ElectronPrinterInfo {
  name: string;
  displayName?: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
}

export interface ElectronAPI {
  isDesktop: boolean;
  getPrinters: () => Promise<ElectronPrinterInfo[]>;
  printReceipt: (payload: {
    htmlContent: string;
    printerName?: string;
    silent?: boolean;
    paperWidth?: string;
    pageSize?: { width: number; height: number };
  }) => Promise<{ success: boolean; error?: string }>;
  exportPdf: (payload: {
    htmlContent: string;
    defaultFilename?: string;
    pageSize?: { width: number; height: number };
  }) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  showNotification: (title: string, body: string) => Promise<boolean>;
  saveFileDialog: (options?: any) => Promise<string | null>;
  openFileDialog: (options?: any) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
