import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Sliders,
  FileSpreadsheet,
  Users,
  Truck,
  DollarSign,
  TrendingUp,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrgConfig } from '../../context/OrgConfigContext';

export type TabType =
  | 'dashboard'
  | 'onboarding'
  | 'pos'
  | 'sales'
  | 'products'
  | 'schema_builder'
  | 'import'
  | 'customers'
  | 'purchases'
  | 'expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isExpanded,
  onToggleExpand,
}) => {
  const { user, logout, hasRole } = useAuth();
  const { org } = useOrgConfig();

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Executive Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { id: 'pos' as TabType, label: 'POS Terminal', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { id: 'sales' as TabType, label: 'Sales & Invoices', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { id: 'products' as TabType, label: 'Product Catalog', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { id: 'schema_builder' as TabType, label: 'Dynamic Schema Studio', icon: Sliders, roles: ['ADMIN'] },
    { id: 'import' as TabType, label: 'Dynamic Excel Importer', icon: FileSpreadsheet, roles: ['ADMIN', 'MANAGER'] },
    { id: 'customers' as TabType, label: 'Customers & Khata', icon: Users, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { id: 'purchases' as TabType, label: 'Purchases & Suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { id: 'expenses' as TabType, label: 'Expenses & Payroll', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
    { id: 'reports' as TabType, label: 'P&L & Financial Reports', icon: TrendingUp, roles: ['ADMIN', 'MANAGER'] },
    { id: 'onboarding' as TabType, label: 'Industry Preset Wizard', icon: Sparkles, roles: ['ADMIN'] },
    { id: 'settings' as TabType, label: 'Branding & Hardware', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter((it) => !it.roles || (user && it.roles.includes(user.role)));

  return (
    <aside
      className={`h-screen flex flex-col bg-white dark:bg-[#0E131F] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        {isExpanded ? (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-md shadow-emerald-600/30 flex-shrink-0 text-base">
              {org?.name?.charAt(0) || 'O'}
            </div>
            <div className="truncate">
              <h1 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                {org?.name || 'OmniRetail'}
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                {org?.industry || 'RETAIL'}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-md shadow-emerald-600/30 text-base">
            {org?.name?.charAt(0) || 'O'}
          </div>
        )}

        <button
          onClick={onToggleExpand}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center rounded-xl font-semibold text-xs transition-all ${
                isExpanded ? 'px-3.5 py-2.5 space-x-3' : 'p-3 justify-center'
              } ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          {isExpanded && (
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 font-mono capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
