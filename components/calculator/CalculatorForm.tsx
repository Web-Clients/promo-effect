import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { HSCodeAutocomplete } from './HSCodeAutocomplete';
import { FormField, CalcSelect, CalcInput } from './FormElements';
import { CalculatorIcon, PlusCircleIcon, TrashIcon } from './Icons';
import { UseCalculatorReturn, Incoterm, FinalDestination } from './types';

// Incoterm tooltip descriptions
const INCOTERM_TOOLTIPS: Record<Incoterm, string> = {
  FOB: 'Free On Board — Vânzătorul livrează marfa la bordul vasului. Cumpărătorul suportă navlul și livrarea la destinație.',
  EXW: 'Ex Works — Vânzătorul pune marfa la dispoziție la fabrică. Cumpărătorul suportă toate costurile: transport China, vamă export, navlu, livrare.',
  CFR: 'Cost and Freight — Vânzătorul plătește navlul până la portul de destinație. Cumpărătorul selectează linia maritimă.',
  CIF: 'Cost, Insurance and Freight — Vânzătorul plătește navlul și asigurarea până la portul de destinație. Cumpărătorul selectează linia maritimă.',
};

// Final destination options beyond port
const FINAL_DESTINATIONS: { value: FinalDestination; label: string }[] = [
  { value: 'constanta', label: 'Constanța (port)' },
  { value: 'chisinau', label: 'Chișinău' },
  { value: 'balti', label: 'Bălți' },
  { value: 'orhei', label: 'Orhei' },
  { value: 'soroca', label: 'Soroca' },
  { value: 'cahul', label: 'Cahul' },
  { value: 'ungheni', label: 'Ungheni' },
  { value: 'comrat', label: 'Comrat' },
  { value: 'tiraspol', label: 'Tiraspol' },
];

type Props = Pick<
  UseCalculatorReturn,
  | 'params'
  | 'setParams'
  | 'containers'
  | 'addContainer'
  | 'removeContainer'
  | 'updateContainer'
  | 'getTotalContainers'
  | 'availablePorts'
  | 'availableDestinations'
  | 'availableContainerTypes'
  | 'availableWeightRanges'
  | 'availableShippingLines'
  | 'isLoading'
  | 'error'
  | 'showSupplierForm'
  | 'handleCalculate'
>;

