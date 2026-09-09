import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalculator } from './useCalculator';
import { PageTour } from '../ui/PageTour';
import { CalculatorForm } from './CalculatorForm';
import { ResultsSection } from './ResultsSection';
import { PriceCalculatorProps } from './types';

export const PriceCalculatorContainer = ({ user }: PriceCalculatorProps) => {
  const calc = useCalculator(user);
  const { t } = useTranslation();
  const [replayTour, setReplayTour] = useState(false);

  // Ordered as the form is filled, so the walkthrough matches what the reader
  // is about to do rather than the order the markup happens to be in.
  const tourSteps = [
    {
      target: 'incoterm',
      title: t('calculator.tour.incoterm.title'),
      body: t('calculator.tour.incoterm.body'),
    },
    {
      target: 'cargoReady',
      title: t('calculator.tour.cargoReady.title'),
      body: t('calculator.tour.cargoReady.body'),
    },
    {
      target: 'calculate',
      title: t('calculator.tour.calculate.title'),
      body: t('calculator.tour.calculate.body'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            {t('calculator.title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('calculator.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReplayTour(true)}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          {t('tour.help')}
        </button>
      </div>

      <PageTour
        id="calculator"
        steps={tourSteps}
        open={replayTour}
        onClose={() => setReplayTour(false)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <CalculatorForm
          params={calc.params}
          setParams={calc.setParams}
          containers={calc.containers}
          addContainer={calc.addContainer}
          removeContainer={calc.removeContainer}
          updateContainer={calc.updateContainer}
          getTotalContainers={calc.getTotalContainers}
          availablePorts={calc.availablePorts}
          availableDestinations={calc.availableDestinations}
          availableContainerTypes={calc.availableContainerTypes}
          availableWeightRanges={calc.availableWeightRanges}
          availableShippingLines={calc.availableShippingLines}
          isLoading={calc.isLoading}
          error={calc.error}
          showSupplierForm={calc.showSupplierForm}
          handleCalculate={calc.handleCalculate}
        />

        <ResultsSection
          result={calc.result}
          isLoading={calc.isLoading}
          error={calc.error}
          selectedOffer={calc.selectedOffer}
          setSelectedOffer={calc.setSelectedOffer}
          showSupplierForm={calc.showSupplierForm}
          setShowSupplierForm={calc.setShowSupplierForm}
          selectedOfferData={calc.selectedOfferData}
          isPlacingOrder={calc.isPlacingOrder}
          orderSuccess={calc.orderSuccess}
          supplierData={calc.supplierData}
          setSupplierData={calc.setSupplierData}
          containers={calc.containers}
          handleSelectOffer={calc.handleSelectOffer}
          handlePlaceOrder={calc.handlePlaceOrder}
          isAdmin={calc.isAdmin}
          incoterm={calc.incoterm}
          finalDestination={calc.finalDestination}
          clients={calc.clients}
          agents={calc.agents}
          orderDocuments={calc.orderDocuments}
          setOrderDocuments={calc.setOrderDocuments}
        />
      </div>
    </div>
  );
};
