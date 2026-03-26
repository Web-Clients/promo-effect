import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BasePrice, BasePriceInput } from '../../../services/adminPricing';
import { SHIPPING_LINES, ORIGIN_PORTS, DEST_PORTS, CONTAINER_TYPES } from './constants';

export interface BasePricesTabProps {
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

const defaultFormData = (): BasePriceInput => ({
  shippingLine: '',
  portOrigin: '',
  portDestination: 'Constanța',
  containerType: '20DC',
  basePrice: 0,
  transitDays: 0,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  isActive: true,
  portTaxes: null,
  terrestrialTransport: null,
  customsTaxes: null,
  commission: null,
});

export function BasePricesTab({
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<BasePriceInput>(defaultFormData());

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
        portTaxes: editingItem.portTaxes,
        terrestrialTransport: editingItem.terrestrialTransport,
        customsTaxes: editingItem.customsTaxes,
        commission: editingItem.commission,
      });
    } else {
      setFormData(defaultFormData());
    }
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (showForm) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">
          {editingItem ? t('pricing.editBasePrice') : t('pricing.addBasePrice')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.shippingCompany')}
              </label>
              <select
                value={formData.shippingLine}
                onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('pricing.selectOption')}</option>
                {SHIPPING_LINES.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.portOrigin')}
              </label>
              <select
                value={formData.portOrigin}
                onChange={(e) => setFormData({ ...formData, portOrigin: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('pricing.selectOption')}</option>
                {ORIGIN_PORTS.map((port) => (
                  <option key={port} value={port}>
                    {port}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.portDestination')}
              </label>
              <select
                value={formData.portDestination}
                onChange={(e) => setFormData({ ...formData, portDestination: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DEST_PORTS.map((port) => (
                  <option key={port} value={port}>
                    {port}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.containerType')}
              </label>
              <select
                value={formData.containerType}
                onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CONTAINER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.basePriceUSD')}
              </label>
              <input
                type="number"
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                }
                required
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.transitDays')}
              </label>
              <input
                type="number"
                value={formData.transitDays || ''}
                onChange={(e) =>
                  setFormData({ ...formData, transitDays: parseInt(e.target.value) || 0 })
                }
                min="0"
                placeholder="Auto"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">{t('pricing.transitDaysHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pricing.validFrom')}
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
                {t('pricing.validUntil')}
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
              {t('pricing.priceActive')}
            </label>
          </div>

          {/* Per-Line Cost Overrides */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t('pricing.lineSpecificCosts')}
            </h4>
            <p className="text-xs text-gray-500 mb-3">{t('pricing.lineSpecificHint')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pricing.portTaxes')}
                </label>
                <input
                  type="number"
                  value={formData.portTaxes ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      portTaxes: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                  placeholder="Global"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pricing.terrestrialTransport')}
                </label>
                <input
                  type="number"
                  value={formData.terrestrialTransport ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      terrestrialTransport:
                        e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                  placeholder="Global"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pricing.customsTaxes')}
                </label>
                <input
                  type="number"
                  value={formData.customsTaxes ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customsTaxes: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                  placeholder="Global"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pricing.commission')}
                </label>
                <input
                  type="number"
                  value={formData.commission ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commission: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                  placeholder="Global"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('actions.saving') : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{t('pricing.basePricesTitle')}</h3>
        <button
          onClick={onShowForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + {t('pricing.addPrice')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.companyCol')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.portOriginCol')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.portDestCol')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.containerCol')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.priceCol')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.daysCol')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {t('pricing.lineTaxesCol')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {basePrices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {t('pricing.noBasePrices')}
                  </td>
                </tr>
              ) : (
                basePrices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {price.shippingLine}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{price.portOrigin}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{price.portDestination}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{price.containerType}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ${price.basePrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {price.transitDays > 0 ? (
                        price.transitDays
                      ) : (
                        <span className="text-gray-400 italic">Auto</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {price.portTaxes !== null ||
                      price.terrestrialTransport !== null ||
                      price.customsTaxes !== null ||
                      price.commission !== null ? (
                        <span
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800"
                          title={[
                            price.portTaxes !== null ? `Taxe: $${price.portTaxes}` : null,
                            price.terrestrialTransport !== null
                              ? `Transport: $${price.terrestrialTransport}`
                              : null,
                            price.customsTaxes !== null ? `Vamale: $${price.customsTaxes}` : null,
                            price.commission !== null ? `Comision: $${price.commission}` : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        >
                          Da
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          price.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {price.isActive ? t('status.active') : t('status.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onEdit(price)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        {t('actions.edit')}
                      </button>
                      <button
                        onClick={() => onDelete(price.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        {t('actions.delete')}
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
