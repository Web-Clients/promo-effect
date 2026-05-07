/**
 * LandPricingMatrixTab — editable matrix for land (terrestrial) transport rates.
 *
 * Two sub-tabs: "Import (Port → Moldova)" and "Export (Moldova → Port)"
 * Each is a city × weight-range matrix with inline-editable USD prices.
 * Auto-saves on blur (same pattern as PortPricingMatrixTab).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getLandRates,
  patchLandRate,
  createLandRate,
  deleteLandRate,
  LandTransportRate,
} from '../../../services/adminPricing';

// ──────────────────────────────────────────────
// Weight intervals (shared for both directions)
// ──────────────────────────────────────────────
const WEIGHT_RANGES = [
  { label: '<23 mt', min: 0, max: 23 },
  { label: '23-24 mt', min: 23, max: 24 },
  { label: '24-25 mt', min: 24, max: 25 },
  { label: '25-26 mt', min: 25, max: 26 },
  { label: '26-27 mt', min: 26, max: 27 },
  { label: '27-28 mt', min: 27, max: 28 },
] as const;

type Direction = 'IMPORT' | 'EXPORT';
type CellState = 'idle' | 'saving' | 'saved' | 'error';

interface CellMeta {
  state: CellState;
  error?: string;
}

// ──────────────────────────────────────────────
// Matrix helpers
// ──────────────────────────────────────────────
type MatrixData = Record<
  string,
  Record<string, { id: string; price: number; notes?: string | null }>
>;

function buildMatrix(rows: LandTransportRate[]): MatrixData {
  const m: MatrixData = {};
  for (const row of rows) {
    if (!m[row.city]) m[row.city] = {};
    const key = `${row.weightMin}-${row.weightMax}`;
    m[row.city][key] = { id: row.id, price: row.priceUSD, notes: row.notes };
  }
  return m;
}

function weightKey(min: number, max: number) {
  return `${min}-${max}`;
}

function cellKey(city: string, min: number, max: number) {
  return `${city}::${min}-${max}`;
}

// ──────────────────────────────────────────────
// Main matrix panel for one direction
// ──────────────────────────────────────────────
interface DirectionPanelProps {
  direction: Direction;
  title: string;
  subtitle: string;
}

function DirectionPanel({ direction, title, subtitle }: DirectionPanelProps) {
  const [matrix, setMatrix] = useState<MatrixData>({});
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cellMeta, setCellMeta] = useState<Record<string, CellMeta>>({});
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});
  const [addingCity, setAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getLandRates(direction);
      const m = buildMatrix(rows);
      setMatrix(m);
      setCities(Object.keys(m).sort((a, b) => a.localeCompare(b, 'ro')));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    load();
  }, [load]);

  // Cell meta helpers
  const updateCellMeta = (city: string, min: number, max: number, meta: CellMeta) => {
    setCellMeta((prev) => ({ ...prev, [cellKey(city, min, max)]: meta }));
  };

  const getCellValue = (city: string, min: number, max: number): string => {
    const k = cellKey(city, min, max);
    if (k in editBuffer) return editBuffer[k];
    return String(matrix[city]?.[weightKey(min, max)]?.price ?? 0);
  };

  const saveCell = useCallback(
    async (city: string, min: number, max: number, rawValue: string) => {
      const parsed = parseFloat(rawValue);
      const value = isNaN(parsed) ? 0 : parsed;
      const wk = weightKey(min, max);
      const ck = cellKey(city, min, max);
      const existingId = matrix[city]?.[wk]?.id;

      // Optimistic update
      setMatrix((prev) => ({
        ...prev,
        [city]: {
          ...prev[city],
          [wk]: { ...(prev[city]?.[wk] ?? { id: '', notes: null }), price: value },
        },
      }));
      setEditBuffer((prev) => {
        const n = { ...prev };
        delete n[ck];
        return n;
      });
      updateCellMeta(city, min, max, { state: 'saving' });

      try {
        if (existingId) {
          await patchLandRate(existingId, { priceUSD: value });
        } else {
          // Cell doesn't exist yet (new city row or first seed) — create it
          const wr = WEIGHT_RANGES.find((r) => r.min === min && r.max === max);
          const created = await createLandRate({
            direction,
            city,
            weightMin: min,
            weightMax: max,
            weightLabel: wr?.label ?? `${min}-${max} mt`,
            priceUSD: value,
          });
          setMatrix((prev) => ({
            ...prev,
            [city]: { ...prev[city], [wk]: { id: created.id, price: value, notes: created.notes } },
          }));
        }
        updateCellMeta(city, min, max, { state: 'saved' });
        setTimeout(() => {
          setCellMeta((prev) => {
            const n = { ...prev };
            if (n[ck]?.state === 'saved') delete n[ck];
            return n;
          });
        }, 1500);
      } catch (err) {
        updateCellMeta(city, min, max, {
          state: 'error',
          error: err instanceof Error ? err.message : 'Eroare',
        });
        // Revert
        setMatrix((prev) => ({
          ...prev,
          [city]: {
            ...prev[city],
            [wk]: {
              ...(prev[city]?.[wk] ?? { id: '', notes: null }),
              price: matrix[city]?.[wk]?.price ?? 0,
            },
          },
        }));
      }
    },
    [matrix, direction]
  );

  const handleFocus = (city: string, min: number, max: number) => {
    const k = cellKey(city, min, max);
    if (!(k in editBuffer)) {
      setEditBuffer((prev) => ({ ...prev, [k]: getCellValue(city, min, max) }));
    }
  };

  const handleChange = (city: string, min: number, max: number, val: string) => {
    const k = cellKey(city, min, max);
    setEditBuffer((prev) => ({ ...prev, [k]: val }));
    if (saveTimers.current[k]) clearTimeout(saveTimers.current[k]);
    saveTimers.current[k] = setTimeout(() => saveCell(city, min, max, val), 600);
  };

  const handleBlur = (city: string, min: number, max: number) => {
    const k = cellKey(city, min, max);
    if (saveTimers.current[k]) clearTimeout(saveTimers.current[k]);
    const val = editBuffer[k];
    if (val !== undefined) saveCell(city, min, max, val);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    city: string,
    min: number,
    max: number
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setEditBuffer((prev) => {
        const n = { ...prev };
        delete n[cellKey(city, min, max)];
        return n;
      });
      e.currentTarget.blur();
    }
  };

  const handleDeleteCity = async (city: string) => {
    if (!window.confirm(`Ștergeți orașul "${city}" și toate prețurile sale din ${direction}?`))
      return;
    try {
      const ids = Object.values(matrix[city] ?? {})
        .map((c) => c.id)
        .filter(Boolean);
      await Promise.all(ids.map((id) => deleteLandRate(id)));
      setMatrix((prev) => {
        const n = { ...prev };
        delete n[city];
        return n;
      });
      setCities((prev) => prev.filter((c) => c !== city));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  const handleAddCity = async () => {
    const name = newCityName.trim();
    if (!name) return;
    if (cities.includes(name)) {
      alert(`Orașul "${name}" există deja.`);
      return;
    }

    // Add optimistically with zeros
    setMatrix((prev) => ({
      ...prev,
      [name]: Object.fromEntries(
        WEIGHT_RANGES.map((wr) => [weightKey(wr.min, wr.max), { id: '', price: 0, notes: null }])
      ),
    }));
    setCities((prev) => [...prev, name].sort((a, b) => a.localeCompare(b, 'ro')));
    setNewCityName('');
    setAddingCity(false);

    // Persist all zero cells
    for (const wr of WEIGHT_RANGES) {
      try {
        const created = await createLandRate({
          direction,
          city: name,
          weightMin: wr.min,
          weightMax: wr.max,
          weightLabel: wr.label,
          priceUSD: 0,
        });
        setMatrix((prev) => ({
          ...prev,
          [name]: {
            ...prev[name],
            [weightKey(wr.min, wr.max)]: { id: created.id, price: 0, notes: null },
          },
        }));
      } catch (_) {
        /* user can fill cells manually */
      }
    }
  };

  // Cell visual feedback
  const getCellBg = (city: string, min: number, max: number) => {
    const meta = cellMeta[cellKey(city, min, max)];
    if (!meta) return '';
    if (meta.state === 'saving') return 'bg-yellow-50';
    if (meta.state === 'saved') return 'bg-green-50';
    if (meta.state === 'error') return 'bg-red-50';
    return '';
  };

  const getCellIcon = (city: string, min: number, max: number) => {
    const meta = cellMeta[cellKey(city, min, max)];
    if (!meta) return null;
    if (meta.state === 'saving')
      return (
        <span className="absolute right-0.5 top-0.5 text-yellow-500 text-[10px] animate-spin">
          ⟳
        </span>
      );
    if (meta.state === 'saved')
      return (
        <span className="absolute right-0.5 top-0.5 text-green-600 text-[10px]" title="Salvat">
          ✓
        </span>
      );
    if (meta.state === 'error')
      return (
        <span className="absolute right-0.5 top-0.5 text-red-600 text-[10px]" title={meta.error}>
          !
        </span>
      );
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Eroare la încărcare:</p>
        <p>{loadError}</p>
        <button
          onClick={load}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Reîncearcă
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <button
          onClick={() => setAddingCity(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
        >
          + Adaugă oraș
        </button>
      </div>

      {/* Add city row */}
      {addingCity && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="text"
            autoFocus
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCity();
              if (e.key === 'Escape') {
                setAddingCity(false);
                setNewCityName('');
              }
            }}
            placeholder="Nume oraș (ex: Cahul)"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddCity}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Adaugă
          </button>
          <button
            onClick={() => {
              setAddingCity(false);
              setNewCityName('');
            }}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            Anulează
          </button>
        </div>
      )}

      {/* Matrix table */}
      {cities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>Nu există date pentru {direction}.</p>
          <button
            onClick={() => setAddingCity(true)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + Adaugă primul oraș
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 min-w-[180px] sticky left-0 bg-gray-50 z-20">
                  Oraș / Destinație
                </th>
                {WEIGHT_RANGES.map((wr) => (
                  <th
                    key={wr.label}
                    className="px-3 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[90px] whitespace-nowrap"
                  >
                    {wr.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold text-gray-700 min-w-[80px]">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {cities.map((city, rowIdx) => {
                const notes = Object.values(matrix[city] ?? {})[0]?.notes;
                return (
                  <tr key={city} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2 font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-inherit z-10">
                      <div className="flex flex-col">
                        <span>{city}</span>
                        {notes && (
                          <span className="text-xs text-gray-400 font-normal">{notes}</span>
                        )}
                      </div>
                    </td>
                    {WEIGHT_RANGES.map((wr) => {
                      const ck = cellKey(city, wr.min, wr.max);
                      const isEditing = ck in editBuffer;
                      const displayVal = getCellValue(city, wr.min, wr.max);
                      const numVal = parseFloat(displayVal) || 0;
                      return (
                        <td
                          key={wr.label}
                          className={`px-1 py-1 border-r border-gray-100 ${getCellBg(city, wr.min, wr.max)}`}
                        >
                          <div className="relative">
                            <input
                              type="number"
                              value={displayVal}
                              step="50"
                              min="0"
                              onFocus={() => handleFocus(city, wr.min, wr.max)}
                              onChange={(e) => handleChange(city, wr.min, wr.max, e.target.value)}
                              onBlur={() => handleBlur(city, wr.min, wr.max)}
                              onKeyDown={(e) => handleKeyDown(e, city, wr.min, wr.max)}
                              className={`
                                w-full text-center text-sm rounded px-1 py-1 border
                                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                                ${isEditing ? 'border-blue-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300 hover:bg-white'}
                                ${!isEditing && numVal > 0 ? 'text-gray-900 font-medium' : ''}
                                ${!isEditing && numVal === 0 ? 'text-gray-400' : ''}
                              `}
                            />
                            {getCellIcon(city, wr.min, wr.max)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDeleteCity(city)}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                        title={`Șterge ${city}`}
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Prețuri în USD per camion. Click pe orice celulă pentru a edita. Salvarea este automată.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Tab container with IMPORT / EXPORT switcher
// ──────────────────────────────────────────────
export function LandPricingMatrixTab() {
  const [activeDir, setActiveDir] = useState<Direction>('IMPORT');

  return (
    <div>
      {/* Direction selector */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveDir('IMPORT')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeDir === 'IMPORT'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Import (Port → Moldova)
          </button>
          <button
            onClick={() => setActiveDir('EXPORT')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeDir === 'EXPORT'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Export (Moldova → Port)
          </button>
        </nav>
      </div>

      {activeDir === 'IMPORT' && (
        <DirectionPanel
          key="import"
          direction="IMPORT"
          title="Import — Port → Destinație Moldova"
          subtitle="Prețuri transport terestru: din port (Constanța/Odessa) până la destinația în Moldova. USD per camion, pe interval de greutate."
        />
      )}
      {activeDir === 'EXPORT' && (
        <DirectionPanel
          key="export"
          direction="EXPORT"
          title="Export — Origine Moldova → Port"
          subtitle="Prețuri transport terestru: din Moldova până la port (Constanța/Odessa). USD per camion, pe interval de greutate."
        />
      )}
    </div>
  );
}
