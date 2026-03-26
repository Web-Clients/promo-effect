import React, { useState, useEffect } from 'react';
import { AdminSettings, AdminSettingsInput } from '../../../services/adminPricing';
import { WeightRange } from './types';

export interface GeneralSettingsTabProps {
  settings: AdminSettings | null;
  loading: boolean;
  onSave: (data: AdminSettingsInput) => void;
}

const defaultFormData = (): AdminSettingsInput => ({
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

export function GeneralSettingsTab({ settings, loading, onSave }: GeneralSettingsTabProps) {
  const [formData, setFormData] = useState<AdminSettingsInput>(defaultFormData());
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
    onSave({
      ...formData,
      weightRanges: JSON.stringify(ranges),
    });
  };

  const addRange = () => {
    setRanges([
      ...ranges,
      {
        label: 'Range nou',
        min: 0,
        max: 0,
        enabled: true,
        freightSurcharge: 0,
        terrestrialSurcharge: 0,
      },
    ]);
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
            <h4 className="text-md font-medium text-gray-900">
              Intervale de Greutate (Pentru Calculator)
            </h4>
            <button
              type="button"
              onClick={addRange}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Adaugă Interval
            </button>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            {ranges.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                Nu există intervale definite.
              </p>
            )}

            {ranges.length > 0 && (
              <div className="grid grid-cols-[1fr_80px_80px_100px_100px_32px_32px] gap-2 items-center text-xs text-gray-500 font-medium px-1 mb-1">
                <span>Etichetă</span>
                <span>Min (t)</span>
                <span>Max (t)</span>
                <span>+ Maritim ($)</span>
                <span>+ Terestru ($)</span>
                <span></span>
                <span></span>
              </div>
            )}
            {ranges.map((range, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_80px_80px_100px_100px_32px_32px] gap-2 items-center"
              >
                <input
                  type="text"
                  value={range.label}
                  onChange={(e) => updateRange(index, 'label', e.target.value)}
                  placeholder="ex: 1-10 tone"
                  className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={range.min}
                  onChange={(e) => updateRange(index, 'min', parseFloat(e.target.value))}
                  placeholder="Min"
                  step="0.1"
                  className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={range.max}
                  onChange={(e) => updateRange(index, 'max', parseFloat(e.target.value))}
                  placeholder="Max"
                  step="0.1"
                  className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={range.freightSurcharge || 0}
                  onChange={(e) =>
                    updateRange(index, 'freightSurcharge', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  step="1"
                  className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={range.terrestrialSurcharge || 0}
                  onChange={(e) =>
                    updateRange(index, 'terrestrialSurcharge', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  step="1"
                  className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="checkbox"
                  checked={range.enabled}
                  onChange={(e) => updateRange(index, 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded justify-self-center"
                />
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  className="text-red-500 hover:text-red-700 justify-self-center"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            + Maritim = nadbavka la tariful maritim (USD). + Terestru = nadbavka la transportul
            terestru (USD). Se aplică automat în calculator pe baza greutății selectate.
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
                onChange={(e) =>
                  setFormData({ ...formData, portTaxesConstanta: parseFloat(e.target.value) || 0 })
                }
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    terrestrialTransportConstanta: parseFloat(e.target.value) || 0,
                  })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, portTaxesOdessa: parseFloat(e.target.value) || 0 })
                }
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    terrestrialTransportOdessa: parseFloat(e.target.value) || 0,
                  })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, customsTaxes: parseFloat(e.target.value) || 0 })
                }
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comision (USD)</label>
              <input
                type="number"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, insuranceCost: parseFloat(e.target.value) || 0 })
                }
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
              onChange={(e) =>
                setFormData({ ...formData, profitMarginPercent: parseFloat(e.target.value) || 0 })
              }
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
