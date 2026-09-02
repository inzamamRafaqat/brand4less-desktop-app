import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PosTerminalPage } from './pages/PosTerminalPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { KhataLedgerPage } from './pages/KhataLedgerPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './lib/api';
import { RefreshCw } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('brand4less_sidebar_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('brand4less_sidebar_expanded', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'STAFF') {
        setActiveTab('pos');
      } else if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        setActiveTab('dashboard');
      }

      const fetchLowStock = async () => {
        try {
          const res = await api.get('/products/low-stock');
          if (res.items) setLowStockCount(res.items.length);
        } catch (e) {
          // ignore
        }
      };
      fetchLowStock();
    }
  }, [isAuthenticated, user?.role]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center text-slate-900 dark:text-slate-100">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-slate-900 dark:text-white animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Initializing Brand 4 Less Desktop Suite...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'pos':
        return { title: 'POS Billing Terminal', subtitle: 'Fast keyboard-driven cash & credit billing with SpeedX scanner' };
      case 'dashboard':
        return { title: 'Executive Overview', subtitle: 'Real-time sales, liquidity, and inventory valuation' };
      case 'sales':
        return { title: 'Sales & Order Invoices', subtitle: 'Completed customer sales, ticket history, and receipt reprints' };
      case 'customers':
        return { title: 'Customer Records & Purchase History', subtitle: 'Directory of registered customers, lifetime spend, and past receipts' };
      case 'inventory':
        return { title: 'Inventory & Variant Catalog', subtitle: 'Product attributes, stock levels, and adjustments' };
      case 'purchases':
        return { title: 'Purchases & Vendor Invoices', subtitle: 'Inbound purchase bills, moving WAC cost basis, and proofs' };
      case 'suppliers':
        return { title: 'Suppliers & Vendor Directory', subtitle: 'Supplier profiles, payment ledgers, and payables balance' };
      case 'import':
        return { title: 'Dynamic Bulk Excel Import', subtitle: 'Intelligent column mapping and error report generation' };
      case 'khata':
        return { title: 'Customer Khata Ledger', subtitle: 'Double-entry customer credit accounts and PDF/Excel statements' };
      case 'expenses':
        return { title: 'Operating Expenses & Staff Payroll', subtitle: 'Daily expenses and monthly staff salary approval' };
      case 'reports':
        return { title: 'Financial Analytics & P&L', subtitle: 'Trading profit, operating profit, and stock audit trails' };
      case 'settings':
        return { title: 'Settings & Hardware Integration', subtitle: 'TSC Label Printer, DTS Thermal Printer, SpeedX Scanner, and Backups' };
    }
  };

  const { title, subtitle } = getTabTitle(activeTab);

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none">
      {/* Full-Height Expandable Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        isExpanded={isSidebarExpanded}
        toggleExpanded={toggleSidebar}
      />

      {/* Main Viewport Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Full-Width Top Navbar Header */}
        <Header
          title={title}
          subtitle={subtitle}
          setActiveTab={setActiveTab}
          isSidebarExpanded={isSidebarExpanded}
          toggleSidebar={toggleSidebar}
        />

        {/* Full-Screen Edge-to-Edge Page Canvas */}
        <main className="flex-1 flex overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16] relative">
          {activeTab === 'pos' && <PosTerminalPage />}
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'sales' && <SalesPage />}
          {activeTab === 'customers' && <CustomersPage onNavigateToKhata={() => setActiveTab('khata')} />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'purchases' && <PurchasesPage />}
          {activeTab === 'suppliers' && <SuppliersPage />}
          {activeTab === 'import' && <BulkImportPage setActiveTab={setActiveTab} />}
          {activeTab === 'khata' && <KhataLedgerPage />}
          {activeTab === 'expenses' && <ExpensesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
