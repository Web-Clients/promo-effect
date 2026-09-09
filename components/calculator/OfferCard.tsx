import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { ClockIcon, CheckCircleIcon } from './Icons';
import { RouteDisplay } from './RouteDisplay';
import { PriceOffer, Incoterm, FinalDestination } from './types';
import { useTranslation } from 'react-i18next';
import { InfoTip } from '../ui/InfoTip';

interface OfferCardProps {
  offer: PriceOffer;
  index: number;
  isSelected: boolean;
  isAdmin: boolean;
  incoterm: Incoterm;
  finalDestination: FinalDestination;
  onToggle: (index: number) => void;
  /** commissionPercent is the admin's effective percentage for this quote. */
  onSelectOffer: (offer: PriceOffer, index: number, commissionPercent: number) => void;
}

// China inland (EXW) costs are NOT known to the backend and must be configured
// separately. Returning 0 avoids silently inflating the quote with fabricated
// constants (previously a fixed $1100 was added).
const getEXWTotal = () => 0;

// Rata 1 maritime: freight + portAdjustment folded into a single "Tarif Maritim" cell
// (the separate "Ajustare Port" cell was removed per client request).
const getMaritimeTotal = (offer: PriceOffer) => offer.freightPrice + offer.portAdjustment;

// The three cells below now prefer what the backend computed. They keep a local
// fallback only so an offer served by an older backend still renders.
const getTaxeLocaleTotal = (offer: PriceOffer) =>
  offer.localTaxesTotal ?? offer.portTaxes + offer.customsTaxes;

const getTransportTerestruTotal = (offer: PriceOffer) =>
  offer.landTransportTotal ?? offer.terrestrialTransport + (offer.insurance || 0);

/**
 * How much life is left in a quote.
 *
 * Amber inside a week, red on the last day: an offer that expires tomorrow and
 * one that runs for another month should not look the same, because the person
 * reading it is deciding whether to act now.
 */
