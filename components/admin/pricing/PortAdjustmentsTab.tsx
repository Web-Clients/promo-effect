import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PortAdjustment, PortAdjustmentInput } from '../../../services/adminPricing';
import { ORIGIN_PORTS } from './constants';

export interface PortAdjustmentsTabProps {
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

const defaultFormData = (): PortAdjustmentInput => ({
  portName: '',
  adjustment: 0,
  notes: '',
});

export function PortAdjustmentsTab({
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<PortAdjustmentInput>(defaultFormData());

  useEffect(() => {
    if (editingItem) {
      setFormData({
        portName: editingItem.portName,
        adjustment: editingItem.adjustment,
        notes: editingItem.notes || '',
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
          {editingItem ? t('pricing.editPortAdjustment') : t('pricing.addPortAdjustment')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pricing.portOrigin')}
            </label>
            <select
              value={formData.portName}
              onChange={(e) => setFormData({ ...formData, portName: e.target.value })}
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
              {t('pricing.adjustment')}
            </label>
            <input
              type="number"
              value={formData.adjustment}
              onChange={(e) =>
                setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })
              }
              required
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">{t('pricing.adjustmentHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pricing.notesCol')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('pricing.notesOptional')}
            />
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
        <div>
          <h3 className="text-lg font-medium">{t('pricing.portAdjustmentsTitle')}</h3>
          <p className="text-sm text-gray-500">{t('pricing.portAdjustmentsDesc')}</p>
        </div>
        <button
          onClick={onShowForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + {t('pricing.addAdjustment')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('pricing.portCol')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {t('pricing.adjustmentCol')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('pricing.notesCol')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {portAdjustments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {t('pricing.noPortAdjustments')}
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
                      {t('actions.edit')}
                    </button>
                    <button
                      onClick={() => onDelete(adj.id)}
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
  );
}
