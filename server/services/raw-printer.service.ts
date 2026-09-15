import { execFile, exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';

const execFilePromise = util.promisify(execFile);
const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PrinterDiagnostic {
  name: string;
  driverName: string;
  portName: string;
  status: number;
  isDefault: boolean;
  isOnline: boolean;
  supportsRaw: boolean;
}

export interface PrintJobResult {
  success: boolean;
  jobId?: string;
  printerName: string;
  bytesWritten: number;
  durationMs?: number;
  message: string;
  error?: string;
}

export interface PrintQueueItem {
  jobId: string;
  printerName: string;
  jobTitle: string;
  bytesWritten: number;
  durationMs: number;
  status: 'SUBMITTED' | 'FAILED';
  createdAt: string;
  error?: string;
  data: Buffer;
}

/**
 * Production-grade Windows Spooler RAW & TCP Network Printing Service
 * 
 * Supports:
 * 1. Win32 winspool.drv API (via bin/raw-print.exe or PowerShell P/Invoke fallback)
 * 2. Raw TCP/IP Sockets (e.g., 127.0.0.1:9511 for Virtual-Printer.online, or Network Thermal Printers)
 */
export class RawPrinterService {
  private static queue: Promise<any> = Promise.resolve();
  private static jobCounter = 0;
  private static printHistory: PrintQueueItem[] = [];

  private static recordQueueItem(item: PrintQueueItem) {
    this.printHistory.unshift(item);
    if (this.printHistory.length > 25) {
      this.printHistory = this.printHistory.slice(0, 25);
    }
  }

  static getPrintQueue(): Omit<PrintQueueItem, 'data'>[] {
    return this.printHistory.map(({ data, ...rest }) => rest);
  }

  static async retryJob(jobId: string): Promise<PrintJobResult> {
    const item = this.printHistory.find((j) => j.jobId === jobId);
    if (!item) {
      throw new Error(`Print job "${jobId}" not found in history queue.`);
    }
    return this.sendRaw(item.printerName, item.data, item.jobTitle);
  }

  /**
   * Parses TCP printer target if printerName is "IP:PORT", "localhost:PORT", or "tcp://HOST:PORT"
   */
  static parseTcpTarget(target: string): { host: string; port: number } | null {
    if (!target) return null;
    const clean = target.trim().replace(/^(tcp|net):\/\//i, '');
    const match = clean.match(/^([a-zA-Z0-9.-]+):(\d+)$/);
    if (match) {
      const port = parseInt(match[2], 10);
      if (port > 0 && port <= 65535) {
        return { host: match[1], port };
      }
    }
    return null;
  }

  /**
   * Transmits binary buffer directly to a TCP Network or Virtual Printer (e.g. 127.0.0.1:9511)
   */
  static async sendTcp(host: string, port: number, byteBuffer: Buffer, jobTitle?: string): Promise<PrintJobResult> {
    const startTime = Date.now();
    const jobId = `TCP-${Date.now()}-${++this.jobCounter}`;
    const title = jobTitle || `TCP-Job-${jobId}`;
    console.log(`[HARDWARE TCP] Transmitting ${byteBuffer.length} bytes to ${host}:${port} (${title})...`);

    return new Promise<PrintJobResult>((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(8000);

      socket.connect(port, host, () => {
        socket.write(byteBuffer, () => {
          socket.end();
          const durationMs = Date.now() - startTime;
          console.log(`[HARDWARE TCP] Job ${jobId} transmitted to ${host}:${port} in ${durationMs}ms`);
          
          RawPrinterService.recordQueueItem({
            jobId,
            printerName: `${host}:${port}`,
            jobTitle: title,
            bytesWritten: byteBuffer.length,
            durationMs,
            status: 'SUBMITTED',
            createdAt: new Date().toISOString(),
            data: byteBuffer,
          });

          resolve({
            success: true,
            jobId,
            printerName: `${host}:${port}`,
            bytesWritten: byteBuffer.length,
            durationMs,
            message: `RAW job submitted successfully to ${host}:${port} over TCP (${byteBuffer.length} bytes, ${durationMs}ms)`,
          });
        });
      });

      socket.on('error', (err) => {
        const durationMs = Date.now() - startTime;
        console.error(`[HARDWARE TCP] Connection to ${host}:${port} failed after ${durationMs}ms:`, err.message);
        
        RawPrinterService.recordQueueItem({
          jobId,
          printerName: `${host}:${port}`,
          jobTitle: title,
          bytesWritten: byteBuffer.length,
          durationMs,
          status: 'FAILED',
          createdAt: new Date().toISOString(),
          error: err.message,
          data: byteBuffer,
        });

        reject(new Error(`Failed to connect to ${host}:${port}: ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        const durationMs = Date.now() - startTime;
        console.error(`[HARDWARE TCP] Connection to ${host}:${port} timed out after ${durationMs}ms`);
        reject(new Error(`Connection to ${host}:${port} timed out after 8s`));
      });
    });
  }

  /**
   * Resolves the absolute path to raw-print.exe helper
   */
  private static getHelperExePath(): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'bin/raw-print.exe'),
      path.resolve(process.cwd(), 'extra/bin/raw-print.exe'),
      path.resolve(__dirname, '../../bin/raw-print.exe'),
      path.resolve(__dirname, '../bin/raw-print.exe'),
      path.resolve(__dirname, '../../../extra/bin/raw-print.exe'),
      path.resolve(__dirname, '../../../bin/raw-print.exe'),
      path.resolve((process as any).resourcesPath || '', 'bin/raw-print.exe'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Retrieves full Windows printer diagnostics
   */
  static async getPrinterDiagnostics(): Promise<PrinterDiagnostic[]> {
    if (process.platform !== 'win32') {
      return [
        {
          name: 'TSC TTP-244 Pro (Mock)',
          driverName: 'TSC TSPL Driver',
          portName: 'USB001',
          status: 0,
          isDefault: true,
          isOnline: true,
          supportsRaw: true,
        },
        {
          name: 'DTS 80mm Thermal (Mock)',
          driverName: 'POS-80 Driver',
          portName: 'USB002',
          status: 0,
          isDefault: false,
          isOnline: true,
          supportsRaw: true,
        },
      ];
    }

    try {
      const psScript = `
        Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json -Compress
      `;
      const { stdout } = await execPromise(`powershell -NoProfile -Command "${psScript.trim().replace(/\r?\n/g, ' ')}"`);
      if (!stdout || !stdout.trim()) return [];

      const parsed = JSON.parse(stdout);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      return list.map((p: any) => ({
        name: p.Name || '',
        driverName: p.DriverName || '',
        portName: p.PortName || '',
        status: p.PrinterStatus !== undefined ? p.PrinterStatus : 0,
        isDefault: !!p.Default,
        isOnline: p.PrinterStatus === 0 || p.PrinterStatus === 3,
        supportsRaw: true,
      }));
    } catch (err) {
      console.error('[HARDWARE] Error querying printer diagnostics:', err);
      return [];
    }
  }

  /**
   * Sends exact binary data to Windows Print Spooler or TCP target
   */
  static async sendRaw(
    printerName: string,
    data: Buffer | string,
    jobTitle?: string
  ): Promise<PrintJobResult> {
    if (!printerName || !printerName.trim()) {
      throw new Error('Printer name is required for RAW printing');
    }

    const byteBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;

    // Check if target is a network/virtual TCP address (e.g. 127.0.0.1:9511)
    const tcpTarget = this.parseTcpTarget(printerName);
    if (tcpTarget) {
      return this.sendTcp(tcpTarget.host, tcpTarget.port, byteBuffer, jobTitle);
    }

    const startTime = Date.now();
    const jobId = `PRINT-${Date.now()}-${++this.jobCounter}`;
    const title = jobTitle || `Brand4Less-${jobId}`;

    console.log(
      `[HARDWARE] Dispatching Job: ${jobId} | Printer: "${printerName}" | Bytes: ${byteBuffer.length}`
    );

    if (process.platform !== 'win32') {
      const durationMs = Date.now() - startTime;
      console.log(`[HARDWARE MOCK] Printed ${byteBuffer.length} bytes to ${printerName} in ${durationMs}ms`);
      RawPrinterService.recordQueueItem({
        jobId,
        printerName,
        jobTitle: title,
        bytesWritten: byteBuffer.length,
        durationMs,
        status: 'SUBMITTED',
        createdAt: new Date().toISOString(),
        data: byteBuffer,
      });
      return {
        success: true,
        jobId,
        printerName,
        bytesWritten: byteBuffer.length,
        durationMs,
        message: `RAW job submitted successfully to "${printerName}" (${byteBuffer.length} bytes, ${durationMs}ms)`,
      };
    }

    // Process jobs sequentially through promise queue to prevent spooler conflicts
    return new Promise<PrintJobResult>((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          const tempFile = path.join(os.tmpdir(), `b4l_${jobId}.raw`);
          try {
            fs.writeFileSync(tempFile, byteBuffer);

            const exePath = this.getHelperExePath();
            if (exePath) {
              // Priority 1: Native winspool helper
              const { stderr } = await execFilePromise(exePath, [printerName, tempFile, title], {
                windowsHide: true,
                timeout: 15000,
              });

              if (stderr && stderr.trim()) {
                console.warn(`[HARDWARE] raw-print stderr: ${stderr}`);
              }

              const durationMs = Date.now() - startTime;
              console.log(`[HARDWARE] Job ${jobId} completed successfully via raw-print.exe in ${durationMs}ms`);
              RawPrinterService.recordQueueItem({
                jobId,
                printerName,
                jobTitle: title,
                bytesWritten: byteBuffer.length,
                durationMs,
                status: 'SUBMITTED',
                createdAt: new Date().toISOString(),
                data: byteBuffer,
              });
              resolve({
                success: true,
                jobId,
                printerName,
                bytesWritten: byteBuffer.length,
                durationMs,
                message: `RAW job submitted successfully to "${printerName}" (${byteBuffer.length} bytes, ${durationMs}ms)`,
              });
            } else {
              // Priority 2: In-process PowerShell P/Invoke fallback to winspool.drv
              await this.sendViaPowerShellWinspool(printerName, tempFile, title);
              const durationMs = Date.now() - startTime;
              console.log(`[HARDWARE] Job ${jobId} completed successfully via PowerShell winspool fallback in ${durationMs}ms`);
              RawPrinterService.recordQueueItem({
                jobId,
                printerName,
                jobTitle: title,
                bytesWritten: byteBuffer.length,
                durationMs,
                status: 'SUBMITTED',
                createdAt: new Date().toISOString(),
                data: byteBuffer,
              });
              resolve({
                success: true,
                jobId,
                printerName,
                bytesWritten: byteBuffer.length,
                durationMs,
                message: `RAW job submitted successfully to "${printerName}" (winspool fallback, ${durationMs}ms)`,
              });
            }
          } catch (err: any) {
            const durationMs = Date.now() - startTime;
            console.error(`[HARDWARE] Job ${jobId} failed on "${printerName}" after ${durationMs}ms:`, err);
            RawPrinterService.recordQueueItem({
              jobId,
              printerName,
              jobTitle: title,
              bytesWritten: byteBuffer.length,
              durationMs,
              status: 'FAILED',
              createdAt: new Date().toISOString(),
              error: err.message || String(err),
              data: byteBuffer,
            });
            reject(new Error(`Failed to print to "${printerName}": ${err.message || String(err)}`));
          } finally {
            try {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            } catch (_) {}
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * P/Invoke fallback to winspool.drv via temporary PowerShell script
   */
  private static async sendViaPowerShellWinspool(
    printerName: string,
    filePath: string,
    jobTitle: string
  ): Promise<void> {
    const psFile = path.join(os.tmpdir(), `b4l_print_${Date.now()}.ps1`);
    const psScript = `
$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class WinspoolRaw {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public class DOCINFO {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }
    [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern uint StartDocPrinter(IntPtr hPrinter, uint level, [In] DOCINFO pDocInfo);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, uint dwCount, out uint pdwWritten);

    public static void Send(string printerName, string path, string docName) {
        byte[] bytes = File.ReadAllBytes(path);
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) throw new Exception("OpenPrinter failed: " + Marshal.GetLastWin32Error());
        try {
            DOCINFO di = new DOCINFO();
            di.pDocName = docName;
            di.pDataType = "RAW";
            if (printerName.ToLower().Contains("pdf") || printerName.ToLower().Contains("xps")) {
                di.pOutputFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Brand4Less_Output.pdf");
            }
            if (StartDocPrinter(hPrinter, 1, di) == 0) throw new Exception("StartDocPrinter failed: " + Marshal.GetLastWin32Error());
            try {
                if (!StartPagePrinter(hPrinter)) throw new Exception("StartPagePrinter failed");
                IntPtr pBuf = Marshal.AllocCoTaskMem(bytes.Length);
                try {
                    Marshal.Copy(bytes, 0, pBuf, bytes.Length);
                    uint written;
                    if (!WritePrinter(hPrinter, pBuf, (uint)bytes.Length, out written)) throw new Exception("WritePrinter failed");
                } finally {
                    Marshal.FreeCoTaskMem(pBuf);
                    EndPagePrinter(hPrinter);
                }
            } finally {
                EndDocPrinter(hPrinter);
            }
        } finally {
            ClosePrinter(hPrinter);
        }
    }
}
"@
Add-Type -TypeDefinition $code -Language CSharp
[WinspoolRaw]::Send('${printerName.replace(/'/g, "''")}', '${filePath.replace(/'/g, "''")}', '${jobTitle.replace(/'/g, "''")}')
    `;

    try {
      fs.writeFileSync(psFile, psScript, 'utf-8');
      await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 15000 });
    } finally {
      try {
        if (fs.existsSync(psFile)) fs.unlinkSync(psFile);
      } catch (_) {}
    }
  }
}
