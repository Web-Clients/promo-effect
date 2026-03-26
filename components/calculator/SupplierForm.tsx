import React from 'react';
import { Button } from '../ui/Button';
import { FormField, CalcInput, CalcSelect, CalcTextArea } from './FormElements';
import { PackageIcon } from './Icons';
import { RouteDisplay } from './RouteDisplay';
import { UseCalculatorReturn } from './types';

type Props = Pick<
  UseCalculatorReturn,
  | 'selectedOfferData'
  | 'containers'
  | 'supplierData'
  | 'setSupplierData'
  | 'setShowSupplierForm'
  | 'isPlacingOrder'
  | 'error'
  | 'showSupplierForm'
  | 'handlePlaceOrder'
>;

export const SupplierForm = ({
  selectedOfferData,
  containers,
  supplierData,
  setSupplierData,
  setShowSupplierForm,
  isPlacingOrder,
  error,
  showSupplierForm,
  handlePlaceOrder,
}: Props) => {
  if (!selectedOfferData) return null;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white">Date Furnizor</h3>
          <p className="text-sm text-neutral-400">
            Completați informațiile pentru plasarea comenzii
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowSupplierForm(false)}>
          Înapoi la oferte
        </Button>
      </div>

      {/* Selected Offer Summary */}
      <div className="bg-accent-50 dark:bg-accent-500/10 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-accent-600 dark:text-accent-400">Ofertă selectată</p>
            <p className="font-bold text-lg text-accent-700 dark:text-accent-300">
              {selectedOfferData.shippingLine}
            </p>
            <RouteDisplay route={selectedOfferData.route} />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent-600">
              ${selectedOfferData.totalPriceUSD.toFixed(0)}
            </p>
            <p className="text-sm text-neutral-400">
              {selectedOfferData.estimatedTransitDays} zile tranzit
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-accent-200 dark:border-accent-500/20">
          <p className="text-xs text-accent-600 dark:text-accent-400 mb-2 flex items-center gap-1">
            <PackageIcon /> Containere comandate:
          </p>
          <div className="flex flex-wrap gap-2">
            {containers
              .filter((c) => c.quantity > 0)
              .map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-white dark:bg-neutral-800 rounded text-xs font-medium text-primary-800 dark:text-white"
                >
                  {c.quantity}× {c.type}
                </span>
              ))}
          </div>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nume Furnizor" required>
            <CalcInput
              type="text"
              placeholder="Ex: China Trading Co."
              value={supplierData.supplierName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSupplierData({ ...supplierData, supplierName: e.target.value })
              }
              required
            />
          </FormField>

          <FormField label="Persoană de Contact" required>
            <CalcInput
              type="text"
              placeholder="Ex: Zhang Wei"
              value={supplierData.supplierContact}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSupplierData({ ...supplierData, supplierContact: e.target.value })
              }
              required
            />
          </FormField>
        </div>

        <FormField label="Adresa Furnizor" required>
          <CalcInput
            type="text"
            placeholder="Ex: 123 Industrial Zone, Shanghai, China"
            value={supplierData.supplierAddress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSupplierData({ ...supplierData, supplierAddress: e.target.value })
            }
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Email Furnizor" required>
            <CalcInput
              type="email"
              placeholder="supplier@example.com"
              value={supplierData.supplierEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSupplierData({ ...supplierData, supplierEmail: e.target.value })
              }
              required
            />
          </FormField>

          <FormField label="Telefon Furnizor" required>
            <CalcInput
              type="tel"
              placeholder="+86 123 456 7890"
              value={supplierData.supplierPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSupplierData({ ...supplierData, supplierPhone: e.target.value })
              }
              required
            />
          </FormField>
        </div>

        <FormField label="Descriere Marfă" required>
          <CalcTextArea
            rows={3}
            placeholder="Ex: Mobilier din lemn - 50 seturi canapele"
            value={supplierData.cargoDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setSupplierData({ ...supplierData, cargoDescription: e.target.value })
            }
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Valoare Factură" required>
            <CalcInput
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 15000"
              value={supplierData.invoiceValue || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSupplierData({ ...supplierData, invoiceValue: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </FormField>

          <FormField label="Monedă">
            <CalcSelect
              value={supplierData.invoiceCurrency}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSupplierData({ ...supplierData, invoiceCurrency: e.target.value })
              }
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CNY">CNY</option>
            </CalcSelect>
          </FormField>
        </div>

        <FormField
          label="Instrucțiuni Speciale"
          hint="Opțional - cerințe speciale pentru transport"
        >
          <CalcTextArea
            rows={2}
            placeholder="Ex: Marfă fragilă, necesită manipulare atentă"
            value={supplierData.specialInstructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setSupplierData({ ...supplierData, specialInstructions: e.target.value })
            }
          />
        </FormField>

        {error && showSupplierForm && (
          <div className="p-3 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-lg">
            <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="submit"
            variant="accent"
            disabled={isPlacingOrder}
            loading={isPlacingOrder}
            className="w-full"
            size="lg"
          >
            {isPlacingOrder ? 'Se plasează comanda...' : 'Plasează Comanda'}
          </Button>
          <p className="text-xs text-neutral-400 text-center mt-3">
            La plasarea comenzii, vom trimite 3 email-uri: către furnizor, agent și dvs.
          </p>
        </div>
      </form>
    </div>
  );
};
