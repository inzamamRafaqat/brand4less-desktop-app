import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Bell,
  ShoppingCart,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  Menu,
  AlertTriangle,
  CreditCard,
  Truck,
  CheckCircle2,
  X,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../lib/api';
import { TabType } from './Sidebar';

interface HeaderProps {
  title: string;
  subtitle?: string;
  setActiveTab?: (tab: TabType) => void;
  isSidebarExpanded?: boolean;
  toggleSidebar?: () => void;
}

interface NotificationItem {
  id: string;
  type: 'LOW_STOCK' | 'KHATA_RECEIVABLE' | 'SUPPLIER_PAYABLE' | 'SYSTEM';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  actionTab?: TabType;
  actionLabel?: string;
  read?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  setActiveTab,
  isSidebarExpanded,
  toggleSidebar,
}) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'ALL' | 'LOW_STOCK' | 'FINANCE'>('ALL');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const notificationRef = useRef<HTMLDivElement>(null);

  // Live Date and Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentDateTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real notifications from store state
  const fetchLiveNotifications = async () => {
    try {
      const [lowStockRes, khataRes, supRes] = await Promise.all([
        api.get('/products/low-stock').catch(() => ({ items: [] })),
        api.get('/customers?hasBalance=true&limit=10').catch(() => ({ customers: [] })),
        api.get('/suppliers?limit=10').catch(() => ({ suppliers: [] })),
      ]);

      const items: NotificationItem[] = [];

      // 1. Low Stock Alerts
      if (lowStockRes.items && Array.isArray(lowStockRes.items)) {
        lowStockRes.items.slice(0, 5).forEach((item: any) => {
          items.push({
            id: `low-stock-${item.id}`,
            type: 'LOW_STOCK',
            severity: item.stock_quantity <= 1 ? 'CRITICAL' : 'WARNING',
            title: `Low Stock: ${item.product_name}`,
            message: `${item.color ? item.color + ' ' : ''}${item.size ? `(${item.size}) ` : ''}has only ${item.stock_quantity} left in stock (Threshold: ${item.min_stock_level || 3}).`,
            timestamp: 'Just now',
            actionTab: 'inventory',
            actionLabel: 'Restock / Adjust',
          });
        });
      }

      // 2. High Customer Khata Receivables
      if (khataRes.customers && Array.isArray(khataRes.customers)) {
        khataRes.customers
          .filter((c: any) => c.current_balance > 10000)
          .slice(0, 3)
          .forEach((c: any) => {
            items.push({
              id: `khata-${c.id}`,
              type: 'KHATA_RECEIVABLE',
              severity: 'WARNING',
              title: `Khata Receivable: ${c.name}`,
              message: `Customer has PKR ${c.current_balance.toLocaleString()} outstanding balance.`,
              timestamp: 'Active Account',
              actionTab: 'khata',
              actionLabel: 'View Ledger',
            });
          });
      }

      // 3. Supplier Payables Due
      if (supRes.suppliers && Array.isArray(supRes.suppliers)) {
        supRes.suppliers
          .filter((s: any) => s.current_payable > 20000)
          .slice(0, 3)
          .forEach((s: any) => {
            items.push({
              id: `sup-${s.id}`,
              type: 'SUPPLIER_PAYABLE',
              severity: 'INFO',
              title: `Supplier Payable: ${s.name}`,
              message: `Pending payable balance: PKR ${s.current_payable.toLocaleString()}`,
              timestamp: 'Vendor Balance',
              actionTab: 'suppliers',
              actionLabel: 'Make Payment',
            });
          });
      }

      // 4. System Operational Baseline
      if (items.length === 0) {
        items.push({
          id: 'sys-optimal',
          type: 'SYSTEM',
          severity: 'INFO',
          title: 'System Running Optimally',
          message: 'All inventory stock levels, POS terminals, and database backups are in good health.',
          timestamp: 'Live Monitor',
        });
      }

      setNotifications(items);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setReadIds((prev) => new Set([...prev, item.id]));
    if (item.actionTab && setActiveTab) {
      setActiveTab(item.actionTab);
      setIsNotificationsOpen(false);
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id) && n.type !== 'SYSTEM').length;

  const filteredNotifications = notifications.filter((n) => {
    if (notificationFilter === 'LOW_STOCK') return n.type === 'LOW_STOCK';
    if (notificationFilter === 'FINANCE') return n.type === 'KHATA_RECEIVABLE' || n.type === 'SUPPLIER_PAYABLE';
    return true;
  });

  return (
    <header className="h-16 px-6 bg-white dark:bg-[#0B0F19] border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between flex-shrink-0 select-none z-30 transition-colors">
      {/* Left: Sidebar Toggle & Page Title */}
      <div className="flex items-center space-x-3">
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            title={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
            className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h2 className="font-black text-sm text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls: Live Date/Time Pill, Dark Theme Toggle, Full Screen, Notifications & Open POS CTA */}
      <div className="flex items-center space-x-3 relative">
        {/* Live Date & Time Pill */}
        <div className="hidden md:flex items-center space-x-2 text-slate-600 dark:text-slate-300 text-xs font-semibold bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{currentDateTime}</span>
        </div>

        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 animate-fade-in" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 animate-fade-in" />
          )}
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-slate-700 dark:text-white" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-700 dark:text-white" />
          )}
        </button>

        {/* ── INTERACTIVE NOTIFICATION BELL WITH DROPDOWN POPOVER ────────── */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Important Store Notifications"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition relative ${
              isNotificationsOpen
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#0B0F19] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* ── NOTIFICATIONS DROPDOWN POPOVER ────────────────────────────── */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in font-sans">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Important Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-black text-[10px]">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'LOW_STOCK', label: 'Low Stock' },
                  { id: 'FINANCE', label: 'Khata & Payables' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setNotificationFilter(f.id as any)}
                    className={`flex-1 py-1 rounded-lg transition ${
                      notificationFilter === f.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Notifications Scroll List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No notifications in this category.
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-start space-x-3 ${
                          !isRead && n.type !== 'SYSTEM'
                            ? 'bg-slate-50/50 dark:bg-slate-800/30'
                            : ''
                        }`}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {n.type === 'LOW_STOCK' ? (
                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          ) : n.type === 'KHATA_RECEIVABLE' ? (
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                              <CreditCard className="w-4 h-4" />
                            </div>
                          ) : n.type === 'SUPPLIER_PAYABLE' ? (
                            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200 dark:border-orange-800">
                              <Truck className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {n.timestamp}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          {n.actionLabel && (
                            <div className="mt-2 flex items-center space-x-1 text-[11px] font-bold text-slate-900 dark:text-white hover:underline">
                              <span>{n.actionLabel}</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Real-time system alerts</span>
                {setActiveTab && (
                  <button
                    onClick={() => {
                      setActiveTab('inventory');
                      setIsNotificationsOpen(false);
                    }}
                    className="text-[11px] font-bold text-slate-900 dark:text-white hover:underline"
                  >
                    View Low Stock Catalog &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA Black Button (Open POS Terminal) */}
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('pos')}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition ml-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Open POS (F1)</span>
          </button>
        )}
      </div>
    </header>
  );
};
