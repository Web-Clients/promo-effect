import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { FormField, CalcInput, CalcSelect, CalcTextArea } from './FormElements';
import { PackageIcon } from './Icons';
import { RouteDisplay } from './RouteDisplay';
import { UseCalculatorReturn } from './types';
import { getSuppliers, createSupplier, type Supplier } from '../../services/suppliers';

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
  | 'clients'
  | 'agents'
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
  clients,
  agents,
}: Props) => {
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // Supplier autocomplete state
  const [supplierQuery, setSupplierQuery] = useState(supplierData.supplierName || '');
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Load supplier options when typing
  useEffect(() => {
    if (!supplierQuery || supplierQuery.length < 2) {
      setSupplierOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSupplierLoading(true);
      try {
        const result = await getSuppliers({ search: supplierQuery, limit: 10 });
        setSupplierOptions(result.suppliers);
        setShowSupplierDropdown(true);
      } catch {
        // silently ignore
      } finally {
        setSupplierLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [supplierQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSupplierSelect = (s: Supplier) => {
    setSupplierQuery(s.name);
    setSupplierData({
      ...supplierData,
      supplierId: s.id,
      supplierName: s.name,
      supplierContact: s.contact || supplierData.supplierContact,
      supplierAddress: s.address || supplierData.supplierAddress,
      supplierPhone: s.phone || supplierData.supplierPhone,
      supplierEmail: s.email || supplierData.supplierEmail,
    });
    setShowSupplierDropdown(false);
  };

  const handleSupplierNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSupplierQuery(val);
    setSupplierData({ ...supplierData, supplierName: val, supplierId: undefined });
    if (val.length >= 2) setShowSupplierDropdown(true);
    else setShowSupplierDropdown(false);
  };

  const handleCreateSupplierInline = async () => {
    if (!supplierQuery.trim()) return;
    try {
      const s = await createSupplier({
        name: supplierQuery.trim(),
        address: supplierData.supplierAddress,
        contact: supplierData.supplierContact,
        phone: supplierData.supplierPhone,
        email: supplierData.supplierEmail,
        country: 'China',
      });
      setSupplierData({ ...supplierData, supplierId: s.id, supplierName: s.name });
      setShowSupplierDropdown(false);
    } catch {
      // ignore — supplier name stays as-is inline
    }
  };

  if (!selectedOfferData) return null;

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    if (clientId === '__new__') {
      setShowNewClientForm(true);
      setSupplierData({
        ...supplierData,
        clientId: '',
        beneficiaryName: '',
        beneficiaryContact: '',
        beneficiaryAddress: '',
      });
      return;
    }
    setShowNewClientForm(false);
    if (!clientId) {
      setSupplierData({
        ...supplierData,
        clientId: '',
        beneficiaryName: '',
        beneficiaryContact: '',
        beneficiaryAddress: '',
      });
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setSupplierData({
        ...supplierData,
        clientId: client.id,
        beneficiaryName: client.companyName,
        beneficiaryContact: client.contactPerson,
        beneficiaryAddress: client.address || '',
      });
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = e.target.value;
    if (!agentId) {
      setSupplierData({ ...supplierData, agentId: '' });
      return;
    }
    setSupplierData({ ...supplierData, agentId });
  };

  const selectedAgent = agents.find((a) => a.id === supplierData.agentId);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white">Date Comandă</h3>
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
        {/* ─── Date Furnizor (China) ─── */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide mb-3">
            Date Furnizor (China)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nume Furnizor" required>
              <div className="relative" ref={supplierDropdownRef}>
                <CalcInput
                  type="text"
                  placeholder="Ex: Shanghai XYZ Trading Co."
                  value={supplierQuery}
                  onChange={handleSupplierNameChange}
                  onFocus={() => supplierQuery.length >= 2 && setShowSupplierDropdown(true)}
                  required
                  autoComplete="off"
                />
                {supplierData.supplierId && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600 dark:text-green-400 font-medium pointer-events-none">
                    ✓ salvat
                  </span>
                )}
                {showSupplierDropdown &&
                  (supplierOptions.length > 0 || supplierQuery.length >= 2) && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {supplierLoading && (
                        <div className="px-3 py-2 text-xs text-neutral-400">Se caută...</div>
                      )}
                      {supplierOptions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm"
                          onClick={() => handleSupplierSelect(s)}
                        >
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {s.name}
                          </span>
                          {s.address && (
                            <span className="text-xs text-neutral-400 ml-2 truncate">
                              {s.address}
                            </span>
                          )}
                          {(s._count?.bookings ?? 0) > 0 && (
                            <span className="text-xs text-accent-500 ml-2">
                              {s._count!.bookings} comenzi
                            </span>
                          )}
                        </button>
                      ))}
                      {!supplierLoading &&
                        supplierOptions.length === 0 &&
                        supplierQuery.length >= 2 && (
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm text-accent-600 dark:text-accent-400"
                            onClick={handleCreateSupplierInline}
                          >
                            + Salvează „{supplierQuery}" ca furnizor nou
                          </button>
                        )}
                    </div>
                  )}
              </div>
            </FormField>

            <FormField label="Persoană de Contact">
              <CalcInput
                type="text"
                placeholder="Ex: Zhang Wei"
                value={supplierData.supplierContact}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSupplierData({ ...supplierData, supplierContact: e.target.value })
                }
              />
            </FormField>
          </div>

          <FormField label="Detalii furnizor / Companie expeditoare">
            <textarea
              rows={4}
              placeholder="Denumire companie + adresă + persoană contact + observații (ex: Shanghai XYZ Trading Co., Ltd, 123 Industrial Zone, Shanghai, contact: Mr. Wang +86-..., specializat export mobilier)"
              value={supplierData.supplierAddress}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setSupplierData({ ...supplierData, supplierAddress: e.target.value })
              }
              className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-colors duration-200 resize-y"
            />
          </FormField>
        </div>

        {/* ─── Date Beneficiar ─── */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide mb-3">
            Date Beneficiar
          </h4>

          <FormField label="Selectați client" required>
            <CalcSelect
              value={showNewClientForm ? '__new__' : supplierData.clientId || ''}
              onChange={handleClientChange}
              required={!showNewClientForm}
            >
              <option value="">— Alegeți client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.contactPerson})
                </option>
              ))}
              <option value="__new__">+ Client nou</option>
            </CalcSelect>
          </FormField>

          {showNewClientForm && (
            <div className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Date client nou (va fi salvat în baza de date)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Companie beneficiar" required>
                  <CalcInput
                    type="text"
                    placeholder="Ex: SRL Ionescu"
                    value={supplierData.beneficiaryName || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSupplierData({ ...supplierData, beneficiaryName: e.target.value })
                    }
                    required
                  />
                </FormField>
                <FormField label="Persoană contact" required>
                  <CalcInput
                    type="text"
                    placeholder="Ex: Ion Ionescu"
                    value={supplierData.beneficiaryContact || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSupplierData({ ...supplierData, beneficiaryContact: e.target.value })
                    }
                    required
                  />
                </FormField>
              </div>
              <FormField label="Adresă">
                <CalcInput
                  type="text"
                  placeholder="Adresa completă"
                  value={supplierData.beneficiaryAddress || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSupplierData({ ...supplierData, beneficiaryAddress: e.target.value })
                  }
                />
              </FormField>
            </div>
          )}

          {/* Show pre-filled client info when selected */}
          {!showNewClientForm && supplierData.clientId && (
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-700 dark:text-green-400">
                <span className="font-semibold">{supplierData.beneficiaryName}</span>
                {supplierData.beneficiaryContact && ` · ${supplierData.beneficiaryContact}`}
                {supplierData.beneficiaryAddress && ` · ${supplierData.beneficiaryAddress}`}
              </p>
            </div>
          )}
        </div>

        {/* ─── Date Agent ─── */}
        {agents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide mb-3">
              Date Agent
            </h4>

            <FormField label="Selectați agent" hint="Opțional">
              <CalcSelect value={supplierData.agentId || ''} onChange={handleAgentChange}>
                <option value="">— Fără agent —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company} · {a.contactName} ({a.agentCode})
                  </option>
                ))}
              </CalcSelect>
            </FormField>

            {selectedAgent && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <span className="font-semibold">{selectedAgent.company}</span>
                  {` · ${selectedAgent.contactName}`}
                  {selectedAgent.user?.email && ` · ${selectedAgent.user.email}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── Descriere Marfă ─── */}
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
