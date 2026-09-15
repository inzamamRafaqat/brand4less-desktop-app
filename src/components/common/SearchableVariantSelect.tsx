import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Tag } from 'lucide-react';

export interface VariantOption {
  id: string;
  label: string;
  costPrice?: number;
  sku?: string;
  color?: string;
  size?: string;
}

interface SearchableVariantSelectProps {
  variants: VariantOption[];
  value: string;
  onChange: (variantId: string, variant?: VariantOption) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableVariantSelect: React.FC<SearchableVariantSelectProps> = ({
  variants,
  value,
  onChange,
  placeholder = 'Select Variant...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected variant object
  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === value);
  }, [variants, value]);

  // Update fixed portal coordinates when opened
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  // Filtered variants (capped at 50 results for instant rendering speed)
  const filteredVariants = useMemo(() => {
    if (!searchTerm.trim()) {
      return variants.slice(0, 50);
    }
    const q = searchTerm.toLowerCase().trim();
    return variants
      .filter((v) => {
        const labelMatch = v.label?.toLowerCase().includes(q);
        const skuMatch = v.sku?.toLowerCase().includes(q);
        return labelMatch || skuMatch;
      })
      .slice(0, 50);
  }, [variants, searchTerm]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Outside click to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Also check if click was inside portaled dropdown
        const portal = document.getElementById('variant-select-portal');
        if (portal && portal.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative flex-1 min-w-0" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          updateCoords();
          setIsOpen(!isOpen);
        }}
        className={`w-full h-9 px-3 bg-white dark:bg-slate-900 border rounded-xl text-left text-xs flex items-center justify-between transition gap-1.5 ${
          isOpen
            ? 'border-slate-950 dark:border-white ring-1 ring-slate-950 dark:ring-white'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${selectedVariant ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
          {selectedVariant ? selectedVariant.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Portaled Dropdown Popup */}
      {isOpen &&
        createPortal(
          <div
            id="variant-select-portal"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-[9999] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
          {/* Top Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search variant by name, size, SKU..."
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-950 dark:focus:border-white"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  } else if (e.key === 'Enter' && filteredVariants.length > 0) {
                    e.preventDefault();
                    onChange(filteredVariants[0].id, filteredVariants[0]);
                    setIsOpen(false);
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span>{filteredVariants.length} matches shown</span>
              {searchTerm && <span>Press Enter to select top match</span>}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {filteredVariants.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No variants matching "{searchTerm}"
              </div>
            ) : (
              filteredVariants.map((v) => {
                const isSelected = v.id === value;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onChange(v.id, v);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="truncate font-medium">{v.label}</div>
                      {v.costPrice !== undefined && (
                        <div className={`text-[10px] mt-0.5 font-mono ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                          Cost: PKR {Number(v.costPrice).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
