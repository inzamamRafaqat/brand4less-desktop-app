import React from 'react';
import {
  Home,
  ShoppingCart,
  Receipt,
  Boxes,
  ShoppingBag,
  Truck,
  FileSpreadsheet,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabType =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'customers'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'import'
  | 'khata'
  | 'expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  lowStockCount?: number;
  isExpanded?: boolean;
  toggleExpanded?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount = 0,
  isExpanded = true,
  toggleExpanded,
}) => {
  const { user, logout, hasRole } = useAuth();

  const navItems: { id: TabType; label: string; icon: any; roles?: string[]; badge?: number }[] = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: Home, roles: ['ADMIN', 'MANAGER'] },
    { id: 'pos', label: 'POS Billing Terminal', icon: ShoppingCart },
    { id: 'sales', label: 'Sales & Orders', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { id: 'customers', label: 'Customer Records', icon: User, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { id: 'inventory', label: 'Product Inventory', icon: Boxes, badge: lowStockCount },
    { id: 'purchases', label: 'Purchases & Invoices', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER'] },
    { id: 'suppliers', label: 'Suppliers & Payables', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { id: 'import', label: 'Bulk Import', icon: FileSpreadsheet, roles: ['ADMIN', 'MANAGER'] },
    { id: 'khata', label: 'Customer Khata', icon: CreditCard },
    { id: 'expenses', label: 'Expenses & Payroll', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
    { id: 'reports', label: 'Financial Analytics', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { id: 'settings', label: 'Settings & Backups', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => {
    if (!item.roles) return true;
    return hasRole(...item.roles);
  });

  return (
    <aside
      className={`bg-white dark:bg-[#0B0F19] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between h-full flex-shrink-0 select-none transition-all duration-300 z-20 ${
        isExpanded ? 'w-64 px-4 py-4' : 'w-20 px-2 py-4 items-center'
      }`}
    >
      {/* Top Brand Identity & Toggle */}
      <div>
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            {/* Diamond / Geometric Logo Icon */}
            <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-sm flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            {isExpanded && (
              <div className="overflow-hidden">
                <h1 className="font-black text-sm text-slate-900 dark:text-white tracking-tight leading-none truncate">
                  BRAND 4 LESS
                </h1>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                  Retail Desktop Suite
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          {toggleExpanded && isExpanded && (
            <button
              onClick={toggleExpanded}
              title="Collapse Sidebar"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 pt-2">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`relative w-full rounded-2xl flex items-center transition-all ${
                  isExpanded
                    ? 'px-3.5 py-3 space-x-3 text-left'
                    : 'w-12 h-12 justify-center mx-auto'
                } ${
                  isActive
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />

                {isExpanded && (
                  <span className="font-bold text-xs flex-1 truncate">
                    {item.label}
                  </span>
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-black text-[10px] rounded-full flex items-center justify-center ${
                      isExpanded
                        ? 'px-2 py-0.5 bg-amber-500 text-white'
                        : 'absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white border-2 border-white dark:border-slate-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Info & Logout Button */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {isExpanded ? (
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {user?.username || 'User'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  {user?.role || 'Staff'}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title={`Logout (${user?.username})`}
            className="w-12 h-12 mx-auto rounded-2xl text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
};
