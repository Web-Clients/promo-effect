import React from 'react';
import { useTranslation } from 'react-i18next';
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
  | 'incoterm'
  | 'finalDestination'
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
  incoterm,
  finalDestination,
}: Props) => {
  const { t } = useTranslation();
  return (
    <div className="lg:col-span-8">
      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[500px]">
          <SpinnerIcon large isTextWhite={false} />
          <p className="mt-4 text-neutral-500 dark:text-neutral-400 font-medium">
            {t('calculator.calculatingOffers')}
          </p>
          <p className="text-sm text-neutral-400 mt-1">{t('calculator.analyzingLines')}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !result && !showSupplierForm && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[500px]">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
            <CalculatorIcon large />
          </div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">
            {t('calculator.readyToCalculate')}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
            {t('calculator.readyToCalculateDesc')}
          </p>
        </div>
      )}

      {/* Order Success Message */}
      {orderSuccess && (
        <div className="mb-6 p-4 bg-success-50 dark:bg-success-500/20 border border-success-200 dark:border-success-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircleIcon />
            <div>
              <h4 className="font-semibold text-success-700 dark:text-success-400">
                {orderSuccess}
              </h4>
              <p className="text-sm text-success-600 dark:text-success-500 mt-1">
                {t('calculator.orderEmailSent')}
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

      {/* No Results / Contact Fallback */}
      {result && !showSupplierForm && result.offers.length === 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
            <svg
              className="w-8 h-8 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-3">
            {t('calculator.noPricesFound')}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
            {t('calculator.noPricesDesc')}
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('calculator.contactRep')}
          </a>
        </div>
      )}

      {/* Results */}
      {result && !showSupplierForm && result.offers.length > 0 && (
        <div className="space-y-5">
          {/* Info Banner */}
          <div className="bg-primary-800 text-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm opacity-80">{t('calculator.exchangeRate')}</p>
                <p className="text-2xl font-bold">{result.exchangeRate.toFixed(2)} MDL</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">{t('calculator.calculatedAt')}</p>
                <p className="font-medium">
                  {new Date(result.calculatedAt).toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
            {/* Containers Summary */}
            <div className="pt-3 border-t border-white/20">
              <div className="flex items-center gap-2">
                <PackageIcon />
                <span className="text-sm opacity-80">{t('calculator.containersLabel')}</span>
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
                incoterm={incoterm}
                finalDestination={finalDestination}
                onToggle={(idx) => setSelectedOffer(selectedOffer === idx ? null : idx)}
                onSelectOffer={handleSelectOffer}
              />
            ))}
          </div>

          <p className="text-xs text-neutral-400 text-center py-2">
            {t('calculator.pricesDisclaimer')}
          </p>
        </div>
      )}
    </div>
  );
};
