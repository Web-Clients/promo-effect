import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useToast } from '../../ui/Toast';
import { api } from '../../../services/api';
import { getErrorMessage } from '../../../utils/formatters';

export interface PricingData {
  tarifMaritim: number;
  cheltuieliAditionale: number;
  taxePortuare: number;
  transportTerestru: number;
  taxeVamale: number;
  comision: number;
}

interface BookingPricingPanelProps {
  bookingId: string;
  isAdmin: boolean;
  initialPricingData?: PricingData | null;
  mdlRate?: number; // USD → MDL exchange rate (default 18)
  onSaved?: (pricing: PricingData) => void;
}

const EMPTY_PRICING: PricingData = {
  tarifMaritim: 0,
  cheltuieliAditionale: 0,
  taxePortuare: 0,
  transportTerestru: 0,
  taxeVamale: 0,
  comision: 0,
};

function computeTotal(p: PricingData): number {
  return (
    Number(p.tarifMaritim) +
    Number(p.cheltuieliAditionale) +
    Number(p.taxePortuare) +
    Number(p.transportTerestru) +
    Number(p.taxeVamale) +
    Number(p.comision)
  );
}

const BookingPricingPanel: React.FC<BookingPricingPanelProps> = ({
  bookingId,
  isAdmin,
  initialPricingData,
  mdlRate = 18,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [pricing, setPricing] = useState<PricingData>(initialPricingData ?? EMPTY_PRICING);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialPricingData) {
      setPricing(initialPricingData);
    }
  }, [initialPricingData]);

  const totalUSD = computeTotal(pricing);
  const totalMDL = totalUSD * mdlRate;

  const handleChange = (field: keyof PricingData, value: string) => {
    setPricing((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.patch(`/bookings/${bookingId}/pricing`, { pricingData: pricing });
      addToast(t('bookings.pricing.saveSuccess'), 'success');
      onSaved?.(pricing);
    } catch (err) {
      addToast(getErrorMessage(err, t('bookings.pricing.saveError')), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const fields: { key: keyof PricingData; label: string }[] = [
    { key: 'tarifMaritim', label: 'Tarif Maritim' },
    { key: 'cheltuieliAditionale', label: 'Cheltuieli Adiționale' },
    { key: 'taxePortuare', label: 'Taxe Portuare' },
    { key: 'transportTerestru', label: 'Transport Terestru' },
    { key: 'taxeVamale', label: 'Taxe Vamale' },
    { key: 'comision', label: 'Comision' },
  ];

  // Client view: only total
  if (!isAdmin) {
    return (
      <Card>
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
          Total de Plată
        </h4>
        {totalUSD > 0 ? (
          <div className="space-y-1">
            <p className="text-3xl font-bold text-primary-700 dark:text-primary-400">
              $
              {totalUSD.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USD
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              ≈{' '}
              {totalMDL.toLocaleString('ro-MD', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}{' '}
              MDL
              <span className="ml-1 text-xs text-neutral-400">(curs {mdlRate} MDL/USD)</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Prețul va fi stabilit de operator
          </p>
        )}
      </Card>
    );
  }

  // Admin view: full editable breakdown
  return (
    <Card>
      <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-4">
        Stabilire Preț (Admin)
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {label} <span className="text-neutral-400 font-normal">(USD)</span>
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={pricing[key] === 0 ? '' : String(pricing[key])}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="0.00"
            />
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Total USD</span>
          <span className="text-xl font-bold text-primary-700 dark:text-primary-400">
            $
            {totalUSD.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm text-neutral-500 dark:text-neutral-400">
          <span>
            Total MDL <span className="text-xs">(curs {mdlRate})</span>
          </span>
          <span>
            {totalMDL.toLocaleString('ro-MD', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}{' '}
            MDL
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} loading={isSaving}>
          {isSaving ? t('actions.saving') : t('bookings.pricing.savePrice')}
        </Button>
      </div>
    </Card>
  );
};

export default BookingPricingPanel;
