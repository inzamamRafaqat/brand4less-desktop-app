import React, { useState, useEffect } from 'react';
import { useOrgConfig, OrganizationProfile } from '../context/OrgConfigContext';
import { api } from '../lib/api';
import {
  Settings,
  Building,
  Printer,
  Database,
  Save,
  Zap,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Percent,
} from 'lucide-react';

export const SettingsStudioPage: React.FC = () => {
  const { org, updateOrgProfile } = useOrgConfig();
  const [activeTab, setActiveTab] = useState<'BRANDING' | 'RECEIPT' | 'HARDWARE' | 'BACKUPS'>('BRANDING');

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [currencyCode, setCurrencyCode] = useState('PKR');
  const [currencyPosition, setCurrencyPosition] = useState<'BEFORE' | 'AFTER'>('BEFORE');
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxLabel, setTaxLabel] = useState('GST / Sales Tax');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');

  // Hardware State
  const [printers, setPrinters] = useState<any[]>([]);
  const [labelPrinter, setLabelPrinter] = useState('');
  const [receiptPrinter, setReceiptPrinter] = useState('');
  const [isTestingTsc, setIsTestingTsc] = useState(false);
  const [isTestingDts, setIsTestingDts] = useState(false);
  const [hardwareFeedback, setHardwareFeedback] = useState<string | null>(null);

  // Backup State
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  // Save Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name || '');
      setTagline(org.tagline || '');
      setCurrencySymbol(org.currency_symbol || 'Rs.');
      setCurrencyCode(org.currency_code || 'PKR');
      setCurrencyPosition(org.currency_position || 'BEFORE');
      setDecimalPlaces(org.decimal_places ?? 0);
      setTaxRate(org.tax_rate ?? 0);
      setTaxLabel(org.tax_label || 'GST / Sales Tax');
      setPhone(org.phone || '');
      setEmail(org.email || '');
      setAddress(org.address || '');
      setReturnPolicy(org.return_policy || '');
      setLabelPrinter(org.label_printer_name || '');
      setReceiptPrinter(org.receipt_printer_name || '');
    }
  }, [org]);

  const loadPrinters = async () => {
    try {
      const res = await api.get('/hardware/printers');
      if (res.printers) setPrinters(res.printers);
    } catch (e) {
      console.error('Failed to load printers:', e);
    }
  };

  const loadBackups = async () => {
    try {
      const res = await api.get('/backup/list');
      if (res.backups) setBackups(res.backups);
    } catch (e) {
      console.error('Failed to load backups:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'HARDWARE') loadPrinters();
    if (activeTab === 'BACKUPS') loadBackups();
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOrgProfile({
        name,
        tagline,
        currency_symbol: currencySymbol,
        currency_code: currencyCode,
        currency_position: currencyPosition,
        decimal_places: Number(decimalPlaces),
        tax_rate: Number(taxRate),
        tax_label: taxLabel,
        phone,
        email,
        address,
        return_policy: returnPolicy,
        label_printer_name: labelPrinter || undefined,
        receipt_printer_name: receiptPrinter || undefined,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save settings failed: ${err.message}`);
    }
  };

  const handleTestTsc = async () => {
    setIsTestingTsc(true);
    setHardwareFeedback(null);
    try {
      const res = await api.post('/hardware/test-tsc', { printerName: labelPrinter });
      setHardwareFeedback(res.message || 'TSPL test sticker dispatched.');
    } catch (err: any) {
      alert(`TSC test failed: ${err.message}`);
    } finally {
      setIsTestingTsc(false);
    }
  };

  const handleTestDts = async () => {
    setIsTestingDts(true);
    setHardwareFeedback(null);
    try {
      const res = await api.post('/hardware/test-dts', { printerName: receiptPrinter });
      setHardwareFeedback(res.message || 'ESC/POS test receipt dispatched.');
    } catch (err: any) {
      alert(`DTS test failed: ${err.message}`);
    } finally {
      setIsTestingDts(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupSuccess(null);
    try {
      const res = await api.post('/backup/create', { label: 'manual' });
      setBackupSuccess(`Backup created: ${res.backup.filename} (${res.backup.sizeFormatted})`);
      await loadBackups();
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Store Customization & Hardware Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure white-label branding, currency, tax rates, TSC/DTS hardware printers, and database backups.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {[
            { id: 'BRANDING', label: 'Branding & Currency', icon: Building },
            { id: 'RECEIPT', label: 'Receipt Designer', icon: Printer },
            { id: 'HARDWARE', label: 'Printers & Hardware', icon: Zap },
            { id: 'BACKUPS', label: 'Database Backups', icon: Database },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Settings successfully saved and applied store-wide!</span>
        </div>
      )}

      {/* Tab 1: Branding & Currency */}
      {activeTab === 'BRANDING' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Store Identity & Multi-Currency Engine
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store / Business Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store Tagline / Slogan</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency Symbol *</label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Rs., $, €, £, AED, SAR"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency Code *</label>
              <input
                type="text"
                required
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                placeholder="PKR, USD, EUR, GBP"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Tax / VAT Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Label Text</label>
              <input
                type="text"
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
                placeholder="GST / Sales Tax"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone / Helpline</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Receipt Designer */}
      {activeTab === 'RECEIPT' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Thermal Receipt & Invoice Designer
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Return & Exchange Policy Disclaimer
            </label>
            <textarea
              rows={3}
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              placeholder="e.g. Items can be exchanged within 7 days with original receipt. No cash refunds."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Receipt Policy</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Hardware Diagnostics */}
      {activeTab === 'HARDWARE' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Hardware Printers & SpeedX Scanner Diagnostics
              </h3>
              <p className="text-xs text-slate-500">Configure direct spooler queues and run test prints.</p>
            </div>
            <button
              onClick={loadPrinters}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Refresh Spooler
            </button>
          </div>

          {hardwareFeedback && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{hardwareFeedback}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TSC Label Printer Card */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-600">
                <Zap className="w-5 h-5 fill-current" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  TSC Label Printer (TSPL)
                </h4>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Installed Spooler Queue
                </label>
                <select
                  value={labelPrinter}
                  onChange={(e) => setLabelPrinter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Auto-Detect / Default (TSC) --</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.driverName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleTestTsc}
                disabled={isTestingTsc}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5"
              >
                <Zap className="w-4 h-4" />
                <span>{isTestingTsc ? 'Printing Test Sticker...' : 'Test TSC Label Print'}</span>
              </button>
            </div>

            {/* DTS Receipt Printer Card */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-600">
                <Printer className="w-5 h-5" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  DTS Receipt Printer (ESC/POS)
                </h4>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Installed Spooler Queue
                </label>
                <select
                  value={receiptPrinter}
                  onChange={(e) => setReceiptPrinter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Auto-Detect / Default (DTS) --</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.driverName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleTestDts}
                disabled={isTestingDts}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{isTestingDts ? 'Printing Test Slip...' : 'Test DTS Receipt Print & Cash Drawer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Database Backups */}
      {activeTab === 'BACKUPS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Atomic SQLite Database Backups
              </h3>
              <p className="text-xs text-slate-500">Create instant hot database snapshots without shutting down the store.</p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>{isBackingUp ? 'Creating Snapshot...' : 'Create Hot Backup Now'}</span>
            </button>
          </div>

          {backupSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{backupSuccess}</span>
            </div>
          )}

          {/* Backup List */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Backup File</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No backups found. Click "Create Hot Backup Now".
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.filename} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{b.filename}</td>
                      <td className="py-2.5 px-3">{b.sizeFormatted}</td>
                      <td className="py-2.5 px-3 text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`/api/backup/download/${b.filename}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-sans font-bold inline-flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
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
