import React from 'react';
import { useCalculator } from './useCalculator';
import { CalculatorForm } from './CalculatorForm';
import { ResultsSection } from './ResultsSection';
import { PriceCalculatorProps } from './types';

export const PriceCalculatorContainer = ({ user }: PriceCalculatorProps) => {
  const calc = useCalculator(user);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
          Calculator de Prețuri
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Obțineți cele mai bune oferte de la toate liniile maritime
        </p>
      </div>

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
        />
      </div>
    </div>
  );
};
