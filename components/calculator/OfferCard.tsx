import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { ClockIcon, CheckCircleIcon } from './Icons';
import { RouteDisplay } from './RouteDisplay';
import {
  PriceOffer,
  Incoterm,
  FinalDestination,
  LAND_TRANSPORT_CHISINAU,
  CHINA_INLAND_EXW,
} from './types';

interface OfferCardProps {
  offer: PriceOffer;
  index: number;
  isSelected: boolean;
  isAdmin: boolean;
  incoterm: Incoterm;
  finalDestination: FinalDestination;
  onToggle: (index: number) => void;
  onSelectOffer: (offer: PriceOffer, index: number) => void;
}

const getEXWTotal = () =>
  CHINA_INLAND_EXW.transport + CHINA_INLAND_EXW.customs + CHINA_INLAND_EXW.warehousing;

// Rata 3 (Constanța→Chișinău): transport + customs + commission only
// portTaxes are shown here as "Cheltuieli Locale"
const getLandTransportTotal = (commissionOverride?: number) => {
  const commission =
    commissionOverride !== undefined ? commissionOverride : LAND_TRANSPORT_CHISINAU.commission;
  return LAND_TRANSPORT_CHISINAU.transport + LAND_TRANSPORT_CHISINAU.customs + commission;
};

// Rata 1 maritime: freight + portAdjustment only (portTaxes moved to Rata 3)
const getMaritimeTotal = (offer: PriceOffer) => offer.freightPrice + offer.portAdjustment;

// Rata 2 land leg (portIntermediate→portFinal): terrestrial + customs + insurance only (no commission)
const getLandLegSubtotal = (offer: PriceOffer) =>
  offer.terrestrialTransport + offer.customsTaxes + (offer.insurance || 0);

const computeTotalPrice = (
  offer: PriceOffer,
  incoterm: Incoterm,
  finalDestination: FinalDestination,
  commissionOverride?: number
) => {
  let total = 0;

  // Rata 0: EXW costs
  if (incoterm === 'EXW') {
    total += getEXWTotal();
  }

  // Rata 1: Maritime without portTaxes (portTaxes moved to Rata 3)
  if (incoterm !== 'CFR') {
    total += getMaritimeTotal(offer);
  }

  // Rata 2: Land leg (portIntermediate→portFinal) — portTaxes included here in total but shown in Rata 3
  // terrestrialTransport + customsTaxes + portTaxes + insurance (no commission — moved to Rata 3)
  if (incoterm !== 'CFR') {
    total +=
      offer.terrestrialTransport + offer.customsTaxes + offer.portTaxes + (offer.insurance || 0);
  }
  if (incoterm === 'CFR') {
    total +=
      offer.terrestrialTransport + offer.customsTaxes + offer.portTaxes + (offer.insurance || 0);
  }

  // Rata 3: Land transport Constanta -> Chisinau (includes commission + portTaxes as cheltuieliLocale)
  if (finalDestination === 'chisinau') {
    const commission =
      commissionOverride !== undefined ? commissionOverride : LAND_TRANSPORT_CHISINAU.commission;
    total += LAND_TRANSPORT_CHISINAU.transport + LAND_TRANSPORT_CHISINAU.customs + commission;
  } else {
    // When no Rata 3: add commission to total from Rata 2 leg
    const commission = commissionOverride !== undefined ? commissionOverride : offer.commission;
    total += commission;
  }

  return total;
};

