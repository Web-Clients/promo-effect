/**
 * Admin Pricing Panel
 * Management interface for base prices, port adjustments, and general settings
 * For Ion to manage prices without developer intervention
 */

import React, { useState, useEffect } from 'react';
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
} from '../services/adminPricing';

type Tab = 'base-prices' | 'port-adjustments' | 'settings';

export function AdminPricingPanel() {
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

  // Load data on mount
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
        showMessage('Prețul de bază a fost actualizat');
      } else {
        await createBasePrice(data);
        showMessage('Prețul de bază a fost creat');
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
    if (!confirm('Sigur doriți să ștergeți acest preț de bază?')) return;
    setLoading(true);
    try {
      await deleteBasePrice(id);
      showMessage('Prețul de bază a fost șters');
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
        showMessage('Ajustarea portului a fost actualizată');
      } else {
        await createPortAdjustment(data);
        showMessage('Ajustarea portului a fost creată');
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
    if (!confirm('Sigur doriți să ștergeți această ajustare?')) return;
    setLoading(true);
    try {
      await deletePortAdjustment(id);
      showMessage('Ajustarea portului a fost ștearsă');
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
      showMessage('Setările au fost salvate');
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
        <h1 className="text-3xl font-bold text-gray-900">Administrare Prețuri</h1>
        <p className="mt-2 text-gray-600">
          Gestionați prețurile de bază, ajustările de port și setările generale
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Prețuri</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalBasePrices}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Prețuri Active</div>
            <div className="mt-1 text-3xl font-semibold text-green-600">{stats.activeBasePrices}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Ajustări Port</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalPortAdjustments}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Companii Transport</div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">{stats.shippingLinesCount}</div>
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
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'base-prices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Prețuri de Bază
          </button>
          <button
            onClick={() => setActiveTab('port-adjustments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'port-adjustments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Ajustări Port Origine
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Setări Generale
          </button>
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

      {activeTab === 'port-adjustments' && (
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

      {activeTab === 'settings' && (
        <SettingsTab
          settings={adminSettings}
          loading={loading}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}

// ============================================
// BASE PRICES TAB
// ============================================

interface BasePricesTabProps {
  basePrices: BasePrice[];
  loading: boolean;
  showForm: boolean;
  editingItem: BasePrice | null;
  onShowForm: () => void;
  onEdit: (item: BasePrice) => void;
  onDelete: (id: string) => void;
  onSave: (data: BasePriceInput) => void;
  onCancel: () => void;
}

function BasePricesTab({
  basePrices,
  loading,
  showForm,
  editingItem,
  onShowForm,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: BasePricesTabProps) {
  const [formData, setFormData] = useState<BasePriceInput>({
    shippingLine: '',
    portOrigin: '',
    portDestination: 'Constanța',
    containerType: '20DC',
    basePrice: 0,
    transitDays: 30,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        shippingLine: editingItem.shippingLine,
        portOrigin: editingItem.portOrigin,
        portDestination: editingItem.portDestination,
        containerType: editingItem.containerType,
        basePrice: editingItem.basePrice,
        transitDays: editingItem.transitDays,
        validFrom: editingItem.validFrom.split('T')[0],
        validUntil: editingItem.validUntil.split('T')[0],
        isActive: editingItem.isActive,
      });
    } else {
      setFormData({
        shippingLine: '',
        portOrigin: '',
        portDestination: 'Constanța',
        containerType: '20DC',
        basePrice: 0,
        transitDays: 30,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const shippingLines = ['MSC', 'COSCO', 'Maersk', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'Evergreen', 'Yang Ming', 'HMM'];
  const originPorts = ['Shanghai', 'Ningbo', 'Shenzhen', 'Qingdao', 'Tianjin', 'Xiamen', 'Guangzhou', 'Dalian', 'Hong Kong'];
  const destPorts = ['Constanța', 'Odessa'];
  const containerTypes = ['20DC', '40DC', '40HC', '20RF', '40RF'];

  if (showForm) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">
          {editingItem ? 'Editare Preț de Bază' : 'Adăugare Preț de Bază'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Companie Transport
              </label>
              <select
                value={formData.shippingLine}
                onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selectați...</option>
                {shippingLines.map((line) => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port Origine
              </label>
              <select
                value={formData.portOrigin}
                onChange={(e) => setFormData({ ...formData, portOrigin: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selectați...</option>
                {originPorts.map((port) => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port Destinație
              </label>
              <select
                value={formData.portDestination}
                onChange={(e) => setFormData({ ...formData, portDestination: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {destPorts.map((port) => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip Container
              </label>
              <select
                value={formData.containerType}
                onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {containerTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preț de Bază (USD)
              </label>
              <input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zile Tranzit
              </label>
              <input
                type="number"
                value={formData.transitDays}
                onChange={(e) => setFormData({ ...formData, transitDays: parseInt(e.target.value) || 0 })}
                required
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Din
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Până La
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Preț activ
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Prețuri de Bază (Freight)</h3>
        <button
          onClick={onShowForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Adaugă Preț
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Companie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port Origine</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port Dest.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Container</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preț (USD)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Zile</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {basePrices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Nu există prețuri de bază. Adăugați primul preț.
                  </td>
                </tr>
              ) : (
                basePrices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{price.shippingLine}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{price.portOrigin}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{price.portDestination}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{price.containerType}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">${price.basePrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-center">{price.transitDays}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${price.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {price.isActive ? 'Activ' : 'Inactiv'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onEdit(price)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => onDelete(price.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PORT ADJUSTMENTS TAB
// ============================================

interface PortAdjustmentsTabProps {
  portAdjustments: PortAdjustment[];
  loading: boolean;
  showForm: boolean;
  editingItem: PortAdjustment | null;
  onShowForm: () => void;
  onEdit: (item: PortAdjustment) => void;
  onDelete: (id: string) => void;
  onSave: (data: PortAdjustmentInput) => void;
  onCancel: () => void;
}

function PortAdjustmentsTab({
  portAdjustments,
  loading,
  showForm,
  editingItem,
  onShowForm,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: PortAdjustmentsTabProps) {
  const [formData, setFormData] = useState<PortAdjustmentInput>({
    portName: '',
    adjustment: 0,
    notes: '',
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        portName: editingItem.portName,
        adjustment: editingItem.adjustment,
        notes: editingItem.notes || '',
      });
    } else {
      setFormData({
        portName: '',
        adjustment: 0,
        notes: '',
      });
    }
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const originPorts = ['Shanghai', 'Ningbo', 'Shenzhen', 'Qingdao', 'Tianjin', 'Xiamen', 'Guangzhou', 'Dalian', 'Hong Kong'];

  if (showForm) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">
          {editingItem ? 'Editare Ajustare Port' : 'Adăugare Ajustare Port'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port Origine
            </label>
            <select
              value={formData.portName}
              onChange={(e) => setFormData({ ...formData, portName: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selectați...</option>
              {originPorts.map((port) => (
                <option key={port} value={port}>{port}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ajustare Preț (USD)
            </label>
            <input
              type="number"
              value={formData.adjustment}
              onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
              required
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Valoare pozitivă pentru adăugare, negativă pentru reducere
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Note opționale..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Ajustări Port Origine</h3>
          <p className="text-sm text-gray-500">
            Ajustări de preț bazate pe portul de origine din China
          </p>
        </div>
        <button
          onClick={onShowForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Adaugă Ajustare
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ajustare (USD)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {portAdjustments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nu există ajustări de port. Adăugați prima ajustare.
                </td>
              </tr>
            ) : (
              portAdjustments.map((adj) => (
                <tr key={adj.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{adj.portName}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={adj.adjustment >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {adj.adjustment >= 0 ? '+' : ''}${adj.adjustment.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{adj.notes || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onEdit(adj)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Editează
                    </button>
                    <button
                      onClick={() => onDelete(adj.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS TAB
// ============================================

interface SettingsTabProps {
  settings: AdminSettings | null;
  loading: boolean;
  onSave: (data: AdminSettingsInput) => void;
}

interface WeightRange {
  label: string;
  min: number;
  max: number;
  enabled: boolean;
}

function SettingsTab({ settings, loading, onSave }: SettingsTabProps) {
  const [formData, setFormData] = useState<AdminSettingsInput>({
    portTaxesConstanta: 221.67,
    terrestrialTransportConstanta: 600,
    portTaxesOdessa: 200,
    terrestrialTransportOdessa: 550,
    customsTaxes: 150,
    commission: 200,
    insuranceCost: 50,
    profitMarginPercent: 10,
    weightRanges: '[]',
  });

  const [ranges, setRanges] = useState<WeightRange[]>([]);

  useEffect(() => {
    if (settings) {
      setFormData({
        portTaxesConstanta: settings.portTaxesConstanta,
        terrestrialTransportConstanta: settings.terrestrialTransportConstanta,
        portTaxesOdessa: settings.portTaxesOdessa,
        terrestrialTransportOdessa: settings.terrestrialTransportOdessa,
        customsTaxes: settings.customsTaxes,
        commission: settings.commission,
        insuranceCost: settings.insuranceCost,
        profitMarginPercent: settings.profitMarginPercent,
        weightRanges: settings.weightRanges || '[]',
      });

      // Parse weight ranges
      try {
        const parsedRanges = JSON.parse(settings.weightRanges || '[]');
        if (Array.isArray(parsedRanges)) {
          setRanges(parsedRanges);
        }
      } catch (e) {
        console.error('Failed to parse weight ranges', e);
        setRanges([]);
      }
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Include current ranges in submission
    onSave({
      ...formData,
      weightRanges: JSON.stringify(ranges)
    });
  };

  const addRange = () => {
    setRanges([...ranges, { label: 'Range nou', min: 0, max: 0, enabled: true }]);
  };

  const removeRange = (index: number) => {
    const newRanges = [...ranges];
    newRanges.splice(index, 1);
    setRanges(newRanges);
  };

  const updateRange = (index: number, field: keyof WeightRange, value: any) => {
    const newRanges = [...ranges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setRanges(newRanges);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-6">Setări Generale de Preț</h3>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Weight Ranges Config */}
        <div className="border-b pb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900">Intervale de Greutate (Pentru Calculator)</h4>
            <button
              type="button"
              onClick={addRange}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Adaugă Interval
            </button>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            {ranges.length === 0 && <p className="text-sm text-gray-500 text-center py-2">Nu există intervale definite.</p>}

            {ranges.map((range, index) => (
              <div key={index} className="flex gap-3 items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={range.label}
                    onChange={(e) => updateRange(index, 'label', e.target.value)}
                    placeholder="Etichetă (ex: 1-10 tone)"
                    className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={range.min}
                    onChange={(e) => updateRange(index, 'min', parseFloat(e.target.value))}
                    placeholder="Min"
                    step="0.1"
                    className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={range.max}
                    onChange={(e) => updateRange(index, 'max', parseFloat(e.target.value))}
                    placeholder="Max"
                    step="0.1"
                    className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={range.enabled}
                    onChange={(e) => updateRange(index, 'enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Aceste intervale sunt folosite în calculatorul de pe site pentru a determina costurile. Asigurați-vă că nu se suprapun (prea mult).
          </p>
        </div>

        {/* Constanța Section */}
        <div className="border-b pb-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Constanța (România)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxe Portuare (USD)
              </label>
              <input
                type="number"
                value={formData.portTaxesConstanta}
                onChange={(e) => setFormData({ ...formData, portTaxesConstanta: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Terestru (USD)
              </label>
              <input
                type="number"
                value={formData.terrestrialTransportConstanta}
                onChange={(e) => setFormData({ ...formData, terrestrialTransportConstanta: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Odessa Section */}
        <div className="border-b pb-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Odessa (Ucraina)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxe Portuare (USD)
              </label>
              <input
                type="number"
                value={formData.portTaxesOdessa}
                onChange={(e) => setFormData({ ...formData, portTaxesOdessa: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Terestru (USD)
              </label>
              <input
                type="number"
                value={formData.terrestrialTransportOdessa}
                onChange={(e) => setFormData({ ...formData, terrestrialTransportOdessa: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* General Costs */}
        <div className="border-b pb-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Costuri Generale</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxe Vamale (USD)
              </label>
              <input
                type="number"
                value={formData.customsTaxes}
                onChange={(e) => setFormData({ ...formData, customsTaxes: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comision (USD)
              </label>
              <input
                type="number"
                value={formData.commission}
                onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asigurare (USD)
              </label>
              <input
                type="number"
                value={formData.insuranceCost}
                onChange={(e) => setFormData({ ...formData, insuranceCost: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Marja de Profit</h4>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Procent Profit (%)
            </label>
            <input
              type="number"
              value={formData.profitMarginPercent}
              onChange={(e) => setFormData({ ...formData, profitMarginPercent: parseFloat(e.target.value) || 0 })}
              step="0.1"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Se salvează...' : 'Salvează Setările'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminPricingPanel;
