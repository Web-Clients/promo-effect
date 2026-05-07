/**
 * AdminPricingLandPanel
 * Page for managing terrestrial / land transport pricing:
 *   - Transport rates (Constanța→Chișinău) per container type × weight range
 *   - Customs taxes
 *   - Expedite / handling fees
 *   - Local taxes (port charges, storage)
 *   - Agent commission on land leg
 *
 * Uses the existing TransportRate table via the shipping-lines service.
 * General land settings are stored in AdminSettings.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredUser } from '../../../services/auth';
import { getErrorMessage } from '../../../utils/formatters';
import {
  getAdminSettings,
  updateAdminSettings,
  AdminSettings,
} from '../../../services/adminPricing';
import shippingLinesService, { TransportRate } from '../../../services/shippingLines';

const CONTAINER_TYPES = ['20DC', '40DC', '40HC', '20RF', '40RF', '20OT', '40OT'];
const DESTINATIONS = ['Constanța', 'Odessa'];

export function AdminPricingLandPanel() {
  const { t } = useTranslation();
  const currentUser = getStoredUser();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role ?? '');

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [transportRates, setTransportRates] = useState<TransportRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local editable settings
  const [customsTaxes, setCustomsTaxes] = useState<number>(150);
  const [commission, setCommission] = useState<number>(200);
  const [portTaxesConstanta, setPortTaxesConstanta] = useState<number>(221.67);
  const [terrestrialTransportConstanta, setTerrestrialTransportConstanta] = useState<number>(600);
  const [portTaxesOdessa, setPortTaxesOdessa] = useState<number>(200);
  const [terrestrialTransportOdessa, setTerrestrialTransportOdessa] = useState<number>(550);

  // Active destination tab
  const [destTab, setDestTab] = useState<string>('Constanța');

  const showMsg = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, rates] = await Promise.all([
        getAdminSettings(),
        shippingLinesService.getTransportRates(),
      ]);
      setSettings(s);
      setCustomsTaxes(s.customsTaxes);
      setCommission(s.commission);
      setPortTaxesConstanta(s.portTaxesConstanta);
      setTerrestrialTransportConstanta(s.terrestrialTransportConstanta);
      setPortTaxesOdessa(s.portTaxesOdessa);
      setTerrestrialTransportOdessa(s.terrestrialTransportOdessa);
      setTransportRates(rates);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await updateAdminSettings({
        customsTaxes,
        commission,
        portTaxesConstanta,
        terrestrialTransportConstanta,
        portTaxesOdessa,
        terrestrialTransportOdessa,
      });
      showMsg('Setările au fost salvate cu succes');
    } catch (err: unknown) {
      showMsg(getErrorMessage(err), true);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = async (rate: TransportRate, newValue: number) => {
    try {
      await shippingLinesService.updateTransportRate(rate.id, { rate: newValue });
      setTransportRates((prev) =>
        prev.map((r) => (r.id === rate.id ? { ...r, rate: newValue } : r))
      );
    } catch (err: unknown) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const ratesForDest = transportRates.filter((r) => r.destination === destTab);

  // Build a weight range × container type matrix for display
  const weightRanges = [...new Set(ratesForDest.map((r) => r.weightRange))].sort();
  const containers = [...new Set(ratesForDest.map((r) => r.containerType))].sort();

  const getRate = (wt: string, ct: string) =>
    ratesForDest.find((r) => r.weightRange === wt && r.containerType === ct);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Acces interzis. Necesită rol ADMIN sau SUPER_ADMIN.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('pricing.landTitle', 'Administrare Prețuri Transport Terestru')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t(
            'pricing.landSubtitle',
            'Gestionați tarifele terestre, taxele vamale, taxele locale și comisionul pentru ruta Constanța→Chișinău'
          )}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Section 1 — General Land Costs */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Costuri Generale Transport Terestru &amp; Vămuire
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Constanța */}
          <div>
            <h3 className="text-sm font-medium text-blue-700 mb-3 uppercase tracking-wide">
              Constanța (România)
            </h3>
            <label className="block text-sm text-gray-700 mb-1">Taxe Portuare (USD)</label>
            <input
              type="number"
              value={portTaxesConstanta}
              onChange={(e) => setPortTaxesConstanta(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <label className="block text-sm text-gray-700 mt-3 mb-1">
              Transport Terestru Bază (USD)
            </label>
            <input
              type="number"
              value={terrestrialTransportConstanta}
              onChange={(e) => setTerrestrialTransportConstanta(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Odessa */}
          <div>
            <h3 className="text-sm font-medium text-purple-700 mb-3 uppercase tracking-wide">
              Odessa (Ucraina)
            </h3>
            <label className="block text-sm text-gray-700 mb-1">Taxe Portuare (USD)</label>
            <input
              type="number"
              value={portTaxesOdessa}
              onChange={(e) => setPortTaxesOdessa(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <label className="block text-sm text-gray-700 mt-3 mb-1">
              Transport Terestru Bază (USD)
            </label>
            <input
              type="number"
              value={terrestrialTransportOdessa}
              onChange={(e) => setTerrestrialTransportOdessa(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Common */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">
              Comune (Ambele Porturi)
            </h3>
            <label className="block text-sm text-gray-700 mb-1">Taxe Vamale (USD)</label>
            <input
              type="number"
              value={customsTaxes}
              onChange={(e) => setCustomsTaxes(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <label className="block text-sm text-gray-700 mt-3 mb-1">Comision (USD)</label>
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Se salvează...' : 'Salvează Setările'}
          </button>
        </div>
      </div>

      {/* Section 2 — Transport Rates Matrix */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Tarife Transport Terestru (per Container × Greutate)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Editează direct în tabelă — salvare automată la fiecare modificare.
        </p>

        {/* Destination tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest}
              onClick={() => setDestTab(dest)}
              className={`py-2 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                destTab === dest
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {dest}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : weightRanges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nu există tarife pentru {destTab}. Adaugă tarife din pagina{' '}
            <span className="font-medium">Transport Terestru</span>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200">
                    Interval Greutate
                  </th>
                  {containers.map((ct) => (
                    <th
                      key={ct}
                      className="px-3 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[100px]"
                    >
                      {ct}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weightRanges.map((wt, i) => (
                  <tr key={wt} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2 font-medium text-gray-800 border-r border-gray-200">
                      {wt}
                    </td>
                    {containers.map((ct) => {
                      const rate = getRate(wt, ct);
                      return (
                        <td key={ct} className="px-2 py-1 border-r border-gray-100">
                          <input
                            type="number"
                            defaultValue={rate?.rate ?? 0}
                            step="1"
                            onBlur={(e) => {
                              if (rate) {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v !== rate.rate) {
                                  handleRateChange(rate, v);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            className="w-full text-center text-sm border border-transparent rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-transparent hover:bg-white"
                            disabled={!rate}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPricingLandPanel;
