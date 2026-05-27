import React, { useEffect, useRef, useState } from 'react';
import trackingService, { VesselDirectoryEntry } from '../../services/tracking';

interface VesselPickerProps {
  containerId: string;
  currentMmsi?: string | null;
  currentName?: string | null;
  onAssigned?: (mmsi: string) => void;
}

/**
 * Operator widget for assigning the AIS vessel to a container. Used when
 * the email parser couldn't auto-resolve the vessel name (rare: when the
 * vessel is outside the AISStream trade-route bbox or hasn't broadcast
 * its identity yet). Lets the operator paste a name/IMO/MMSI and pick
 * from live AISStream directory matches.
 */
const VesselPicker: React.FC<VesselPickerProps> = ({
  containerId,
  currentMmsi,
  currentName,
  onAssigned,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VesselDirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMmsi, setSavedMmsi] = useState<string | null>(currentMmsi || null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const hits = await trackingService.searchVesselDirectory(query);
        setResults(hits);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const assign = async (vessel: VesselDirectoryEntry) => {
    setSaving(true);
    setError(null);
    try {
      await trackingService.setContainerVessel(containerId, {
        mmsi: vessel.mmsi,
        imo: vessel.imo || undefined,
        name: vessel.name || undefined,
      });
      setSavedMmsi(vessel.mmsi);
      setResults([]);
      setQuery('');
      onAssigned?.(vessel.mmsi);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Eroare la atribuire');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Navă (AIS)</h4>
        {savedMmsi && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ● MMSI {savedMmsi}
          </span>
        )}
      </div>

      {currentName && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Curent: <span className="font-medium">{currentName}</span>
          {!savedMmsi && (
            <span className="text-amber-600 dark:text-amber-400 ml-2">
              (fără MMSI — caută mai jos)
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută după nume, IMO sau MMSI…"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={saving}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
            …
          </div>
        )}
      </div>

      {results.length > 0 && (
        <ul className="border border-neutral-200 dark:border-neutral-700 rounded-md max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-700">
          {results.map((v) => (
            <li
              key={v.mmsi}
              className="px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer flex items-center justify-between gap-3"
              onClick={() => !saving && assign(v)}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                  {v.name || '(fără nume)'}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  MMSI {v.mmsi}
                  {v.imo ? ` · IMO ${v.imo}` : ''}
                  {v.destination ? ` · ${v.destination}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                disabled={saving}
              >
                Atribuie
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 italic">
          Niciun rezultat. Nava poate să nu fi transmis încă identitatea (ShipStaticData se trimite
          la ~6 min) sau e în afara bbox-ului trade-route. Încearcă peste câteva minute sau verifică
          pe vesselfinder.com / marinetraffic.com.
        </div>
      )}

      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
};

export default VesselPicker;
