using System;
using System.IO;
using System.Runtime.InteropServices;

namespace Brand4Less.RawPrint
{
    class Program
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public class DOCINFO
        {
            [MarshalAs(UnmanagedType.LPWStr)]
            public string pDocName;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string pOutputFile;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string pDataType;
        }

        [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern uint StartDocPrinter(IntPtr hPrinter, uint level, [In] DOCINFO pDocInfo);

        [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, uint dwCount, out uint pdwWritten);

        static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.Error.WriteLine("Usage: raw-print.exe <printerName> <filePath> [jobName]");
                return 1;
            }

            string printerName = args[0];
            string filePath = args[1];
            string jobName = args.Length > 2 ? args[2] : "Brand4Less Print Job";

            if (!File.Exists(filePath))
            {
                Console.Error.WriteLine("Error: File not found: " + filePath);
                return 2;
            }

            byte[] bytes = File.ReadAllBytes(filePath);
            if (bytes.Length == 0)
            {
                Console.Error.WriteLine("Error: Empty print data");
                return 3;
            }

            IntPtr hPrinter = IntPtr.Zero;
            if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            {
                int err = Marshal.GetLastWin32Error();
                Console.Error.WriteLine(string.Format("Error: OpenPrinter failed for '{0}' (Win32 Error {1})", printerName, err));
                return 4;
            }

            try
            {
                DOCINFO di = new DOCINFO();
                di.pDocName = jobName;
                di.pDataType = "RAW";

                // If printer is a PDF/XPS driver or requires file path, provide output path
                string lowerPrinter = printerName.ToLowerInvariant();
                if (lowerPrinter.Contains("pdf") || lowerPrinter.Contains("xps") || lowerPrinter.Contains("writer"))
                {
                    string docsFolder = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                    di.pOutputFile = Path.Combine(docsFolder, string.Format("Brand4Less_Output_{0}.pdf", DateTime.Now.ToString("yyyyMMdd_HHmmss")));
                }
                else
                {
                    di.pOutputFile = args.Length > 3 ? args[3] : null;
                }

                uint jobId = StartDocPrinter(hPrinter, 1, di);
                if (jobId == 0)
                {
                    // Fallback retry with temp file output for virtual print drivers
                    di.pOutputFile = Path.Combine(Path.GetTempPath(), string.Format("b4l_out_{0}.bin", Guid.NewGuid().ToString("N")));
                    jobId = StartDocPrinter(hPrinter, 1, di);
                }

                if (jobId == 0)
                {
                    int err = Marshal.GetLastWin32Error();
                    Console.Error.WriteLine(string.Format("Error: StartDocPrinter failed (Win32 Error {0})", err));
                    return 5;
                }

                try
                {
                    if (!StartPagePrinter(hPrinter))
                    {
                        int err = Marshal.GetLastWin32Error();
                        Console.Error.WriteLine(string.Format("Error: StartPagePrinter failed (Win32 Error {0})", err));
                        return 6;
                    }

                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    try
                    {
                        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                        uint written = 0;
                        if (!WritePrinter(hPrinter, pUnmanagedBytes, (uint)bytes.Length, out written))
                        {
                            int err = Marshal.GetLastWin32Error();
                            Console.Error.WriteLine(string.Format("Error: WritePrinter failed (Win32 Error {0})", err));
                            return 7;
                        }
                    }
                    finally
                    {
                        Marshal.FreeCoTaskMem(pUnmanagedBytes);
                        EndPagePrinter(hPrinter);
                    }
                }
                finally
                {
                    EndDocPrinter(hPrinter);
                }
            }
            finally
            {
                ClosePrinter(hPrinter);
            }

            Console.WriteLine(string.Format("SUCCESS: Sent {0} bytes to '{1}'", bytes.Length, printerName));
            return 0;
        }
    }
}
