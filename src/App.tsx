import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { OrgConfigProvider } from './context/OrgConfigContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Pages
import { OnboardingWizardPage } from './pages/OnboardingWizardPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosTerminalPage } from './pages/PosTerminalPage';
import { SalesPage } from './pages/SalesPage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import { CustomSchemaBuilderPage } from './pages/CustomSchemaBuilderPage';
import { DynamicImportPage } from './pages/DynamicImportPage';
import { CustomerCrmPage } from './pages/CustomerCrmPage';
import { KhataLedgerPage } from './pages/KhataLedgerPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ExpensesPayrollPage } from './pages/ExpensesPayrollPage';
import { FinancialReportsPage } from './pages/FinancialReportsPage';
import { SettingsStudioPage } from './pages/SettingsStudioPage';

export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('omniretail_sidebar_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('omniretail_sidebar_expanded', String(next));
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-emerald-500 font-mono text-sm">
        Initializing OmniRetail Enterprise Engine...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isExpanded={isSidebarExpanded}
        onToggleExpand={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header onOpenPresetWizard={() => setActiveTab('onboarding')} />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'onboarding' && <OnboardingWizardPage />}
          {activeTab === 'pos' && <PosTerminalPage />}
          {activeTab === 'sales' && <SalesPage />}
          {activeTab === 'products' && <ProductCatalogPage />}
          {activeTab === 'schema_builder' && <CustomSchemaBuilderPage />}
          {activeTab === 'import' && <DynamicImportPage />}
          {activeTab === 'customers' && <CustomerCrmPage />}
          {activeTab === 'purchases' && <PurchasesPage />}
          {activeTab === 'expenses' && <ExpensesPayrollPage />}
          {activeTab === 'reports' && <FinancialReportsPage />}
          {activeTab === 'settings' && <SettingsStudioPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <OrgConfigProvider>
          <AppContent />
        </OrgConfigProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
