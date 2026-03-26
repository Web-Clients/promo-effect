/**
 * Admin Pricing Panel
 * Management interface for base prices, port adjustments, and general settings
 * For Ion to manage prices without developer intervention
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredUser } from '../../../services/auth';
import {
  getBasePrices,
  createBasePrice,
  updateBasePrice,
  deleteBasePrice,
  getPortAdjustments,
  createPortAdjustment,
  updatePortAdjustment,
  deletePortAdjustment,
  getAdminSettings,
  updateAdminSettings,
  getPricingStats,
  BasePrice,
  BasePriceInput,
  PortAdjustment,
  PortAdjustmentInput,
  AdminSettings,
  AdminSettingsInput,
  PricingStats,
} from '../../../services/adminPricing';
import { Tab } from './types';
import { BasePricesTab } from './BasePricesTab';
import { PortAdjustmentsTab } from './PortAdjustmentsTab';
import { GeneralSettingsTab } from './GeneralSettingsTab';

export function AdminPricingPanel() {
  const { t } = useTranslation();
  const currentUser = getStoredUser();
  const isAgent = currentUser?.role === 'AGENT' || currentUser?.role === 'AGENT_CONSTANTA';
  const [activeTab, setActiveTab] = useState<Tab>('base-prices');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<PricingStats | null>(null);

  // Base Prices
  const [basePrices, setBasePrices] = useState<BasePrice[]>([]);
  const [editingBasePrice, setEditingBasePrice] = useState<BasePrice | null>(null);
  const [showBasePriceForm, setShowBasePriceForm] = useState(false);

  // Port Adjustments
  const [portAdjustments, setPortAdjustments] = useState<PortAdjustment[]>([]);
  const [editingPortAdjustment, setEditingPortAdjustment] = useState<PortAdjustment | null>(null);
  const [showPortAdjustmentForm, setShowPortAdjustmentForm] = useState(false);

  // Admin Settings
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    loadStats();
    loadBasePrices();
    loadPortAdjustments();
    loadAdminSettings();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getPricingStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadBasePrices = async () => {
    setLoading(true);
    try {
      const data = await getBasePrices();
      setBasePrices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPortAdjustments = async () => {
    try {
      const data = await getPortAdjustments();
      setPortAdjustments(data);
    } catch (err: any) {
      console.error('Failed to load port adjustments:', err);
    }
  };

  const loadAdminSettings = async () => {
    try {
      const data = await getAdminSettings();
      setAdminSettings(data);
    } catch (err: any) {
      console.error('Failed to load admin settings:', err);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  // ============================================
  // BASE PRICE HANDLERS
  // ============================================

  const handleSaveBasePrice = async (data: BasePriceInput) => {
    setLoading(true);
    try {
      if (editingBasePrice) {
        await updateBasePrice(editingBasePrice.id, data);
        showMessage(t('pricing.basePriceSaved'));
      } else {
        // Auto-deactivate existing active prices for the same route + container + shipping line
        const duplicates = basePrices.filter(
          (p) =>
            p.isActive &&
            p.shippingLine === data.shippingLine &&
            p.portOrigin === data.portOrigin &&
            p.portDestination === data.portDestination &&
            p.containerType === data.containerType
        );
        for (const dup of duplicates) {
          await updateBasePrice(dup.id, { isActive: false });
        }
        await createBasePrice(data);
        const deactivatedMsg =
          duplicates.length > 0
            ? ` (${duplicates.length} preț${duplicates.length > 1 ? 'uri vechi' : ' vechi'} dezactivat${duplicates.length > 1 ? 'e' : ''})`
            : '';
        showMessage(t('pricing.basePriceCreated') + deactivatedMsg);
      }
      setShowBasePriceForm(false);
      setEditingBasePrice(null);
      loadBasePrices();
      loadStats();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBasePrice = async (id: string) => {
    if (!confirm(t('pricing.basePriceDeleteConfirm'))) return;
    setLoading(true);
    try {
      await deleteBasePrice(id);
      showMessage(t('pricing.basePriceDeleted'));
      loadBasePrices();
      loadStats();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PORT ADJUSTMENT HANDLERS
  // ============================================

  const handleSavePortAdjustment = async (data: PortAdjustmentInput) => {
    setLoading(true);
    try {
      if (editingPortAdjustment) {
        await updatePortAdjustment(editingPortAdjustment.id, data);
        showMessage(t('pricing.portAdjSaved'));
      } else {
        await createPortAdjustment(data);
        showMessage(t('pricing.portAdjCreated'));
      }
      setShowPortAdjustmentForm(false);
      setEditingPortAdjustment(null);
      loadPortAdjustments();
      loadStats();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePortAdjustment = async (id: string) => {
    if (!confirm(t('pricing.portAdjDeleteConfirm'))) return;
    setLoading(true);
    try {
      await deletePortAdjustment(id);
      showMessage(t('pricing.portAdjDeleted'));
      loadPortAdjustments();
      loadStats();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADMIN SETTINGS HANDLERS
  // ============================================

  const handleSaveSettings = async (data: AdminSettingsInput) => {
    setLoading(true);
    try {
      await updateAdminSettings(data);
      showMessage(t('pricing.savedSuccess'));
      loadAdminSettings();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('pricing.title')}</h1>
        <p className="mt-2 text-gray-600">{t('pricing.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">{t('pricing.totalPrices')}</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalBasePrices}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">{t('pricing.activePrices')}</div>
            <div className="mt-1 text-3xl font-semibold text-green-600">
              {stats.activeBasePrices}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">{t('pricing.portAdjustments')}</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalPortAdjustments}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">
              {t('pricing.shippingCompanies')}
            </div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">
              {stats.shippingLinesCount}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('base-prices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'base-prices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('pricing.tabBasePrices')}
          </button>
          {!isAgent && (
            <button
              onClick={() => setActiveTab('port-adjustments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'port-adjustments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('pricing.tabPortAdjustments')}
            </button>
          )}
          {!isAgent && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('pricing.tabSettings')}
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'base-prices' && (
        <BasePricesTab
          basePrices={basePrices}
          loading={loading}
          showForm={showBasePriceForm}
          editingItem={editingBasePrice}
          onShowForm={() => {
            setEditingBasePrice(null);
            setShowBasePriceForm(true);
          }}
          onEdit={(item) => {
            setEditingBasePrice(item);
            setShowBasePriceForm(true);
          }}
          onDelete={handleDeleteBasePrice}
          onSave={handleSaveBasePrice}
          onCancel={() => {
            setShowBasePriceForm(false);
            setEditingBasePrice(null);
          }}
        />
      )}

      {activeTab === 'port-adjustments' && !isAgent && (
        <PortAdjustmentsTab
          portAdjustments={portAdjustments}
          loading={loading}
          showForm={showPortAdjustmentForm}
          editingItem={editingPortAdjustment}
          onShowForm={() => {
            setEditingPortAdjustment(null);
            setShowPortAdjustmentForm(true);
          }}
          onEdit={(item) => {
            setEditingPortAdjustment(item);
            setShowPortAdjustmentForm(true);
          }}
          onDelete={handleDeletePortAdjustment}
          onSave={handleSavePortAdjustment}
          onCancel={() => {
            setShowPortAdjustmentForm(false);
            setEditingPortAdjustment(null);
          }}
        />
      )}

      {activeTab === 'settings' && !isAgent && (
        <GeneralSettingsTab
          settings={adminSettings}
          loading={loading}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}

export default AdminPricingPanel;
