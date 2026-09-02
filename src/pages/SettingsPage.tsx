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
} from 'lucide-react';
import { playScannerBeep } from '../hooks/useSpeedXScanner';

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
  });
  const [users, setUsers] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Hardware Diagnostics State
  const [testingTsc, setTestingTsc] = useState(false);
  const [testingDts, setTestingDts] = useState(false);
  const [tscTestFeedback, setTscTestFeedback] = useState<string | null>(null);
  const [dtsTestFeedback, setDtsTestFeedback] = useState<string | null>(null);
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [scannedTestHistory, setScannedTestHistory] = useState<string[]>([]);

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
      if (prnRes.printers) setPrinters(prnRes.printers);
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

  const handleTestTsc = async () => {
    setTestingTsc(true);
    setTscTestFeedback(null);
    try {
      const res = await api.post('/hardware/test-tsc', { printerName: settings.labelPrinter || undefined });
      setTscTestFeedback(res.message || 'TSPL calibration test command sent to TSC printer.');
    } catch (err: any) {
      setTscTestFeedback('Error: ' + err.message);
    } finally {
      setTestingTsc(false);
    }
  };

  const handleTestDts = async () => {
    setTestingDts(true);
    setDtsTestFeedback(null);
    try {
      const res = await api.post('/hardware/test-dts', { printerName: settings.receiptPrinter || undefined });
      setDtsTestFeedback(res.message || 'ESC/POS test receipt slip dispatched to DTS thermal printer.');
    } catch (err: any) {
      setDtsTestFeedback('Error: ' + err.message);
    } finally {
      setTestingDts(false);
    }
  };

  const handleScannerTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerTestInput.trim()) return;
    playScannerBeep();
    setScannedTestHistory((prev) => [scannerTestInput.trim(), ...prev.slice(0, 4)]);
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target TSC Device</label>
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

                <div className="pt-2">
                  <button
                    onClick={handleTestTsc}
                    disabled={testingTsc}
                    className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    {testingTsc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{testingTsc ? 'Printing Test...' : 'Test TSC Label Printer'}</span>
                  </button>
                  {tscTestFeedback && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 text-center">
                      {tscTestFeedback}
                    </p>
                  )}
                </div>
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
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">DTS Thermal Receipt Printer</h4>
                    <span className="text-[10px] text-slate-400">ESC/POS 80mm / 58mm Engine</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
                  Ready
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target DTS Device</label>
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
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleTestDts}
                    disabled={testingDts}
                    className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    {testingDts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{testingDts ? 'Printing Test Slip...' : 'Test DTS Receipt Printer'}</span>
                  </button>
                  {dtsTestFeedback && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 text-center">
                      {dtsTestFeedback}
                    </p>
                  )}
                </div>
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Database Snapshot Backup</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Creates an immediate hot SQLite transactional snapshot in the <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">data/backups/</code> directory.
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="px-6 py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs rounded-2xl shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isCreatingBackup ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>{isCreatingBackup ? 'Creating Snapshot...' : 'Create Backup Now'}</span>
            </button>
          </div>

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

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
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
                      No backups created yet. Click "Create Backup Now" to create your first encrypted snapshot.
                    </td>
                  </tr>
                ) : (
                  backups.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Database className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{b.filename}</span>
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
                            href={`http://localhost:4000/api/backup/download/${b.filename}`}
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
      )}
    </div>
  );
};
