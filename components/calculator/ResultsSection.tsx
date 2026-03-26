import React from 'react';
import { SpinnerIcon, CalculatorIcon, CheckCircleIcon, PackageIcon } from './Icons';
import { OfferCard } from './OfferCard';
import { SupplierForm } from './SupplierForm';
import { UseCalculatorReturn } from './types';

type Props = Pick<
  UseCalculatorReturn,
  | 'result'
  | 'isLoading'
  | 'error'
  | 'selectedOffer'
  | 'setSelectedOffer'
  | 'showSupplierForm'
  | 'setShowSupplierForm'
  | 'selectedOfferData'
  | 'isPlacingOrder'
  | 'orderSuccess'
  | 'supplierData'
  | 'setSupplierData'
  | 'containers'
  | 'handleSelectOffer'
  | 'handlePlaceOrder'
  | 'isAdmin'
>;

export const ResultsSection = ({
  result,
  isLoading,
  error,
  selectedOffer,
  setSelectedOffer,
  showSupplierForm,
  setShowSupplierForm,
  selectedOfferData,
  isPlacingOrder,
  orderSuccess,
  supplierData,
  setSupplierData,
  containers,
  handleSelectOffer,
  handlePlaceOrder,
  isAdmin,
}: Props) => (
  <div className="lg:col-span-8">
    {/* Loading State */}
    {isLoading && (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[500px]">
        <SpinnerIcon large isTextWhite={false} />
        <p className="mt-4 text-neutral-500 dark:text-neutral-400 font-medium">
          Se calculează oferte...
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          Analizăm toate liniile maritime pentru cele mai bune prețuri
        </p>
      </div>
    )}

    {/* Empty State */}
    {!isLoading && !result && !showSupplierForm && (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
          <CalculatorIcon large />
        </div>
        <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">
          Gata pentru calcul
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
          Completați formularul pentru a vedea cele mai bune 5 oferte de la toate liniile maritime
          disponibile.
        </p>
      </div>
    )}

    {/* Order Success Message */}
    {orderSuccess && (
      <div className="mb-6 p-4 bg-success-50 dark:bg-success-500/20 border border-success-200 dark:border-success-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircleIcon />
          <div>
            <h4 className="font-semibold text-success-700 dark:text-success-400">{orderSuccess}</h4>
            <p className="text-sm text-success-600 dark:text-success-500 mt-1">
              Am trimis email-uri către furnizor, agent și dvs. cu detaliile comenzii.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Supplier Form */}
    {showSupplierForm && selectedOfferData && (
      <SupplierForm
        selectedOfferData={selectedOfferData}
        containers={containers}
        supplierData={supplierData}
        setSupplierData={setSupplierData}
        setShowSupplierForm={setShowSupplierForm}
        isPlacingOrder={isPlacingOrder}
        error={error}
        showSupplierForm={showSupplierForm}
        handlePlaceOrder={handlePlaceOrder}
      />
    )}

    {/* Results */}
    {result && !showSupplierForm && (
      <div className="space-y-5">
        {/* Info Banner */}
        <div className="bg-primary-800 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm opacity-80">Curs USD → MDL</p>
              <p className="text-2xl font-bold">{result.exchangeRate.toFixed(2)} MDL</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Calculat la</p>
              <p className="font-medium">{new Date(result.calculatedAt).toLocaleString('ro-RO')}</p>
            </div>
          </div>
          {/* Containers Summary */}
          <div className="pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <PackageIcon />
              <span className="text-sm opacity-80">Containere:</span>
              <div className="flex flex-wrap gap-1.5">
                {containers
                  .filter((c) => c.quantity > 0)
                  .map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                      {c.quantity}× {c.type}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Offer Cards */}
        <div className="grid gap-4">
          {result.offers.map((offer, index) => (
            <OfferCard
              key={offer.rank}
              offer={offer}
              index={index}
              isSelected={selectedOffer === index}
              isAdmin={isAdmin}
              onToggle={(idx) => setSelectedOffer(selectedOffer === idx ? null : idx)}
              onSelectOffer={handleSelectOffer}
            />
          ))}
        </div>

        <p className="text-xs text-neutral-400 text-center py-2">
          * Prețurile sunt orientative și pot varia în funcție de disponibilitate și condiții
          speciale.
        </p>
      </div>
    )}
  </div>
);
