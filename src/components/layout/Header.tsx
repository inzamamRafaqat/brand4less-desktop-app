import React from 'react';
import { Sun, Moon, Sparkles, Building2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useOrgConfig } from '../../context/OrgConfigContext';

interface HeaderProps {
  onOpenPresetWizard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPresetWizard }) => {
  const { theme, toggleTheme } = useTheme();
  const { org } = useOrgConfig();

  return (
    <header className="h-16 px-6 bg-white dark:bg-[#0E131F] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>{org?.name || 'Retail Store'}</span>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          {org?.currency_symbol} ({org?.currency_code}) • Tax: {org?.tax_rate}%
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {onOpenPresetWizard && (
          <button
            onClick={onOpenPresetWizard}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch Industry</span>
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
