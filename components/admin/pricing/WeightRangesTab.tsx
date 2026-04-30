/**
 * WeightRangesTab
 * Admin UI for managing weight surcharges per container type
 * Used in AdminPricingPanel — Tab A23/A24
 */

import React, { useState } from 'react';
import { CONTAINER_TYPES } from './constants';
import { WeightRange } from './types';

const DEFAULT_LABELS = [
  '1-18 tone',
  '18-23 tone',
  '23-24 tone',
  '24-25 tone',
  '25-26 tone',
  '26-27 tone',
  '27-28 tone',
];

interface WeightRangeRow extends WeightRange {
  id?: string;
  containerType: string;
}

interface Props {
  // If DB-backed, these would be loaded from API.
  // For now we render a static editable grid with localStorage persistence.
  weightRanges?: WeightRangeRow[];
  onSave?: (ranges: WeightRangeRow[]) => void;
}

const STORAGE_KEY = 'admin_weight_ranges_v1';

function loadFromStorage(): WeightRangeRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // ignore parse errors
  }

  // Default: all zero surcharges
  return CONTAINER_TYPES.flatMap((ct) =>
    DEFAULT_LABELS.map((label, _idx) => ({
      containerType: ct,
      label,
      min: parseFloat(label.split('-')[0]),
      max: parseFloat(label.split('-')[1]) || 28,
      enabled: true,
      freightSurcharge: 0,
      terrestrialSurcharge: 0,
    }))
  );
}

export function WeightRangesTab({ onSave }: Props) {
  const [rows, setRows] = useState<WeightRangeRow[]>(loadFromStorage);
  const [selectedContainer, setSelectedContainer] = useState<string>(CONTAINER_TYPES[0]);
  const [saved, setSaved] = useState(false);

  const visibleRows = rows.filter((r) => r.containerType === selectedContainer);

  const updateRow = (
    label: string,
    field: 'freightSurcharge' | 'terrestrialSurcharge' | 'enabled',
    value: number | boolean
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.containerType === selectedContainer && r.label === label ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    onSave?.(rows);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Intervale Greutate</h2>
          <p className="text-sm text-gray-500 mt-1">
            Suprataxe pe greutate per tip container. Modificările se aplică la calculul prețului.
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            saved
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saved ? 'Salvat!' : 'Salvează'}
        </button>
      </div>

      {/* Container type selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CONTAINER_TYPES.map((ct) => (
          <button
            key={ct}
            onClick={() => setSelectedContainer(ct)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium border transition-colors ${
              selectedContainer === ct
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {ct}
          </button>
        ))}
      </div>

      {/* Weight range table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Interval</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Suprataxă Navlu ($)</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                Suprataxă Transport ($)
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Activ</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={row.freightSurcharge}
                    onChange={(e) =>
                      updateRow(row.label, 'freightSurcharge', parseFloat(e.target.value) || 0)
                    }
                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={row.terrestrialSurcharge}
                    onChange={(e) =>
                      updateRow(row.label, 'terrestrialSurcharge', parseFloat(e.target.value) || 0)
                    }
                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => updateRow(row.label, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Notă: Datele sunt salvate local până la implementarea migrației DB (A21). Rulați migrația
        din docs/audits/A21-PRICING-MIGRATION.md pentru persistența în DB.
      </p>
    </div>
  );
}

export default WeightRangesTab;