export const CalculatorForm = ({
  params,
  setParams,
  containers,
  addContainer,
  removeContainer,
  updateContainer,
  getTotalContainers,
  availablePorts,
  availableDestinations,
  availableContainerTypes,
  availableWeightRanges,
  availableShippingLines,
  isLoading,
  error,
  showSupplierForm,
  handleCalculate,
}: Props) => {
  const { t } = useTranslation();
  const [incotermTooltipVisible, setIncotermTooltipVisible] = useState(false);

  // Persist last incoterm in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lastIncoterm') as Incoterm | null;
    if (saved && ['FOB', 'EXW', 'CFR', 'CIF'].includes(saved)) {
      setParams((prev) => ({ ...prev, incoterm: saved }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIncotermChange = (value: Incoterm) => {
    localStorage.setItem('lastIncoterm', value);
    setParams({ ...params, incoterm: value });
  };

  // Compute route display string
  const getRouteDisplay = () => {
    if (!params.portOrigin) return null;
    const portDest = params.portDestination || 'Constanța';
    const dest = FINAL_DESTINATIONS.find((d) => d.value === params.finalDestination);
    const finalLabel = dest?.label?.replace(' (port)', '') || portDest;
    const isPortOnly = params.finalDestination === 'constanta';
    if (isPortOnly) return `${params.portOrigin} → ${portDest}`;
    return `${params.portOrigin} → ${portDest} → ${finalLabel}`;
  };

  const routeDisplay = getRouteDisplay();

  return (
    <div className="lg:col-span-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-6 sticky top-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-800 flex items-center justify-center text-white">
            <CalculatorIcon />
          </div>
          <div>
            <h3 className="font-semibold text-primary-800 dark:text-white">
              {t('calculator.transportDetails')}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {t('calculator.fillAllFields')}
            </p>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="space-y-5">
          {/* Origin Port */}
          <FormField label={t('calculator.originPort')} required>
            <CalcSelect
              value={params.portOrigin}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setParams({ ...params, portOrigin: e.target.value })
              }
              required
            >
              {availablePorts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </CalcSelect>
          </FormField>

          {/* Destination Port */}
          <FormField
            label={t('calculator.destinationPort')}
            hint={t('calculator.destinationPortHint')}
          >
            <CalcSelect
              value={params.portDestination}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setParams({ ...params, portDestination: e.target.value })
              }
              required
            >
              {availableDestinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </CalcSelect>
          </FormField>

          {/* Final Destination */}
          <FormField
            label={t('calculator.finalDestination')}
            hint={t('calculator.finalDestinationHint')}
          >
            <CalcSelect
              value={params.finalDestination}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setParams({ ...params, finalDestination: e.target.value as FinalDestination })
              }
              required
            >
              {FINAL_DESTINATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </CalcSelect>
            {/* Route display when destination != port */}
            {routeDisplay && (
              <p className="mt-1.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                Rută: {routeDisplay}
              </p>
            )}
          </FormField>

          {/* Incoterm */}
          <FormField
            label={t('calculator.deliveryCondition')}
            hint={t('calculator.deliveryConditionHint')}
          >
            {/* Radio group */}
            <div className="flex gap-2">
              {(['FOB', 'EXW', 'CFR', 'CIF'] as Incoterm[]).map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleIncotermChange(inc)}
                  className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg border-2 transition-all ${
                    params.incoterm === inc
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400'
                      : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  {inc}
                </button>
              ))}
            </div>
            {/* Tooltip */}
            <div className="mt-1.5 relative">
              <button
                type="button"
                onMouseEnter={() => setIncotermTooltipVisible(true)}
                onMouseLeave={() => setIncotermTooltipVisible(false)}
                onClick={() => setIncotermTooltipVisible((v) => !v)}
                className="text-xs text-neutral-400 underline underline-offset-2 cursor-help"
              >
                Ce înseamnă {params.incoterm}?
              </button>
              {incotermTooltipVisible && (
                <div className="absolute z-20 left-0 top-5 w-64 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3 shadow-lg text-xs text-neutral-600 dark:text-neutral-300">
                  {INCOTERM_TOOLTIPS[params.incoterm]}
                </div>
              )}
            </div>
            {/* Incoterm-specific info */}
            {params.incoterm === 'EXW' && (
              <div className="mt-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30 rounded-lg">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  Taxe export China incluse automat: Transport $500 + Vamă $250 + Depozitare $350
                </p>
              </div>
            )}
            {params.incoterm === 'FOB' && (
              <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Navlu + livrare la destinație calculate automat
                </p>
              </div>
            )}
            {params.incoterm === 'CFR' && (
              <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  CFR: Selectați linia maritimă (obligatoriu)
                </p>
              </div>
            )}
            {params.incoterm === 'CIF' && (
              <div className="mt-2 p-2.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/30 rounded-lg">
                <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
                  CIF: Maritim + asigurare incluse de furnizor. Selectați linia maritimă.
                </p>
              </div>
            )}
          </FormField>

          {/* CFR / CIF: Shipping Line selector (required) */}
          {(params.incoterm === 'CFR' || params.incoterm === 'CIF') && (
            <FormField label="Linie Maritimă" required>
              <CalcSelect
                value={params.shippingLine || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setParams({ ...params, shippingLine: e.target.value })
                }
                required
              >
                <option value="">— Selectați linia maritimă —</option>
                {(availableShippingLines || []).map((sl) => (
                  <option key={sl} value={sl}>
                    {sl}
                  </option>
                ))}
              </CalcSelect>
            </FormField>
          )}

          {/* Multiple Containers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200">
                {t('calculator.containers')} <span className="text-error-500 ml-1">*</span>
              </label>
              <span className="text-xs text-neutral-400">
                {t('common.total')}: {getTotalContainers()}{' '}
                {getTotalContainers() === 1
                  ? t('calculator.totalContainers_one')
                  : t('calculator.totalContainers_other')}
              </span>
            </div>

            <div className="space-y-2">
              {containers.map((container, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <CalcSelect
                      value={container.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        updateContainer(index, 'type', e.target.value)
                      }
                      required
                    >
                      {availableContainerTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </CalcSelect>
                  </div>
                  <div className="w-20">
                    <CalcInput
                      type="number"
                      min="1"
                      max="50"
                      value={container.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateContainer(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      className="text-center"
                      title="Cantitate"
                    />
                  </div>
                  {containers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContainer(index)}
                      className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors"
                      title={t('calculator.removeContainer')}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {containers.length < 5 && (
              <button
                type="button"
                onClick={addContainer}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 hover:bg-accent-100 dark:hover:bg-accent-500/20 rounded-lg transition-colors"
              >
                <PlusCircleIcon />
                {t('calculator.addContainerType')}
              </button>
            )}
          </div>

          <FormField label={t('calculator.cargoWeight')} required>
            <CalcSelect
              value={params.cargoWeight}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setParams({ ...params, cargoWeight: e.target.value })
              }
              required
            >
              {availableWeightRanges.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </CalcSelect>
          </FormField>

          <FormField label={t('calculator.hsCategory')} hint={t('calculator.hsCategoryHint')}>
            <HSCodeAutocomplete
              value={params.cargoCategory}
              onChange={(code: string) => {
                setParams({ ...params, cargoCategory: code });
              }}
              placeholder="Ex: 9403.30 sau mobilier"
            />
          </FormField>

          <FormField label={t('calculator.cargoReadyDate')} required>
            <CalcInput
              type="date"
              value={params.cargoReadyDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setParams({ ...params, cargoReadyDate: e.target.value })
              }
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </FormField>

          {error && !showSupplierForm && (
            <div className="p-3 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-lg">
              <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="accent"
            disabled={isLoading}
            loading={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? t('calculator.calculating') : t('calculator.calculatePrices')}
          </Button>
        </form>
      </div>
    </div>
  );
};
