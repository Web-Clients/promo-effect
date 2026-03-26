/**
 * Transport Rates Page
 * Admin page to manage terrestrial transport rates per container type and weight range.
 * The calculator uses these rates when computing total cost.
 */

import React, { useState, useEffect } from 'react';
import shippingLinesService, { TransportRate, TransportRateInput } from '../services/shippingLines';
import { getErrorMessage } from '../utils/formatters';

const CONTAINER_TYPES = ['20DC', '40DC', '40HC', '20RF', '40RF'];
const DESTINATIONS = ['Constanța', 'Odessa'];
const DEFAULT_WEIGHT_RANGES = ['1-10 tone', '10-20 tone', '20-23 tone', '23-24 tone'];

// Icons
const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
    />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);
const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function TransportRatesPage() {
  const [items, setItems] = useState<TransportRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransportRateInput>({
    containerType: CONTAINER_TYPES[0],
    weightRange: DEFAULT_WEIGHT_RANGES[0],
    destination: DESTINATIONS[0],
    rate: 0,
    isActive: true,
  });

  // Filter
  const [filterDest, setFilterDest] = useState<string>('Constanța');

  const filteredItems = items.filter((item) => !filterDest || item.destination === filterDest);

  // Build matrix: rows = weight ranges, cols = container types
  const weightRanges: string[] = Array.from(
    new Set(filteredItems.map((i) => i.weightRange))
  ).sort();
  const containerTypes: string[] = Array.from(
    new Set(filteredItems.map((i) => i.containerType))
  ).sort();

  // Build lookup map
  const rateMap: Record<string, TransportRate> = {};
  filteredItems.forEach((item) => {
    rateMap[`${item.containerType}__${item.weightRange}`] = item;
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await shippingLinesService.getTransportRates();
      setItems(data);
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Eroare la încărcarea datelor'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await shippingLinesService.updateTransportRate(editingId, formData);
        setSuccess('Rată actualizată cu succes');
      } else {
        await shippingLinesService.createTransportRate(formData);
        setSuccess('Rată adăugată cu succes');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Eroare la salvare'));
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEdit = (item: TransportRate) => {
    setEditingId(item.id);
    setFormData({
      containerType: item.containerType,
      weightRange: item.weightRange,
      destination: item.destination,
      rate: item.rate,
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (item: TransportRate) => {
    if (!confirm(`Ștergeți rata ${item.containerType} / ${item.weightRange}?`)) return;
    try {
      await shippingLinesService.deleteTransportRate(item.id);
      setSuccess('Rată ștearsă');
      loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Eroare la ștergere'));
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      containerType: CONTAINER_TYPES[0],
      weightRange: DEFAULT_WEIGHT_RANGES[0],
      destination: filterDest || DESTINATIONS[0],
      rate: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    resetForm();
  };

  // Inline editing
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState<string>('');

  const startCellEdit = (key: string, currentValue: number) => {
    setEditingCell(key);
    setCellValue(currentValue.toString());
  };

  const saveCellEdit = async (containerType: string, weightRange: string) => {
    const key = `${containerType}__${weightRange}`;
    const rate = parseFloat(cellValue) || 0;
    const existing = rateMap[key];

    try {
      if (existing) {
        await shippingLinesService.updateTransportRate(existing.id, { rate });
      } else {
        await shippingLinesService.createTransportRate({
          containerType,
          weightRange,
          destination: filterDest || DESTINATIONS[0],
          rate,
        });
      }
      setEditingCell(null);
      loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
  };

  // Stats
  const totalRates = filteredItems.length;
  const activeRates = filteredItems.filter((i) => i.isActive).length;
  const avgRate =
    filteredItems.length > 0
      ? (filteredItems.reduce((sum, i) => sum + i.rate, 0) / filteredItems.length).toFixed(0)
      : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading flex items-center gap-3">
            <TruckIcon />
            Transport Terestru
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestionați ratele de transport terestru per tip container și interval de greutate
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm font-medium"
        >
          <PlusIcon />
          Adaugă Rată
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Rate Configurate
          </p>
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-400 mt-1">
            {totalRates}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Rate Active
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {activeRates}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Rată Medie
          </p>
          <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300 mt-1">
            ${avgRate}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-4">
            {editingId ? 'Editare Rată' : 'Adăugare Rată Nouă'}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tip Container
              </label>
              <select
                value={formData.containerType}
                onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                required
              >
                {CONTAINER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Interval Greutate
              </label>
              <select
                value={formData.weightRange}
                onChange={(e) => setFormData({ ...formData, weightRange: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                required
              >
                {DEFAULT_WEIGHT_RANGES.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Destinație
              </label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                required
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Rată Transport ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Stare
              </label>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Activ</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-5 flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm font-medium"
              >
                <SaveIcon />
                {editingId ? 'Salvează' : 'Adaugă'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-sm"
              >
                <XIcon />
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Destination Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Destinație:
        </label>
        <div className="flex gap-2">
          {DESTINATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDest(d)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterDest === d
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-750 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-base font-semibold text-primary-800 dark:text-white">
              Rate Transport → {filterDest}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Faceți clic pe o celulă pentru a edita rata. Valorile sunt în USD.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-5 py-3 text-left bg-neutral-50 dark:bg-neutral-750 sticky left-0">
                    Greutate \ Container
                  </th>
                  {(containerTypes.length > 0 ? containerTypes : CONTAINER_TYPES).map((ct) => (
                    <th key={ct} className="px-5 py-3 text-center min-w-[120px]">
                      {ct}
                    </th>
                  ))}
                  {/* Show any missing types */}
                  {CONTAINER_TYPES.filter((ct) => !containerTypes.includes(ct)).map((ct) => (
                    <th key={ct} className="px-5 py-3 text-center min-w-[120px] text-neutral-400">
                      {ct}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(weightRanges.length > 0 ? weightRanges : DEFAULT_WEIGHT_RANGES).map((wr) => (
                  <tr key={wr} className="border-b border-neutral-100 dark:border-neutral-700/50">
                    <td className="px-5 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-750 sticky left-0">
                      {wr}
                    </td>
                    {Array.from(new Set([...containerTypes, ...CONTAINER_TYPES]))
                      .sort()
                      .map((ct) => {
                        const key = `${ct}__${wr}`;
                        const rate = rateMap[key];
                        const isEditing = editingCell === key;

                        return (
                          <td key={ct} className="px-3 py-2 text-center">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveCellEdit(ct, wr);
                                    if (e.key === 'Escape') cancelCellEdit();
                                  }}
                                  className="w-20 px-2 py-1 text-sm text-center bg-white dark:bg-neutral-700 border border-primary-400 rounded focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveCellEdit(ct, wr)}
                                  className="p-0.5 text-green-600 hover:text-green-700"
                                  title="Salvează"
                                >
                                  <SaveIcon />
                                </button>
                                <button
                                  onClick={cancelCellEdit}
                                  className="p-0.5 text-neutral-400 hover:text-neutral-600"
                                  title="Anulează"
                                >
                                  <XIcon />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startCellEdit(key, rate?.rate || 0)}
                                className={`w-full px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                  rate
                                    ? rate.isActive
                                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold hover:bg-green-100 dark:hover:bg-green-900/30'
                                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 line-through hover:bg-neutral-200'
                                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                                title={
                                  rate
                                    ? `Clic pentru editare (${rate.isActive ? 'activ' : 'inactiv'})`
                                    : 'Clic pentru a adăuga rată'
                                }
                              >
                                {rate ? `$${rate.rate.toFixed(0)}` : '—'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List view for detailed management */}
      {filteredItems.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-750 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-base font-semibold text-primary-800 dark:text-white">
              Toate Ratele
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-5 py-2.5 text-left">Container</th>
                  <th className="px-5 py-2.5 text-left">Greutate</th>
                  <th className="px-5 py-2.5 text-left">Destinație</th>
                  <th className="px-5 py-2.5 text-right">Rată ($)</th>
                  <th className="px-5 py-2.5 text-center">Stare</th>
                  <th className="px-5 py-2.5 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems
                  .sort(
                    (a, b) =>
                      a.containerType.localeCompare(b.containerType) ||
                      a.weightRange.localeCompare(b.weightRange)
                  )
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
                    >
                      <td className="px-5 py-2.5">
                        <span className="inline-flex px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-sm font-medium">
                          {item.containerType}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                        {item.weightRange}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                        {item.destination}
                      </td>
                      <td className="px-5 py-2.5 text-right text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        ${item.rate.toFixed(2)}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {item.isActive ? 'Activ' : 'Inactiv'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Editează"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Șterge"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
          Cum funcționează?
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          Ratele de transport terestru sunt utilizate de calculator la calcularea costului total.
          Pentru fiecare combinație de tip container, interval de greutate și destinație,
          specificați rata de transport. Dacă nu există o rată specifică, calculatorul va folosi
          valoarea implicită din setările globale.
        </p>
      </div>
    </div>
  );
}
