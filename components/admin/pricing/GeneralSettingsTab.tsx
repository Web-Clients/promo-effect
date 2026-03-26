import React, { useState, useEffect } from 'react';
import { AdminSettings, AdminSettingsInput } from '../../../services/adminPricing';
import { WeightRange } from './types';
import { CONTAINER_TYPES } from './constants';

const DEFAULT_WEIGHT_INTERVALS: Array<{ label: string; min: number; max: number }> = [
  { label: '1-18 tone', min: 1, max: 18 },
  { label: '18-23 tone', min: 18, max: 23 },
  { label: '23-24 tone', min: 23, max: 24 },
  { label: '24-25 tone', min: 24, max: 25 },
  { label: '25-26 tone', min: 25, max: 26 },
  { label: '26-27 tone', min: 26, max: 27 },
  { label: '27-28 tone', min: 27, max: 28 },
];

const buildDefaultRanges = (): WeightRange[] =>
  CONTAINER_TYPES.flatMap((ct) =>
    DEFAULT_WEIGHT_INTERVALS.map((interval) => ({
      label: interval.label,
      min: interval.min,
      max: interval.max,
      enabled: true,
      freightSurcharge: 0,
      terrestrialSurcharge: 0,
      containerType: ct,
    }))
  );

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
  const [activeContainerTab, setActiveContainerTab] = useState<string>(CONTAINER_TYPES[0]);

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
        if (Array.isArray(parsedRanges) && parsedRanges.length > 0) {
          setRanges(parsedRanges);
        } else {
          setRanges(buildDefaultRanges());
        }
      } catch (e) {
        console.error('Failed to parse weight ranges', e);
        setRanges(buildDefaultRanges());
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

  const addRangeForContainer = (containerType: string) => {
    setRanges([
      ...ranges,
      {
        label: 'Range nou',
        min: 0,
        max: 0,
        enabled: true,
        freightSurcharge: 0,
        terrestrialSurcharge: 0,
        containerType,
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

  const resetToDefaults = () => {
    if (
      window.confirm(
        'Resetați toate intervalele la valorile implicite? Modificările nesalvate se vor pierde.'
      )
    ) {
      setRanges(buildDefaultRanges());
    }
  };

  // Get ranges for the active container type tab
  const activeRanges = ranges
    .map((r, i) => ({ range: r, index: i }))
    .filter(({ range }) => !range.containerType || range.containerType === activeContainerTab);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-6">Setări Generale de Preț</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Weight Ranges Config */}
        <div className="border-b pb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900">
              Intervale de Greutate (Per Tip Container)
            </h4>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetToDefaults}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Resetează Implicit
              </button>
              <button
                type="button"
                onClick={() => addRangeForContainer(activeContainerTab)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Adaugă Interval
              </button>
            </div>
          </div>

          {/* Container Type Tabs */}
          <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200">
            {CONTAINER_TYPES.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => setActiveContainerTab(ct)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors ${
                  activeContainerTab === ct
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {ct}{' '}
                <span className="text-gray-400">
                  ({ranges.filter((r) => r.containerType === ct).length})
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            {activeRanges.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                Nu există intervale pentru {activeContainerTab}.{' '}
                <button
                  type="button"
                  onClick={() => addRangeForContainer(activeContainerTab)}
                  className="text-blue-600 hover:underline"
                >
                  Adaugă primul interval
                </button>
              </p>
            )}

            {activeRanges.length > 0 && (
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
            {activeRanges.map(({ range, index }) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_80px_80px_100px_100px_32px_32px] gap-2 items-center"
              >
                <input
                  type="text"
                  value={range.label}
                  onChange={(e) => updateRange(index, 'label', e.target.value)}
                  placeholder="ex: 1-18 tone"
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
            Intervale configurate per tip de container (7 intervale implicite: 1-18, 18-23, 23-24,
            24-25, 25-26, 26-27, 27-28 tone). + Maritim = suprataxa la tariful maritim (USD). +
            Terestru = suprataxa la transportul terestru (USD).
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
