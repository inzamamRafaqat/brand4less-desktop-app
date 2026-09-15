import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Eye,
  Key,
  Lock,
  RotateCcw,
  Zap,
  Barcode,
  Check,
  Smartphone,
  Cpu,
  Radio,
  Upload,
  FileUp,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { playScannerBeep, simulateSpeedXScan } from '../hooks/useSpeedXScanner';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STORE' | 'HARDWARE' | 'USERS' | 'BACKUP'>('STORE');
  const [settings, setSettings] = useState<any>({
    storeName: 'BRAND 4 LESS',
    tagline: 'Premium Export Leftovers & Apparel Outlet',
    address: 'Shop # 4, Main Commercial Boulevard, Gulberg III, Lahore',
    phone: '+92 300 1234567',
    printerWidth: '80mm',
    taxRate: 0,
    returnDays: 7,
    labelPrinter: '',
    receiptPrinter: '',
    kickDrawer: true,
    autoCutReceipt: true,
    silentPrint: true,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const backupFileInputRef = React.useRef<HTMLInputElement>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Hardware Diagnostics State
  const [testingTsc, setTestingTsc] = useState(false);
  const [validatingTsc, setValidatingTsc] = useState(false);
  const [calibratingTsc, setCalibratingTsc] = useState(false);
  const [testingDts, setTestingDts] = useState(false);
  const [inspectingDts, setInspectingDts] = useState(false);
  const [tscTestFeedback, setTscTestFeedback] = useState<string | null>(null);
  const [tscCalibrateFeedback, setTscCalibrateFeedback] = useState<string | null>(null);
  const [dtsTestFeedback, setDtsTestFeedback] = useState<string | null>(null);
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [scannedTestHistory, setScannedTestHistory] = useState<string[]>([]);
  const [tsplValidationModal, setTsplValidationModal] = useState<{ open: boolean; tspl: string; validation: any } | null>(null);
  const [escposInspectModal, setEscposInspectModal] = useState<{ open: boolean; byteLength: number; hexDump: string; commandBreakdown: any[] } | null>(null);

  // New User Form Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    pin: '',
    role: 'STAFF',
    phone: '',
    baseSalary: 30000,
  });

  const fetchSettingsAndData = async () => {
    setLoading(true);
    try {
      const [setRes, usrRes, bkpRes, prnRes] = await Promise.all([
        api.get('/settings'),
        api.get('/auth/users'),
        api.get('/backup/list'),
        api.get('/hardware/printers'),
      ]);

      if (setRes.settings) setSettings(setRes.settings);
      if (usrRes.users) setUsers(usrRes.users);
      if (bkpRes.backups) setBackups(bkpRes.backups);
      
      let printerList = prnRes.printers || [];
      if (window.electronAPI?.getPrinters) {
        try {
          const electronPrinters = await window.electronAPI.getPrinters();
          if (electronPrinters && electronPrinters.length > 0) {
            const existingNames = new Set(printerList.map((p: any) => p.name));
            for (const ep of electronPrinters) {
              if (!existingNames.has(ep.name)) {
                printerList.push({ name: ep.name, status: ep.status || 0, isDefault: ep.isDefault });
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
      if (printerList.length > 0) setPrinters(printerList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/settings', settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.pin) return;

    try {
      await api.post('/auth/users', newUserData);
      setIsAddUserOpen(false);
      setNewUserData({ username: '', pin: '', role: 'STAFF', phone: '', baseSalary: 30000 });
      fetchSettingsAndData();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await api.post('/backup/create', { label: 'manual' });
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
      fetchSettingsAndData();
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore database from "${filename}"? Current data will be replaced by the snapshot.`)) {
      return;
    }

    try {
      const res = await api.post('/backup/restore', { filename });
      alert(res.message || 'Database restored successfully! Page will now refresh.');
      window.location.reload();
    } catch (err: any) {
      alert('Restore failed: ' + err.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['db', 'sqlite', 'sqlite3', 'bak'].includes(ext || '')) {
        alert('Please select a valid SQLite database backup file (.db or .sqlite)');
        return;
      }
      setSelectedBackupFile(file);
      setImportModalOpen(true);
    }
  };

  const handleExecuteImport = async (restoreImmediately: boolean) => {
    if (!selectedBackupFile) return;

    if (restoreImmediately) {
      if (!confirm(`Warning: Restoring will overwrite the current active database with data from "${selectedBackupFile.name}".\n\nA safety snapshot of your current database will be created automatically first.\n\nAre you sure you want to proceed?`)) {
        return;
      }
    }

    setIsImportingBackup(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedBackupFile);
      formData.append('restoreImmediately', restoreImmediately ? 'true' : 'false');

      const res = await api.post('/backup/import', formData);
      setImportModalOpen(false);
      setSelectedBackupFile(null);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }

      if (restoreImmediately) {
        alert(res.message || 'Backup imported and database restored successfully! Page will now reload.');
        window.location.reload();
      } else {
        setImportSuccessMsg(res.message || 'Backup file imported successfully and added to available snapshots.');
        setTimeout(() => setImportSuccessMsg(null), 5000);
        fetchSettingsAndData();
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setIsImportingBackup(false);
    }
  };

  const handleTestTsc = async () => {
    setTestingTsc(true);
    setTscTestFeedback(null);
    try {
      const res = await api.post('/hardware/print-tspl', {
        items: [
          {
            name: 'Casual Moccasins',
            categoryName: 'GARMENT',
            color: 'Pure White',
            size: '40',
            sellingPrice: 1500,
            sku: 'B4L-SLI-20460',
            barcode: '890100002396',
            quantity: 1,
          },
        ],
        printerName: settings.labelPrinter || undefined,
        widthMm: 50,
        heightMm: 30,
        gapMm: 2,
        format: 'TSPL',
      });
      setTscTestFeedback(res.message || 'TSPL test label RAW job dispatched.');
    } catch (err: any) {
      setTscTestFeedback('Error: ' + err.message);
    } finally {
      setTestingTsc(false);
    }
  };

  const handleValidateTsc = async () => {
    setValidatingTsc(true);
    try {
      const res = await api.post('/hardware/validate-tspl', {});
      if (res.success) {
        setTsplValidationModal({ open: true, tspl: res.tspl, validation: res.validation });
      }
    } catch (err: any) {
      alert('TSPL Validation Error: ' + err.message);
    } finally {
      setValidatingTsc(false);
    }
  };

  const handleCalibrateTsc = async () => {
    setCalibratingTsc(true);
    setTscCalibrateFeedback(null);
    try {
      const res = await api.post('/hardware/calibrate-tsc', {
        printerName: settings.labelPrinter || undefined,
        widthMm: settings.labelWidthMm || 50,
        heightMm: settings.labelHeightMm || 30,
      });
      setTscCalibrateFeedback(res.message || 'TSC gap calibration command dispatched.');
    } catch (err: any) {
      setTscCalibrateFeedback('Error: ' + err.message);
    } finally {
      setCalibratingTsc(false);
    }
  };

  const handleTestDts = async () => {
    setTestingDts(true);
    setDtsTestFeedback(null);
    try {
      const sampleSale = {
        invoice_number: 'REC-TEST-001',
        created_at: new Date().toISOString(),
        cashier_name: 'DIAGNOSTIC CASHIER',
        payment_method: 'CASH',
        items: [
          { name: 'Casual Moccasins', size: '40', quantity: 1, unit_price: 1500, subtotal: 1500 },
        ],
        subtotal: 1500,
        discount_amount: 0,
        net_total: 1500,
        paid_amount: 2000,
      };
      const res = await api.post('/hardware/print-escpos?format=json', {
        sale: sampleSale,
        printerName: settings.receiptPrinter || undefined,
        width: settings.printerWidth || '80mm',
        autoCut: settings.autoCutReceipt,
        kickDrawer: settings.kickDrawer,
      });
      setDtsTestFeedback(res.message || 'ESC/POS test receipt slip dispatched.');
    } catch (err: any) {
      setDtsTestFeedback('Error: ' + err.message);
    } finally {
      setTestingDts(false);
    }
  };

  const handleInspectEscPos = async () => {
    setInspectingDts(true);
    try {
      const res = await api.post('/hardware/inspect-escpos', {
        width: settings.printerWidth || '80mm',
        cashDrawer: settings.kickDrawer,
      });
      if (res.success && res.breakdown) {
        setEscposInspectModal({
          open: true,
          byteLength: res.breakdown.byteLength,
          hexDump: res.breakdown.hexDump,
          commandBreakdown: res.breakdown.commandBreakdown,
        });
      }
    } catch (err: any) {
      alert('ESC/POS Inspection Error: ' + err.message);
    } finally {
      setInspectingDts(false);
    }
  };

  const handleScannerTestSubmit = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const barcodeToScan = customCode || scannerTestInput.trim() || '890100002396';
    playScannerBeep();
    simulateSpeedXScan(barcodeToScan);
    setScannedTestHistory((prev) => [barcodeToScan, ...prev.slice(0, 4)]);
    setScannerTestInput('');
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#090D16] p-8 overflow-y-auto space-y-6 font-sans transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Settings & Hardware Integration</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Configure store receipts, TSC label printer, DTS thermal printer, SpeedX barcode scanner, and backups
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}

        {backupSuccess && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Database Backup Snapshot Created!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-white dark:bg-[#111827] p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 soft-shadow w-fit transition-colors">
        {[
          { id: 'STORE', label: 'Store & Receipt Info', icon: SettingsIcon },
          { id: 'HARDWARE', label: 'Hardware (TSC, DTS, SpeedX)', icon: Cpu },
          { id: 'USERS', label: 'Staff & PIN Management', icon: Shield },
          { id: 'BACKUP', label: 'Database Backup & Restore', icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === t.id
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── STORE & RECEIPT SETTINGS ─────────────────────────────────────── */}
      {activeTab === 'STORE' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 soft-shadow max-w-3xl space-y-4 transition-colors">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            Store Profile & Thermal Receipt Header
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store / Brand Name</label>
              <input
                type="text"
                value={settings.storeName || ''}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Receipt Tagline</label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Physical Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Phone / Helpline</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Receipt Return Policy (Days)</label>
              <input
                type="number"
                value={settings.returnDays || 7}
                onChange={(e) => setSettings({ ...settings, returnDays: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-sm transition"
            >
              Save Store Profile
            </button>
          </div>
        </form>
      )}

      {/* ── HARDWARE & PRINTERS INTEGRATION ──────────────────────────────── */}
      {activeTab === 'HARDWARE' && (
        <div className="space-y-6 max-w-4xl">
          {/* Detected Printers Header Banner */}
          <div className="p-4 bg-slate-900 text-white rounded-3xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Active Hardware Integration Engine</h3>
                <p className="text-xs text-slate-400">
                  Detected {printers.length} installed Windows printer device(s) on this system
                </p>
              </div>
            </div>

            <button
              onClick={fetchSettingsAndData}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rescan Devices</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. TSC BRAND LABEL PRINTER CARD */}
            <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl soft-shadow space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">TSC Label Printer</h4>
                    <span className="text-[10px] text-slate-400">TSPL / TSPL2 Vector Command Driver</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
                  Ready
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target TSC Label Printer</label>
                  <select
                    value={settings.labelPrinter || ''}
                    onChange={(e) => setSettings({ ...settings, labelPrinter: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="">Default Windows Label Printer</option>
                    {printers.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} ({p.driverName || 'Generic'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Standard Sticker Size</label>
                  <select
                    defaultValue="50x30"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="50x30">50mm x 30mm (Standard TSC Retail Sticker)</option>
                    <option value="40x25">40mm x 25mm (Compact Jewelry / Accessory)</option>
                    <option value="35x25">35mm x 25mm (Small Price Tag)</option>
                  </select>
                </div>

                <div className="pt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleTestTsc}
                    disabled={testingTsc || validatingTsc || calibratingTsc}
                    className="py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                  >
                    {testingTsc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{testingTsc ? 'Printing...' : 'Test TSPL RAW Job'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleValidateTsc}
                    disabled={testingTsc || validatingTsc || calibratingTsc}
                    className="py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1"
                  >
                    {validatingTsc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Validate TSPL</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCalibrateTsc}
                    disabled={testingTsc || validatingTsc || calibratingTsc}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 border border-slate-200 dark:border-slate-700"
                  >
                    {calibratingTsc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                    <span>Calibrate Sensor</span>
                  </button>
                </div>

                {tscTestFeedback && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-center">
                    {tscTestFeedback}
                  </p>
                )}
                {tscCalibrateFeedback && (
                  <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 text-center">
                    {tscCalibrateFeedback}
                  </p>
                )}
              </div>
            </div>

            {/* 2. DTS POS THERMAL RECEIPT PRINTER CARD */}
            <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl soft-shadow space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">TS-80Z Thermal Receipt Printer</h4>
                    <span className="text-[10px] text-slate-400">ESC/POS • 80mm • USB / Ethernet</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
                  Ready
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target DTS Thermal Printer</label>
                  <select
                    value={settings.receiptPrinter || ''}
                    onChange={(e) => setSettings({ ...settings, receiptPrinter: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="">Default Windows Thermal Printer</option>
                    {printers.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} ({p.driverName || 'Generic'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.kickDrawer !== false}
                      onChange={(e) => setSettings({ ...settings, kickDrawer: e.target.checked })}
                      className="rounded text-slate-900"
                    />
                    <span className="font-medium">Kick Cash Drawer</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoCutReceipt !== false}
                      onChange={(e) => setSettings({ ...settings, autoCutReceipt: e.target.checked })}
                      className="rounded text-slate-900"
                    />
                    <span className="font-medium">Auto Paper Cut</span>
                  </label>

                  <label className="col-span-2 flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={settings.silentPrint !== false}
                      onChange={(e) => setSettings({ ...settings, silentPrint: e.target.checked })}
                      className="rounded text-slate-900"
                    />
                    <span className="font-medium">Silent Direct Thermal Print (Skip Print Dialog)</span>
                  </label>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleTestDts}
                    disabled={testingDts || inspectingDts}
                    className="py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    {testingDts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{testingDts ? 'Printing...' : 'Test ESC/POS RAW Job'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleInspectEscPos}
                    disabled={testingDts || inspectingDts}
                    className="py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    {inspectingDts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Inspect ESC/POS Bytes</span>
                  </button>
                </div>
                {dtsTestFeedback && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 text-center">
                    {dtsTestFeedback}
                  </p>
                )}
              </div>
            </div>

            {/* 3. SPEEDX BARCODE SCANNER CARD */}
            <div className="col-span-1 md:col-span-2 p-6 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl soft-shadow space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">SpeedX Barcode Scanner Integration</h4>
                    <span className="text-[10px] text-slate-400">Plug & Play USB HID Keyboard Wedge with High-Speed Intercept</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
                  Active (Global Hook)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                    Your physical <strong>SpeedX Barcode Scanner</strong> sends rapid keystroke bursts directly to this desktop application. The built-in POS listener intercepts scanned barcodes anywhere in the POS terminal and adds the item to the cart with zero manual clicks.
                  </p>

                  <form onSubmit={handleScannerTestSubmit} className="space-y-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Live Hardware Scanner Test (Point & Scan Barcode here):
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={scannerTestInput}
                        onChange={(e) => setScannerTestInput(e.target.value)}
                        placeholder="Scan barcode with SpeedX scanner..."
                        className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl font-bold"
                      >
                        Test
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Live Decoded Barcodes:
                  </span>
                  {scannedTestHistory.length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">
                      No barcodes scanned yet. Connect your SpeedX USB scanner and trigger a scan.
                    </p>
                  ) : (
                    <div className="space-y-1.5 font-mono text-xs">
                      {scannedTestHistory.map((code, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-bold">{code}</span>
                          <span className="text-[10px] text-slate-400 font-sans">✓ Decoded & Beeped</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS & PIN MANAGEMENT ───────────────────────────────────────── */}
      {activeTab === 'USERS' && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 soft-shadow max-w-4xl space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Authorized Cashiers & Staff Access Roles
            </h3>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-3.5 py-1.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Login</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Username / Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Quick PIN</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{u.full_name || u.username}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{u.phone || '—'}</td>
                    <td className="p-3 font-mono text-slate-400">••••</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DATABASE BACKUP & RESTORE ────────────────────────────────────── */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl soft-shadow flex flex-wrap items-center justify-between gap-4 transition-colors">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Database Backup & Recovery</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Create 100% transactional SQLite snapshots or import / restore backups from your computer or USB flash drive.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Hidden File Input for Import */}
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3,.bak"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => backupFileInputRef.current?.click()}
                disabled={isImportingBackup || isCreatingBackup}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
                title="Upload or import a backup file (.db / .sqlite)"
              >
                {isImportingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{isImportingBackup ? 'Importing...' : 'Import Backup'}</span>
              </button>

              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup || isImportingBackup}
                className="px-5 py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
              >
                {isCreatingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{isCreatingBackup ? 'Creating Snapshot...' : 'Create Backup Now'}</span>
              </button>
            </div>
          </div>

          {/* Feedback banners */}
          {backupSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center space-x-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Snapshot backup created successfully in data/backups/!</span>
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center space-x-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden soft-shadow transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Available Database Backup Snapshots ({backups.length})</span>
              <button
                onClick={fetchSettingsAndData}
                title="Refresh Backups List"
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-4">Backup Filename</th>
                    <th className="p-4">File Size</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        No backups available. Click "Create Backup Now" or "Import Backup".
                      </td>
                    </tr>
                  ) : (
                    backups.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <Database className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[320px]">{b.filename}</span>
                        </td>
                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                          {b.sizeFormatted || b.size || `${(Number(b.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB`}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {new Date(b.createdAt).toLocaleString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleRestoreBackup(b.filename)}
                              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                              title="Restore database from this snapshot"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>

                            <a
                              href={api.downloadUrl(`/backup/download/${encodeURIComponent(b.filename)}`)}
                              download
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-950 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-bold transition inline-flex items-center space-x-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT BACKUP ACTION MODAL ── */}
      {importModalOpen && selectedBackupFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Database Backup</h3>
                  <p className="text-xs text-slate-400">Select how you want to handle this backup file</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedBackupFile(null);
                  if (backupFileInputRef.current) backupFileInputRef.current.value = '';
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Selected File Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Selected File</div>
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-white break-all">
                  {selectedBackupFile.name}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {(selectedBackupFile.size / 1024 / 1024).toFixed(2)} MB • SQLite Database
                </div>
              </div>

              {/* Choice Cards */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleExecuteImport(false)}
                  disabled={isImportingBackup}
                  className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-900/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-500" />
                      <span>Option 1: Add to Backup Snapshots Only</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      Safe & Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-6">
                    Validates and copies this file into the backups list. Your current active database remains untouched. You can restore it later anytime.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteImport(true)}
                  disabled={isImportingBackup}
                  className="w-full text-left p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 hover:border-rose-500 dark:hover:border-rose-500 bg-white dark:bg-slate-900/40 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      <span>Option 2: Import & Restore Immediately</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                      Overwrites Active Data
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-6">
                    Replaces current live data with this backup file. An automatic safety snapshot of your current database will be saved first.
                  </p>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedBackupFile(null);
                  if (backupFileInputRef.current) backupFileInputRef.current.value = '';
                }}
                disabled={isImportingBackup}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TSPL SYNTAX VALIDATION DIAGNOSTIC MODAL ── */}
      {tsplValidationModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">TSPL RAW Command Diagnostics & Inspector</h3>
                  <p className="text-xs text-slate-400">Syntax validation & command breakdown for TSC TTP-244 Pro</p>
                </div>
              </div>
              <button
                onClick={() => setTsplValidationModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Checks grid */}
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { label: 'SIZE mm', ok: tsplValidationModal.validation?.checks?.hasSize },
                  { label: 'GAP mm', ok: tsplValidationModal.validation?.checks?.hasGap },
                  { label: 'CLS Buffer', ok: tsplValidationModal.validation?.checks?.hasCls },
                  { label: 'BARCODE 128', ok: tsplValidationModal.validation?.checks?.hasBarcode128 },
                  { label: 'PRINT 1,1', ok: tsplValidationModal.validation?.checks?.hasPrint },
                ].map((chk, idx) => (
                  <div key={idx} className={`p-2.5 rounded-xl border ${chk.ok ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600'}`}>
                    <div className="font-bold text-[11px]">{chk.label}</div>
                    <div className="text-[10px] font-mono mt-0.5">{chk.ok ? '✓ VALID' : '✗ MISSING'}</div>
                  </div>
                ))}
              </div>

              {/* Raw TSPL Text Box */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Generated TSPL Payload:</label>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
                  {tsplValidationModal.tspl}
                </pre>
              </div>

              {/* Command Breakdown */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Parsed Command Sequence ({tsplValidationModal.validation?.commandsCount || 0} lines):</label>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {tsplValidationModal.validation?.breakdown?.map((item: any, idx: number) => (
                    <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 text-slate-400 font-bold">{item.line}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{item.command}</span>
                        <span className="text-slate-500 font-sans text-[10px]">{item.desc}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{item.raw}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setTsplValidationModal(null)}
                className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ESC/POS INSPECTOR DIAGNOSTIC MODAL ── */}
      {escposInspectModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">DTS Receipt ESC/POS Byte Inspector</h3>
                  <p className="text-xs text-slate-400">Binary buffer analysis ({escposInspectModal.byteLength} total bytes)</p>
                </div>
              </div>
              <button
                onClick={() => setEscposInspectModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Command Breakdown */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Interpreted Control Commands ({escposInspectModal.commandBreakdown?.length || 0} tokens):
                </label>
                <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  {escposInspectModal.commandBreakdown?.map((cmd: any, idx: number) => (
                    <div key={idx} className="p-1.5 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 text-[10px]">@{cmd.offset}</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{cmd.hex}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-sans text-[11px]">{cmd.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hex Dump */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Raw ESC/POS Hex Dump:</label>
                <pre className="p-3 bg-slate-950 text-cyan-400 font-mono text-[10px] rounded-2xl overflow-x-auto leading-tight border border-slate-800 max-h-56 overflow-y-auto">
                  {escposInspectModal.hexDump}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setEscposInspectModal(null)}
                className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
