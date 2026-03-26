/**
 * Shipping Lines Page (Linii Maritime)
 * Admin page to manage shipping lines, their container types, and local port taxes.
 * The calculator uses these rates when computing total cost.
 */

import React, { useState, useEffect } from 'react';
import shippingLinesService, {
  ShippingLineContainer,
  ShippingLineContainerInput,
} from '../services/shippingLines';
import { getErrorMessage } from '../utils/formatters';

const SHIPPING_LINES = [
  'MSC',
  'COSCO',
  'Maersk',
  'CMA CGM',
  'Hapag-Lloyd',
  'ONE',
  'Evergreen',
  'Yang Ming',
  'HMM',
  'Zim',
];
const CONTAINER_TYPES = ['20DC', '40DC', '40HC', '20RF', '40RF'];

// Icons
const ShipIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 17h18M3 17l2-9h14l2 9M8 8V5a1 1 0 011-1h6a1 1 0 011 1v3"
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

export default function ShippingLinesPage() {
  const [items, setItems] = useState<ShippingLineContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShippingLineContainerInput>({
    shippingLine: SHIPPING_LINES[0],
    containerType: CONTAINER_TYPES[0],
    portTaxes: 0,
    isActive: true,
  });

  // Filter
  const [filterLine, setFilterLine] = useState<string>('');

  // Grouped view: { shippingLine: ShippingLineContainer[] }
  const grouped = items.reduce(
    (acc, item) => {
      if (filterLine && item.shippingLine !== filterLine) return acc;
      if (!acc[item.shippingLine]) acc[item.shippingLine] = [];
      acc[item.shippingLine].push(item);
      return acc;
    },
    {} as Record<string, ShippingLineContainer[]>
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await shippingLinesService.getShippingLineContainers();
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
        await shippingLinesService.updateShippingLineContainer(editingId, formData);
        setSuccess('Configurație actualizată cu succes');
      } else {
        await shippingLinesService.createShippingLineContainer(formData);
        setSuccess('Configurație adăugată cu succes');
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

  const handleEdit = (item: ShippingLineContainer) => {
    setEditingId(item.id);
    setFormData({
      shippingLine: item.shippingLine,
      containerType: item.containerType,
      portTaxes: item.portTaxes,
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (item: ShippingLineContainer) => {
    if (!confirm(`Ștergeți configurația ${item.shippingLine} - ${item.containerType}?`)) return;
    try {
      await shippingLinesService.deleteShippingLineContainer(item.id);
      setSuccess('Configurație ștearsă');
      loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Eroare la ștergere'));
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      shippingLine: SHIPPING_LINES[0],
      containerType: CONTAINER_TYPES[0],
      portTaxes: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    resetForm();
  };

  // Stats
  const totalConfigs = items.length;
  const activeConfigs = items.filter((i) => i.isActive).length;
  const uniqueLines = new Set(items.map((i) => i.shippingLine)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading flex items-center gap-3">
            <ShipIcon />
            Linii Maritime
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestionați liniile maritime, tipurile de containere și taxele locale portuare
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
          Adaugă Configurație
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Linii Maritime
          </p>
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-400 mt-1">
            {uniqueLines}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Configurații Active
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {activeConfigs}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Total Configurații
          </p>
          <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300 mt-1">
            {totalConfigs}
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
            {editingId ? 'Editare Configurație' : 'Adăugare Configurație Nouă'}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Linie Maritimă
              </label>
              <select
                value={formData.shippingLine}
                onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                required
              >
                {SHIPPING_LINES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

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
                Taxe Locale Constanța ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.portTaxes}
                onChange={(e) =>
                  setFormData({ ...formData, portTaxes: parseFloat(e.target.value) || 0 })
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

            <div className="md:col-span-2 lg:col-span-4 flex items-center gap-3 pt-2">
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

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Filtrare după linie:
        </label>
        <select
          value={filterLine}
          onChange={(e) => setFilterLine(e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm"
        >
          <option value="">Toate liniile</option>
          {SHIPPING_LINES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Data Table - Grouped by Shipping Line */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <ShipIcon />
          <p className="mt-2 text-lg font-medium">Nu există configurații</p>
          <p className="text-sm">
            Adăugați o linie maritimă cu tipuri de containere și taxe locale
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(grouped) as [string, ShippingLineContainer[]][])
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([line, lineItems]) => (
              <div
                key={line}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
              >
                {/* Line header */}
                <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-750 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <ShipIcon />
                    </div>
                    <h3 className="text-base font-semibold text-primary-800 dark:text-white">
                      {line}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-full">
                      {lineItems.length} {lineItems.length === 1 ? 'container' : 'containere'}
                    </span>
                  </div>
                </div>

                {/* Containers table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-100 dark:border-neutral-700">
                        <th className="px-5 py-2.5 text-left">Tip Container</th>
                        <th className="px-5 py-2.5 text-right">Taxe Locale ($)</th>
                        <th className="px-5 py-2.5 text-center">Stare</th>
                        <th className="px-5 py-2.5 text-right">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems
                        .sort((a, b) => a.containerType.localeCompare(b.containerType))
                        .map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
                          >
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md text-sm font-medium">
                                {item.containerType}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                ${item.portTaxes.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
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
                            <td className="px-5 py-3 text-right">
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
            ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
          Cum funcționează?
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          Taxele locale configurate aici sunt utilizate de calculator la calcularea costului total.
          Pentru fiecare linie maritimă și tip de container, specificați taxele portuare locale din
          Constanța. Dacă nu există o configurație specifică, calculatorul va folosi valoarea
          implicită din setările globale.
        </p>
      </div>
    </div>
  );
}
