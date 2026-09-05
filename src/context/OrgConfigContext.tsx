import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface SchemaAttribute {
  id: string;
  name: string;
  code: string;
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
  options?: string[];
  isRequired: boolean;
  isVariantLevel: boolean;
  isSearchable: boolean;
  isPrintableOnLabel: boolean;
  isPrintableOnReceipt: boolean;
  displayOrder: number;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  tagline?: string;
  industry: 'APPAREL' | 'PHARMACY' | 'SUPERMARKET' | 'ELECTRONICS' | 'FOOTWEAR' | 'GENERAL';
  currency_code: string;
  currency_symbol: string;
  currency_position: 'BEFORE' | 'AFTER';
  decimal_places: number;
  tax_rate: number;
  tax_label: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  receipt_header?: string;
  receipt_footer?: string;
  return_policy?: string;
  barcode_standard: string;
  theme_color: string;
  label_printer_name?: string;
  receipt_printer_name?: string;
  auto_cut_receipt: number;
  kick_drawer: number;
}

interface OrgConfigContextType {
  org: OrganizationProfile | null;
  schemaAttributes: SchemaAttribute[];
  isLoading: boolean;
  formatPrice: (amount: number) => string;
  refreshOrgConfig: () => Promise<void>;
  updateOrgProfile: (data: Partial<OrganizationProfile>) => Promise<void>;
  switchIndustryPreset: (industry: string) => Promise<void>;
}

const OrgConfigContext = createContext<OrgConfigContextType | undefined>(undefined);

export const OrgConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [schemaAttributes, setSchemaAttributes] = useState<SchemaAttribute[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchConfig = async () => {
    try {
      const [orgRes, schemaRes] = await Promise.all([
        api.get('/organization'),
        api.get('/schema/attributes'),
      ]);

      if (orgRes.organization) setOrg(orgRes.organization);
      if (schemaRes.attributes) setSchemaAttributes(schemaRes.attributes);
    } catch (e) {
      console.error('Failed to load organization & schema config:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const formatPrice = (amount: number): string => {
    if (!org) return `Rs. ${Number(amount || 0).toLocaleString()}`;
    const decimals = org.decimal_places ?? 0;
    const formattedNum = Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const symbol = org.currency_symbol || 'Rs.';
    if (org.currency_position === 'AFTER') {
      return `${formattedNum} ${symbol}`;
    }
    return `${symbol} ${formattedNum}`;
  };

  const updateOrgProfile = async (data: Partial<OrganizationProfile>) => {
    const res = await api.put('/organization', data);
    if (res.organization) setOrg(res.organization);
  };

  const switchIndustryPreset = async (industry: string) => {
    const res = await api.post('/organization/switch-preset', { industry });
    if (res.organization) {
      setOrg(res.organization);
      await fetchConfig();
    }
  };

  return (
    <OrgConfigContext.Provider
      value={{
        org,
        schemaAttributes,
        isLoading,
        formatPrice,
        refreshOrgConfig: fetchConfig,
        updateOrgProfile,
        switchIndustryPreset,
      }}
    >
      {children}
    </OrgConfigContext.Provider>
  );
};

export const useOrgConfig = () => {
  const context = useContext(OrgConfigContext);
  if (!context) throw new Error('useOrgConfig must be used within an OrgConfigProvider');
  return context;
};
