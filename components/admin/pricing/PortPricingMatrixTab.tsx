/**
 * PortPricingMatrixTab — spreadsheet-like matrix of port × container type adjustments.
 * Each cell is inline-editable; saves on blur/Enter via PATCH API.
 * "+ Adaugă port" appends a new editable row.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getPortMatrix,
  patchPortMatrixCell,
  deletePortMatrixPort,
  PortMatrixRow,
} from '../../../services/adminPricing';
import { CONTAINER_TYPES } from './constants';

type CellState = 'idle' | 'saving' | 'saved' | 'error';

interface CellMeta {
  state: CellState;
  error?: string;
}

// keyed by "portName::containerType"
type CellMetaMap = Record<string, CellMeta>;

interface MatrixData {
  [portName: string]: {
    [containerType: string]: number;
  };
}

function buildMatrix(rows: PortMatrixRow[]): MatrixData {
  const m: MatrixData = {};
  for (const row of rows) {
    if (!m[row.portName]) m[row.portName] = {};
    m[row.portName][row.containerType] = row.adjustment;
  }
  return m;
}

function getAllPorts(matrix: MatrixData): string[] {
  return Object.keys(matrix).sort((a, b) => a.localeCompare(b));
}

export function PortPricingMatrixTab() {
  const [rows, setRows] = useState<PortMatrixRow[]>([]);
  const [matrix, setMatrix] = useState<MatrixData>({});
  const [ports, setPorts] = useState<string[]>([]);
  const [cellMeta, setCellMeta] = useState<CellMetaMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New port row state
  const [newPortName, setNewPortName] = useState('');
  const [addingPort, setAddingPort] = useState(false);

  // Edit buffer: portName::containerType => string value while editing
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPortMatrix();
      setRows(data);
      const m = buildMatrix(data);
      setMatrix(m);
      setPorts(getAllPorts(m));
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cellKey = (port: string, ct: string) => `${port}::${ct}`;

  const getCellValue = (port: string, ct: string): string => {
    const key = cellKey(port, ct);
    if (key in editBuffer) return editBuffer[key];
    const v = matrix[port]?.[ct];
    return v !== undefined ? String(v) : '0';
  };

  const setCellMeta_ = (port: string, ct: string, meta: CellMeta) => {
    setCellMeta((prev) => ({ ...prev, [cellKey(port, ct)]: meta }));
  };

  const saveCell = useCallback(
    async (port: string, ct: string, rawValue: string) => {
      const parsed = parseFloat(rawValue);
      const value = isNaN(parsed) ? 0 : parsed;

      // Update local matrix optimistically
      setMatrix((prev) => ({
        ...prev,
        [port]: { ...prev[port], [ct]: value },
      }));
      setEditBuffer((prev) => {
        const next = { ...prev };
        delete next[cellKey(port, ct)];
        return next;
      });

      setCellMeta_(port, ct, { state: 'saving' });
      try {
        await patchPortMatrixCell(port, ct, value);
        setCellMeta_(port, ct, { state: 'saved' });
        // Clear "saved" indicator after 1.5s
        setTimeout(() => {
          setCellMeta_((p: string, c: string) => p, ct);
          setCellMeta((prev) => {
            const next = { ...prev };
            const k = cellKey(port, ct);
            if (next[k]?.state === 'saved') delete next[k];
            return next;
          });
        }, 1500);
      } catch (err: unknown) {
        setCellMeta_(port, ct, {
          state: 'error',
          error: err instanceof Error ? err.message : 'Eroare',
        });
        // Revert on error
        setMatrix((prev) => {
          const originalRow = rows.find((r) => r.portName === port && r.containerType === ct);
          return {
            ...prev,
            [port]: { ...prev[port], [ct]: originalRow?.adjustment ?? 0 },
          };
        });
      }
    },
    [rows]
  );

  const handleCellFocus = (port: string, ct: string) => {
    const key = cellKey(port, ct);
    if (!(key in editBuffer)) {
      const v = matrix[port]?.[ct];
      setEditBuffer((prev) => ({ ...prev, [key]: v !== undefined ? String(v) : '0' }));
    }
  };

  const handleCellChange = (port: string, ct: string, value: string) => {
    setEditBuffer((prev) => ({ ...prev, [cellKey(port, ct)]: value }));
    // Debounce auto-save on change (500ms)
    const k = cellKey(port, ct);
    if (saveTimers.current[k]) clearTimeout(saveTimers.current[k]);
    saveTimers.current[k] = setTimeout(() => {
      saveCell(port, ct, value);
    }, 600);
  };

  const handleCellBlur = (port: string, ct: string) => {
    const k = cellKey(port, ct);
    if (saveTimers.current[k]) clearTimeout(saveTimers.current[k]);
    const val = editBuffer[k];
    if (val !== undefined) {
      saveCell(port, ct, val);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    port: string,
    ct: string
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      // Revert
      setEditBuffer((prev) => {
        const next = { ...prev };
        delete next[cellKey(port, ct)];
        return next;
      });
      e.currentTarget.blur();
    }
  };

  const handleDeletePort = async (port: string) => {
    if (!window.confirm(`Ștergeți portul "${port}" și toate ajustările sale?`)) return;
    try {
      await deletePortMatrixPort(port);
      setMatrix((prev) => {
        const next = { ...prev };
        delete next[port];
        return next;
      });
      setPorts((prev) => prev.filter((p) => p !== port));
      setRows((prev) => prev.filter((r) => r.portName !== port));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  const handleAddPort = async () => {
    const name = newPortName.trim();
    if (!name) return;
    if (ports.includes(name)) {
      alert(`Portul "${name}" există deja.`);
      return;
    }
    // Add locally first with all zeros
    setMatrix((prev) => ({
      ...prev,
      [name]: Object.fromEntries(CONTAINER_TYPES.map((ct) => [ct, 0])),
    }));
    setPorts((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
    setNewPortName('');
    setAddingPort(false);
    // Save all zero cells to backend
    for (const ct of CONTAINER_TYPES) {
      try {
        await patchPortMatrixCell(name, ct, 0);
      } catch (_) {
        // ignore individual failures — user can edit cells later
      }
    }
  };

  const getCellBg = (port: string, ct: string) => {
    const meta = cellMeta[cellKey(port, ct)];
    if (!meta) return '';
    if (meta.state === 'saving') return 'bg-yellow-50';
    if (meta.state === 'saved') return 'bg-green-50';
    if (meta.state === 'error') return 'bg-red-50';
    return '';
  };

  const getCellIcon = (port: string, ct: string) => {
    const meta = cellMeta[cellKey(port, ct)];
    if (!meta) return null;
    if (meta.state === 'saving')
      return (
        <span className="absolute right-0.5 top-0.5 text-yellow-500 animate-spin text-[10px]">
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
          <h3 className="text-lg font-medium text-gray-900">Matricea Ajustărilor de Port</h3>
          <p className="text-sm text-gray-500 mt-1">
            Click pe orice celulă pentru a edita. Salvarea este automată la fiecare modificare.
            Valori în USD (+/−).
          </p>
        </div>
        <button
          onClick={() => setAddingPort(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
        >
          + Adaugă port
        </button>
      </div>

      {/* Add port row */}
      {addingPort && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="text"
            autoFocus
            value={newPortName}
            onChange={(e) => setNewPortName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPort();
              if (e.key === 'Escape') {
                setAddingPort(false);
                setNewPortName('');
              }
            }}
            placeholder="Nume port (ex: Fuzhou)"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddPort}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Adaugă
          </button>
          <button
            onClick={() => {
              setAddingPort(false);
              setNewPortName('');
            }}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            Anulează
          </button>
        </div>
      )}

      {/* Matrix table */}
      {ports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>Nu există porturi în matrice.</p>
          <button
            onClick={() => setAddingPort(true)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + Adaugă primul port
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 min-w-[160px] sticky left-0 bg-gray-50 z-20">
                  Port
                </th>
                {CONTAINER_TYPES.map((ct) => (
                  <th
                    key={ct}
                    className="px-3 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[80px]"
                  >
                    {ct}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold text-gray-700 min-w-[80px]">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {ports.map((port, rowIdx) => (
                <tr key={port} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-2 font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-inherit z-10">
                    {port}
                  </td>
                  {CONTAINER_TYPES.map((ct) => {
                    const k = cellKey(port, ct);
                    const isEditing = k in editBuffer;
                    const displayVal = getCellValue(port, ct);
                    const numVal = parseFloat(displayVal) || 0;
                    return (
                      <td
                        key={ct}
                        className={`px-1 py-1 border-r border-gray-100 ${getCellBg(port, ct)}`}
                      >
                        <div className="relative">
                          <input
                            type="number"
                            value={displayVal}
                            step="1"
                            onFocus={() => handleCellFocus(port, ct)}
                            onChange={(e) => handleCellChange(port, ct, e.target.value)}
                            onBlur={() => handleCellBlur(port, ct)}
                            onKeyDown={(e) => handleCellKeyDown(e, port, ct)}
                            className={`
                              w-full text-center text-sm rounded px-1 py-1 border
                              focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                              ${isEditing ? 'border-blue-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300 hover:bg-white'}
                              ${!isEditing && numVal > 0 ? 'text-red-600 font-medium' : ''}
                              ${!isEditing && numVal < 0 ? 'text-green-600 font-medium' : ''}
                              ${!isEditing && numVal === 0 ? 'text-gray-400' : ''}
                            `}
                          />
                          {getCellIcon(port, ct)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDeletePort(port)}
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                      title={`Șterge ${port}`}
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Roșu = adăugare la preț (+USD) | Verde = reducere (−USD) | Gri = 0 (fără ajustare)
      </p>
    </div>
  );
}