export const OfferCard = ({
  offer,
  index,
  isSelected,
  isAdmin,
  incoterm,
  finalDestination,
  onToggle,
  onSelectOffer,
}: OfferCardProps) => {
  const defaultCommission =
    finalDestination === 'chisinau' ? LAND_TRANSPORT_CHISINAU.commission : offer.commission;
  const [commissionValue, setCommissionValue] = useState<string>(String(defaultCommission));
  const commissionOverride = parseFloat(commissionValue) || 0;

  const adjustedTotal = computeTotalPrice(offer, incoterm, finalDestination, commissionOverride);
  // Approximate MDL using ratio from original offer
  const mdlRate = offer.totalPriceMDL / offer.totalPriceUSD;
  const adjustedTotalMDL = adjustedTotal * mdlRate;

  // cheltuieliLocale = portTaxes (moved from Rata 1)
  const cheltuieliLocale = offer.portTaxes;

  return (
    <button
      type="button"
      onClick={() => onToggle(index)}
      aria-pressed={isSelected}
      className={cn(
        'w-full text-left bg-white dark:bg-neutral-800 rounded-xl border-2 p-5 cursor-pointer transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
        isSelected
          ? 'border-accent-500 shadow-lg shadow-accent-500/10'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Rank & Shipping Line */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
              offer.rank === 1
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                : offer.rank === 2
                  ? 'bg-gradient-to-br from-neutral-300 to-neutral-400 text-white'
                  : offer.rank === 3
                    ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
            )}
          >
            #{offer.rank}
          </div>
          <div>
            <h4 className="font-bold text-lg text-primary-800 dark:text-white">
              {offer.shippingLine}
            </h4>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-400">
                <ClockIcon />
                {offer.estimatedTransitDays} zile
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                  offer.availability === 'AVAILABLE'
                    ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500'
                    : offer.availability === 'LIMITED'
                      ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-500'
                      : 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-500'
                )}
              >
                <CheckCircleIcon />
                {offer.availability === 'AVAILABLE'
                  ? 'Disponibil'
                  : offer.availability === 'LIMITED'
                    ? 'Limitat'
                    : 'Indisponibil'}
              </span>
            </div>
            <div className="mt-2">
              <RouteDisplay route={offer.route} />
            </div>
          </div>
        </div>

        {/* Right: Price */}
        <div className="text-right">
          <p className="text-2xl font-bold text-accent-500">${adjustedTotal.toFixed(0)}</p>
          <p className="text-sm text-neutral-400">{adjustedTotalMDL.toFixed(0)} MDL</p>
        </div>
      </div>

      {/* Expanded Details */}
      {isSelected && (
        <div className="mt-5 pt-5 border-t border-neutral-200 dark:border-neutral-700 animate-fade-in">
          {isAdmin ? (
            <>
              {/* Admin: Rata 0 - EXW China costs */}
              {incoterm === 'EXW' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-primary-800 dark:text-white">
                      Rata 0: Costuri China (EXW)
                    </h5>
                    <span className="text-sm font-bold text-accent-500">
                      ${getEXWTotal().toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Transport China</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${CHINA_INLAND_EXW.transport.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Vamă Export</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${CHINA_INLAND_EXW.customs.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Depozitare</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${CHINA_INLAND_EXW.warehousing.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin: Rata 1 - Maritime (hidden for CFR) — no portTaxes here */}
              {incoterm !== 'CFR' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-primary-800 dark:text-white">
                      Rata 1: {offer.portOrigin} → {offer.portIntermediate}
                    </h5>
                    <span className="text-sm font-bold text-accent-500">
                      ${getMaritimeTotal(offer).toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Tarif Maritim</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${offer.freightPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Ajustare Port</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${offer.portAdjustment.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin: CFR note */}
              {incoterm === 'CFR' && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    CFR: Transportul maritim este inclus în prețul furnizorului (
                    {offer.shippingLine})
                  </p>
                </div>
              )}

              {/* Admin: Rata 2 land leg (portIntermediate→portFinal) — no comision here */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-primary-800 dark:text-white">
                    {incoterm === 'CFR' ? 'Rata 1' : 'Rata 2'}: {offer.portIntermediate} →{' '}
                    {offer.portFinal}
                  </h5>
                  <span className="text-sm font-bold text-accent-500">
                    ${getLandLegSubtotal(offer).toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                    <p className="text-xs text-neutral-400 mb-1">Transport Terestru</p>
                    <p className="font-semibold text-primary-800 dark:text-white">
                      ${offer.terrestrialTransport.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                    <p className="text-xs text-neutral-400 mb-1">Taxe Vamale</p>
                    <p className="font-semibold text-primary-800 dark:text-white">
                      ${offer.customsTaxes.toFixed(2)}
                    </p>
                  </div>
                  {(offer.insurance || 0) > 0 && (
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Asigurare</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${offer.insurance.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin: Rata 3 — Constanța → Chișinău (with Cheltuieli Locale + editable Comision) */}
              {finalDestination === 'chisinau' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-primary-800 dark:text-white">
                      {incoterm === 'CFR' ? 'Rata 2' : 'Rata 3'}: Constanța → Chișinău
                    </h5>
                    <span className="text-sm font-bold text-accent-500">
                      ${getLandTransportTotal(commissionOverride).toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Transport Terestru</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${LAND_TRANSPORT_CHISINAU.transport.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Taxe Vamale</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${LAND_TRANSPORT_CHISINAU.customs.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Cheltuieli Locale</p>
                      <p className="font-semibold text-primary-800 dark:text-white">
                        ${cheltuieliLocale.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Comision</p>
                      {isAdmin ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full text-sm font-semibold text-primary-800 dark:text-white bg-transparent border-b border-accent-400 focus:outline-none focus:border-accent-600"
                          value={commissionValue}
                          onChange={(e) => setCommissionValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p className="font-semibold text-primary-800 dark:text-white">
                          ${commissionOverride.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Client: simplified blocks with subtotals */
            <div className="space-y-4 mb-4">
              {/* Client: Rata 0 - EXW */}
              {incoterm === 'EXW' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                      0
                    </div>
                    <h5 className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                      Costuri China (EXW)
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    ${getEXWTotal().toFixed(0)}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    Transport + vamă + depozitare China
                  </p>
                </div>
              )}

              {/* Client: Rata 1 - Maritime (no portTaxes) */}
              {incoterm !== 'CFR' ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      {offer.portOrigin} → {offer.portIntermediate}
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    ${getMaritimeTotal(offer).toFixed(0)}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">Tarif maritim + ajustare port</p>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      i
                    </div>
                    <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      CFR — Transport maritim inclus
                    </h5>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Transportul maritim este inclus în prețul furnizorului ({offer.shippingLine})
                  </p>
                </div>
              )}

              {/* Client: Rata 2 land leg (no comision) */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                    {incoterm === 'CFR' ? '1' : '2'}
                  </div>
                  <h5 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    {offer.portIntermediate} → {offer.portFinal}
                  </h5>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${getLandLegSubtotal(offer).toFixed(0)}
                </p>
                <p className="text-xs text-green-500 mt-1">Transport terestru + taxe vamale</p>
              </div>

              {/* Client: Rata 3 — Constanța → Chișinău (with cheltuieliLocale + comision) */}
              {finalDestination === 'chisinau' && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                      {incoterm === 'CFR' ? '2' : '3'}
                    </div>
                    <h5 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                      Constanța → Chișinău
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    ${getLandTransportTotal(commissionOverride).toFixed(0)}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">
                    Transport terestru + taxe vamale + cheltuieli locale + comision
                  </p>
                  {/* Editable commission for admin/non-client view */}
                  {isAdmin && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        Comision:
                      </span>
                      <span className="text-xs text-orange-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-20 text-sm font-semibold text-orange-700 dark:text-orange-300 bg-transparent border-b border-orange-400 focus:outline-none focus:border-orange-600"
                        value={commissionValue}
                        onChange={(e) => setCommissionValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <Button
            variant="accent"
            className="w-full mt-4"
            onClick={(e) => {
              e.stopPropagation();
              // Pass offer with overridden commission
              onSelectOffer({ ...offer, commission: commissionOverride }, index);
            }}
          >
            Selectează Această Ofertă
          </Button>
        </div>
      )}
    </button>
  );
};
