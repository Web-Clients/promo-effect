import React from 'react';
import { Button } from '../ui/Button';
import { HsCodeSelector } from '../ui/HsCodeSelector';
import { HsCode } from '../../services/hscodes';
import { FormField, CalcSelect, CalcInput } from './FormElements';
import { CalculatorIcon, PlusCircleIcon, TrashIcon } from './Icons';
import { UseCalculatorReturn } from './types';

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
  isLoading,
  error,
  showSupplierForm,
  handleCalculate,
}: Props) => (
  <div className="lg:col-span-4">
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-6 sticky top-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary-800 flex items-center justify-center text-white">
          <CalculatorIcon />
        </div>
        <div>
          <h3 className="font-semibold text-primary-800 dark:text-white">Detalii Transport</h3>
          <p className="text-xs text-neutral-400">Completați toate câmpurile</p>
        </div>
      </div>

      <form onSubmit={handleCalculate} className="space-y-5">
        <FormField label="Port Origine" required>
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

        <FormField label="Port Destinație" hint="Alegeți portul de tranzit">
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

        {/* Multiple Containers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200">
              Containere <span className="text-error-500 ml-1">*</span>
            </label>
            <span className="text-xs text-neutral-400">
              Total: {getTotalContainers()}{' '}
              {getTotalContainers() === 1 ? 'container' : 'containere'}
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
                    title="Șterge container"
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
              Adaugă alt tip de container
            </button>
          )}
        </div>

        <FormField label="Greutate Marfă" required>
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

        <FormField
          label="Categorie Marfă (Cod HS)"
          hint="Opțional - căutați după cod sau descriere"
        >
          <HsCodeSelector
            value={params.cargoCategory}
            onChange={(code: string, _hsCode: HsCode | null) => {
              setParams({ ...params, cargoCategory: code });
            }}
            placeholder="Ex: 9403.30 sau mobilier"
          />
        </FormField>

        <FormField label="Data Pregătire Marfă" required>
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
          {isLoading ? 'Se calculează...' : 'Calculează Prețuri'}
        </Button>
      </form>
    </div>
  </div>
);