function ValidityBadge({ validUntil }: { validUntil: string }) {
  const { t, i18n } = useTranslation();
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return null;

  const DAY = 24 * 60 * 60 * 1000;
  const days = Math.round(
    (Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
      Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) /
      DAY
  );

  const locale =
    ({ ro: 'ro-RO', ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN' } as Record<string, string>)[
      (i18n.language || 'ro').split('-')[0]
    ] || 'en-GB';

  const label =
    days <= 0
      ? t('calculator.offer.expiresToday')
      : days <= 7
        ? t('calculator.offer.expiresInDays', { count: days })
        : t('calculator.offer.validUntil', {
            date: end.toLocaleDateString(locale, {
              day: '2-digit',
              month: 'short',
              // A bare "15 iul." on a September quote reads as the past. Show
              // the year whenever it is not the current one.
              ...(end.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
            }),
          });

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        days <= 0
          ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
          : days <= 7
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
      )}
    >
      {label}
    </span>
  );
}

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
  const { t, i18n } = useTranslation();
  // The total comes from the backend (calculator-incoterms.priceOffer) and is
  // rendered as-is. This component used to recompute it — dropping the maritime
  // leg for CFR/CIF and applying its own commission — while the order form and
  // the booking kept the untouched backend sum, so the price changed the moment
  // the client pressed "Selectează Această Ofertă".
  //
  // An admin may still override the commission percentage for one quote. That is
  // expressed as a delta on the backend total, and the percentage travels with
  // the order so the server re-derives the same number rather than trusting this.
  const supplierCoversMaritime = incoterm === 'CFR' || incoterm === 'CIF';

  const backendPercent = offer.commissionPercent ?? 10;
  const backendCommission = offer.commissionAmount ?? offer.commission ?? 0;

  const maritimeTotal = getMaritimeTotal(offer);
  const taxeLocaleTotal = getTaxeLocaleTotal(offer);
  const transportTerestruTotal = getTransportTerestruTotal(offer);

  const [commissionPercent, setCommissionPercent] = useState<string>(String(backendPercent));
  const pct = parseFloat(commissionPercent);
  const effectivePercent = Number.isFinite(pct) ? pct : backendPercent;

  // Commission is charged on local handling + the land leg, never on the ocean
  // freight — the same base the backend uses, whatever the incoterm.
  const commissionBase = offer.commissionBase ?? taxeLocaleTotal + transportTerestruTotal;
  const commissionAmount =
    effectivePercent === backendPercent
      ? backendCommission
      : Math.round(((commissionBase * effectivePercent) / 100) * 100) / 100;

  const adjustedTotal = offer.totalPriceUSD + (commissionAmount - backendCommission);
  const mdlRate = offer.totalPriceUSD > 0 ? offer.totalPriceMDL / offer.totalPriceUSD : 0;
  const adjustedTotalMDL = adjustedTotal * mdlRate;

  return (
    /*
      A section, not a <button>.
      
      The card carries interactive children — the admin's commission input, and
      now the "i" that explains what the commission is charged on — and neither
      is legal inside a button. The parser closes the outer button when it meets
      a nested one, which tears the card apart; and clicking the input toggled
      the card open and shut, which is why editing the percentage was awkward.
      
      The header keeps the click-to-expand behaviour and the keyboard semantics.
    */
    <section
      className={cn(
        'w-full text-left bg-white dark:bg-neutral-800 rounded-xl border-2 p-5 transition-all duration-300',
        // The open card takes the whole row; a cell tall enough for the full
        // breakdown would leave the cards beside it standing in empty space.
        isSelected && 'col-span-full',
        isSelected
          ? 'border-accent-500 shadow-lg shadow-accent-500/10'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(index)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(index);
          }
        }}
        aria-pressed={isSelected}
        aria-expanded={isSelected}
        className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        {/* Wraps in a narrow grid cell instead of pushing the price out of the
          card; side by side again as soon as there is room. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          {/* Left: Rank & Shipping Line */}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className={cn(
                'w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg',
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
            {/* No min-w-0 here: with it this block shrinks to zero inside the
                flex row and its contents disappear entirely rather than wrap. */}
            <div className="flex-1">
              <h4 className="font-bold text-lg text-primary-800 dark:text-white">
                {offer.shippingLine}
              </h4>
              {/* Whose rate this is. Office only: an agent must never learn what
                  a competitor quoted, which is the reason the portal keeps them
                  apart in the first place. */}
              {/* Not truncated: inside a flex cell with min-w-0 a nowrap line
                  collapses to zero width and disappears entirely. Wrapping
                  costs a line and keeps the agent's name readable. */}
              {isAdmin && offer.agentCompany && (
                <p className="text-xs leading-snug text-neutral-400">
                  {t('calculator.offer.viaAgent', { agent: offer.agentCompany })}
                </p>
              )}
              {/* Wraps: in a narrow grid cell the transit time, the validity and
                  the availability badge do not fit on one line, and pushing them
                  past the card edge is worse than a second line. */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-400">
                  <ClockIcon />
                  {t('calculator.offer.transitDays', { count: offer.estimatedTransitDays })}
                </span>
                {/* How long the quote is good for. Ion asked for this on 8 Sep:
                  rates arrive fortnightly, and he kept having to ask whether
                  what he was looking at was still live. */}
                {offer.validUntil && <ValidityBadge validUntil={offer.validUntil} />}
                {/* The sailing this rate is for. Ion asked for different dates to
                    be distinguishable — "zile diferite" — and without it two
                    offers from the same carrier read as a duplicate. */}
                {offer.departureDate && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                    {t('calculator.offer.departs', {
                      date: new Date(offer.departureDate).toLocaleDateString(
                        (
                          { ro: 'ro-RO', ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN' } as Record<
                            string,
                            string
                          >
                        )[(i18n.language || 'ro').split('-')[0]] || 'en-GB',
                        { day: '2-digit', month: 'short' }
                      ),
                    })}
                  </span>
                )}
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
                  {/* This badge is derived purely from how many days remain until the
                    cargo-ready date — it says nothing about vessel space. Labelling
                    it "Disponibil/Indisponibil" made the client read it as real
                    availability and wonder why an "Indisponibil" offer was still
                    selectable. It now says what it actually measures. */}
                  {offer.availability === 'AVAILABLE'
                    ? 'Termen confortabil'
                    : offer.availability === 'LIMITED'
                      ? 'Termen strâns'
                      : 'Termen foarte scurt'}
                </span>
              </div>
              <div className="mt-2">
                <RouteDisplay route={offer.route} />
              </div>
              {offer.priceFromReferencePort && (
                <p className="mt-2 text-xs text-warning-700 dark:text-warning-500">
                  Tarif de referință {offer.priceFromReferencePort} — pentru {offer.portOrigin} nu
                  există tarif propriu, s-a aplicat ajustarea de port.
                </p>
              )}
            </div>
          </div>

          {/* Right: Price */}
          <div className="text-right">
            <p className="text-2xl font-bold text-accent-500">${adjustedTotal.toFixed(0)}</p>
            <p className="text-sm text-neutral-400">{adjustedTotalMDL.toFixed(0)} MDL</p>
          </div>
        </div>
      </div>

      {/* Expanded Details — outside the clickable header, so the commission
          input and the "i" do not toggle the card when used. */}
      {isSelected && (
        <div className="mt-5 pt-5 border-t border-neutral-200 dark:border-neutral-700 animate-fade-in">
          {isAdmin ? (
            <>
              {/* Admin: Rata 0 - EXW China costs (configured separately, not in this quote) */}
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
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Costurile interne China se configurează separat și nu sunt incluse în acest
                      calcul.
                    </p>
                  </div>
                </div>
              )}

              {/*
                Three rows, in the shape Ion asked for on 8 Sep (14:52):
                ocean freight, then local charges AND inland transport together
                — "să nu fie separat cheltuielile locale de transport" — then the
                forwarding commission on its own.

                Under CFR/CIF the maritime row stays on screen but goes inactive
                rather than disappearing: "Maritimul o să fie inactiv" (28:28).
                A row that vanishes reads as an omission; one that is struck out
                and labelled reads as an answer.
              */}
              <div className="mb-4 space-y-2">
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg p-3',
                    supplierCoversMaritime
                      ? 'bg-neutral-100/60 dark:bg-neutral-700/30'
                      : 'bg-neutral-50 dark:bg-neutral-700/50'
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium',
                        supplierCoversMaritime
                          ? 'text-neutral-400 line-through'
                          : 'text-primary-800 dark:text-white'
                      )}
                    >
                      {t('calculator.offer.rowMaritime')}
                    </p>
                    {!supplierCoversMaritime && (
                      <p className="text-xs text-neutral-400">
                        {offer.portOrigin} → {offer.portIntermediate}
                      </p>
                    )}
                  </div>
                  {supplierCoversMaritime ? (
                    <span className="text-xs font-medium text-neutral-400">
                      {t('calculator.offer.maritimeInactive')}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-accent-500">
                      ${maritimeTotal.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 dark:bg-neutral-700/50">
                  <div>
                    <p className="text-sm font-medium text-primary-800 dark:text-white">
                      {t('calculator.offer.rowLocalAndInland')}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {offer.portIntermediate}
                      {offer.portFinal && offer.portFinal !== offer.portIntermediate
                        ? ` → ${offer.portFinal}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-accent-500">
                    ${(taxeLocaleTotal + transportTerestruTotal).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 dark:bg-neutral-700/50">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-primary-800 dark:text-white">
                      {t('calculator.offer.rowCommission')}
                    </p>
                    <InfoTip text={t('calculator.offer.commissionBaseNote')} />
                  </div>
                  {isAdmin ? (
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={t('calculator.offer.rowCommission')}
                        className="w-12 border-b border-accent-400 bg-transparent text-right text-sm font-semibold text-primary-800 focus:border-accent-600 focus:outline-none dark:text-white"
                        value={commissionPercent}
                        onChange={(e) => setCommissionPercent(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm font-bold text-accent-500">
                        % = ${commissionAmount.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-accent-500">
                      ${commissionAmount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {supplierCoversMaritime && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/30 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {t('calculator.offer.maritimeIncludedNote', {
                      incoterm,
                      insurance: incoterm === 'CIF' ? t('calculator.offer.insuranceAlso') : '',
                      line: offer.shippingLine,
                    })}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Client view — grouped by INCOTERM (EXW / FOB / CFR-CIF).
               Internal cost components (port adjustment, port taxes, commission, etc.) are hidden.
               Only the Incoterm-level subtotals are shown. */
            <div className="space-y-4 mb-4">
              {/* EXW — China local export taxes (only when incoterm === EXW) */}
              {incoterm === 'EXW' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-purple-500 rounded">
                      EXW
                    </span>
                    <h5 className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                      Taxe locale China
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    ${getEXWTotal().toFixed(0)}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    Costurile interne China se configurează separat.
                  </p>
                </div>
              )}

              {/* FOB — Maritime China → Constanța/Odessa */}
              {!supplierCoversMaritime ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded">
                      FOB
                    </span>
                    <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      Transport maritim China → {offer.portIntermediate}
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    ${(getMaritimeTotal(offer) + offer.portTaxes).toFixed(0)}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {offer.shippingLine} · {offer.estimatedTransitDays} zile pe apă
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded">
                      {incoterm}
                    </span>
                    <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      {incoterm === 'CIF'
                        ? 'Maritim + asigurare incluse în prețul furnizorului'
                        : 'Maritim inclus în prețul furnizorului'}
                    </h5>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Transportul maritim până la {offer.portIntermediate}
                    {incoterm === 'CIF' ? ' (cu asigurare)' : ''} este inclus de furnizor (
                    {offer.shippingLine})
                  </p>
                </div>
              )}

              {/* CFR / CIF — Land from Constanța/Odessa to final destination (Chișinău, Bălți, etc.)
                  Includes terrestrial + customs + local fees + commission combined */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                <div className="flex items-center gap-2 mb-2">
                  {/* Domestic road leg — NOT a maritime Incoterm (no CFR/CIF here) */}
                  <span className="px-2 py-0.5 text-xs font-bold text-white bg-green-600 rounded">
                    Transport intern
                  </span>
                  <h5 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    {offer.portIntermediate} → {offer.portFinal}
                  </h5>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${(transportTerestruTotal + offer.customsTaxes + commissionAmount).toFixed(0)}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Transport terestru + vamă + comision (totul inclus)
                </p>
              </div>

              {/* Grand total for clarity */}
              <div className="bg-neutral-50 dark:bg-neutral-700/40 rounded-xl p-4 border border-neutral-200 dark:border-neutral-600/40">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Total
                  </h5>
                  <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                    ${adjustedTotal.toFixed(0)}
                  </p>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {incoterm === 'EXW'
                    ? 'EXW + FOB + CFR/CIF'
                    : incoterm === 'FOB'
                      ? 'FOB + CFR/CIF'
                      : incoterm === 'CIF'
                        ? 'CIF (maritim + asigurare incluse de furnizor)'
                        : 'CFR (maritim inclus de furnizor)'}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="accent"
            className="w-full mt-4"
            onClick={(e) => {
              e.stopPropagation();
              // Hand over the offer already carrying the numbers shown on this card,
              // plus the percentage used, so the server re-derives the same total.
              onSelectOffer(
                {
                  ...offer,
                  commission: commissionAmount,
                  commissionAmount,
                  commissionPercent: effectivePercent,
                  totalPriceUSD: adjustedTotal,
                  totalPriceMDL: adjustedTotalMDL,
                },
                index,
                effectivePercent
              );
            }}
          >
            Selectează Această Ofertă
          </Button>
        </div>
      )}
    </section>
  );
};
