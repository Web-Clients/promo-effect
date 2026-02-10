import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { HsCodeSelector } from './ui/HsCodeSelector';
import calculatorService, { CalculatorResult, PriceOffer, SupplierData, ContainerEntry } from '../services/calculator';
import { HsCode } from '../services/hscodes';
import { User, UserRole } from '../types';
import { cn } from '../lib/utils';

const SpinnerIcon = ({ large, isTextWhite = true }: { large?: boolean, isTextWhite?: boolean }) => <svg className={`animate-spin ${large ? 'h-10 w-10' : 'h-5 w-5'} ${isTextWhite ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const CalculatorIcon = ({ large }: { large?: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`${large ? 'h-16 w-16' : 'h-6 w-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 0v6m0-6L9 13" /><path d="M3 6.2C3 5.0799 3 4.51984 3.21799 4.09202C3.40973 3.71569 3.71569 3.40973 4.09202 3.21799C4.51984 3 5.0799 3 6.2 3H17.8C18.9201 3 19.4802 3 19.908 3.21799C20.2843 3.40973 20.5903 3.71569 20.782 4.09202C21 4.51984 21 5.0799 21 6.2V17.8C21 18.9201 21 19.4802 20.782 19.908C20.5903 20.2843 20.2843 20.5903 19.908 20.782C19.4802 21 18.9201 21 17.8 21H6.2C5.0799 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4802 3 18.9201 3 17.8V6.2Z" strokeWidth={1} /></svg>;

// Icons
const ClockIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckCircleIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ArrowRightIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;
const ShipIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const PlusCircleIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PackageIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;

// Reusable form components — defined outside PriceCalculator to avoid
// re-creation on every render (which causes inputs to lose focus).
const FormField = ({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200">
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
        </label>
        {children}
        {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
);

const CalcSelect = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
        {...props}
        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7684' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2.5rem' }}
    />
);

const CalcInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all ${className}`}
    />
);

const CalcTextArea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all resize-none"
    />
);

const RouteDisplay = ({ route }: { route: string }) => {
    const parts = route.split(' → ');
    return (
        <div className="flex items-center gap-2 text-sm">
            {parts.map((part, idx) => (
                <React.Fragment key={idx}>
                    <span className={cn(
                        "px-2 py-1 rounded",
                        idx === 0 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                        idx === parts.length - 1 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                    )}>
                        {part}
                    </span>
                    {idx < parts.length - 1 && <ArrowRightIcon />}
                </React.Fragment>
            ))}
        </div>
    );
};

const PriceCalculator = ({ user }: { user?: User }) => {
    const isAdmin = user && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(user.role);
    // Form state
    const [params, setParams] = useState({
        portOrigin: '',
        portDestination: 'Constanța',
        cargoWeight: '',
        cargoReadyDate: '',
        cargoCategory: '',
    });

    // Multiple containers state
    const [containers, setContainers] = useState<ContainerEntry[]>([
        { type: '', quantity: 1 }
    ]);

    // Dropdown options from API
    const [availablePorts, setAvailablePorts] = useState<string[]>([]);
    const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
    const [availableContainerTypes, setAvailableContainerTypes] = useState<string[]>([]);
    const [availableWeightRanges, setAvailableWeightRanges] = useState<string[]>([]);

    const [result, setResult] = useState<CalculatorResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [selectedOffer, setSelectedOffer] = useState<number | null>(null);

    // Order placement state
    const [showSupplierForm, setShowSupplierForm] = useState(false);
    const [selectedOfferData, setSelectedOfferData] = useState<PriceOffer | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

    // Supplier form data
    const [supplierData, setSupplierData] = useState<SupplierData>({
        supplierName: '',
        supplierAddress: '',
        supplierContact: '',
        supplierEmail: '',
        supplierPhone: '',
        cargoDescription: '',
        invoiceValue: 0,
        invoiceCurrency: 'USD',
        specialInstructions: '',
    });

    // Load dropdown options on mount
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [ports, destinations, types, weights] = await Promise.all([
                    calculatorService.getAvailablePorts(),
                    calculatorService.getAvailableDestinations(),
                    calculatorService.getAvailableContainerTypes(),
                    calculatorService.getAvailableWeightRanges(),
                ]);

                setAvailablePorts(ports);
                setAvailableDestinations(destinations);
                setAvailableContainerTypes(types);
                setAvailableWeightRanges(weights);

                // Set default values
                if (ports.length > 0) setParams(prev => ({ ...prev, portOrigin: ports[0] }));
                if (destinations.length > 0) setParams(prev => ({ ...prev, portDestination: destinations[0] }));
                if (types.length > 0) setContainers([{ type: types[0], quantity: 1 }]);
                if (weights.length > 0) setParams(prev => ({ ...prev, cargoWeight: weights[0] }));
            } catch (err: any) {
                console.error('Failed to load calculator options:', err);
            }
        };

        loadOptions();
    }, []);

    // Container management functions
    const addContainer = () => {
        if (availableContainerTypes.length > 0) {
            setContainers(prev => [...prev, { type: availableContainerTypes[0], quantity: 1 }]);
        }
    };

    const removeContainer = (index: number) => {
        if (containers.length > 1) {
            setContainers(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateContainer = (index: number, field: 'type' | 'quantity', value: string | number) => {
        setContainers(prev => prev.map((c, i) =>
            i === index ? { ...c, [field]: value } : c
        ));
    };

    const getTotalContainers = () => containers.reduce((sum, c) => sum + c.quantity, 0);

    const handleCalculate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);
        setError('');
        setSelectedOffer(null);
        setShowSupplierForm(false);
        setOrderSuccess(null);

        // Validate containers
        if (containers.length === 0 || containers.every(c => c.quantity === 0)) {
            setError('Adăugați cel puțin un container cu cantitate > 0');
            setIsLoading(false);
            return;
        }

        try {
            const calculatorResult = await calculatorService.calculatePrices({
                portOrigin: params.portOrigin,
                portDestination: params.portDestination,
                containerType: containers[0].type, // Primary container type for backward compatibility
                containers: containers.filter(c => c.quantity > 0), // Multiple containers
                cargoWeight: params.cargoWeight,
                cargoReadyDate: params.cargoReadyDate,
                cargoCategory: params.cargoCategory,
            });

            setResult(calculatorResult);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectOffer = (offer: PriceOffer, index: number) => {
        setSelectedOffer(index);
        setSelectedOfferData(offer);
        setShowSupplierForm(true);
        setOrderSuccess(null);
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOfferData || !result) return;

        setIsPlacingOrder(true);
        setError('');

        try {
            const response = await calculatorService.placeOrder({
                offerId: selectedOfferData.basePriceId,
                offer: selectedOfferData,
                calculatorInput: {
                    portOrigin: params.portOrigin,
                    portDestination: params.portDestination,
                    containerType: containers[0].type, // Primary container type
                    containers: containers.filter(c => c.quantity > 0), // All containers
                    cargoCategory: params.cargoCategory,
                    cargoWeight: params.cargoWeight,
                    cargoReadyDate: params.cargoReadyDate,
                },
                supplierData,
            });

            setOrderSuccess(`Comanda a fost plasată cu succes! Număr rezervare: ${response.bookingId}`);
            setShowSupplierForm(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPlacingOrder(false);
        }
    };

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
                {/* Calculator Form */}
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
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParams({ ...params, portOrigin: e.target.value })}
                                    required
                                >
                                    {availablePorts.map(p => <option key={p} value={p}>{p}</option>)}
                                </CalcSelect>
                            </FormField>

                            <FormField label="Port Destinație" hint="Alegeți portul de tranzit">
                                <CalcSelect
                                    value={params.portDestination}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParams({ ...params, portDestination: e.target.value })}
                                    required
                                >
                                    {availableDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                                </CalcSelect>
                            </FormField>

                            {/* Multiple Containers Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-primary-800 dark:text-neutral-200">
                                        Containere <span className="text-error-500 ml-1">*</span>
                                    </label>
                                    <span className="text-xs text-neutral-400">
                                        Total: {getTotalContainers()} {getTotalContainers() === 1 ? 'container' : 'containere'}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {containers.map((container, index) => (
                                        <div key={index} className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                            <div className="flex-1">
                                                <CalcSelect
                                                    value={container.type}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                        updateContainer(index, 'type', e.target.value)
                                                    }
                                                    required
                                                >
                                                    {availableContainerTypes.map(t => (
                                                        <option key={t} value={t}>{t}</option>
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
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParams({ ...params, cargoWeight: e.target.value })}
                                    required
                                >
                                    {availableWeightRanges.map(w => <option key={w} value={w}>{w}</option>)}
                                </CalcSelect>
                            </FormField>

                            <FormField label="Categorie Marfă (Cod HS)" hint="Opțional - căutați după cod sau descriere">
                                <HsCodeSelector
                                    value={params.cargoCategory}
                                    onChange={(code: string, hsCode: HsCode | null) => {
                                        setParams({ ...params, cargoCategory: code });
                                    }}
                                    placeholder="Ex: 9403.30 sau mobilier"
                                />
                            </FormField>

                            <FormField label="Data Pregătire Marfă" required>
                                <CalcInput
                                    type="date"
                                    value={params.cargoReadyDate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParams({ ...params, cargoReadyDate: e.target.value })}
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

                {/* Results Section */}
                <div className="lg:col-span-8">
                    {isLoading && (
                        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[500px]">
                            <SpinnerIcon large isTextWhite={false} />
                            <p className="mt-4 text-neutral-500 dark:text-neutral-400 font-medium">Se calculează oferte...</p>
                            <p className="text-sm text-neutral-400 mt-1">Analizăm toate liniile maritime pentru cele mai bune prețuri</p>
                        </div>
                    )}

                    {!isLoading && !result && !showSupplierForm && (
                        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center min-h-[500px]">
                            <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
                                <CalculatorIcon large />
                            </div>
                            <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">Gata pentru calcul</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
                                Completați formularul pentru a vedea cele mai bune 5 oferte de la toate liniile maritime disponibile.
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
                        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-6 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-primary-800 dark:text-white">Date Furnizor</h3>
                                    <p className="text-sm text-neutral-400">Completați informațiile pentru plasarea comenzii</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSupplierForm(false)}
                                >
                                    Înapoi la oferte
                                </Button>
                            </div>

                            {/* Selected Offer Summary */}
                            <div className="bg-accent-50 dark:bg-accent-500/10 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-accent-600 dark:text-accent-400">Ofertă selectată</p>
                                        <p className="font-bold text-lg text-accent-700 dark:text-accent-300">{selectedOfferData.shippingLine}</p>
                                        <RouteDisplay route={selectedOfferData.route} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-accent-600">${selectedOfferData.totalPriceUSD.toFixed(0)}</p>
                                        <p className="text-sm text-neutral-400">{selectedOfferData.estimatedTransitDays} zile tranzit</p>
                                    </div>
                                </div>
                                {/* Show containers summary */}
                                <div className="mt-3 pt-3 border-t border-accent-200 dark:border-accent-500/20">
                                    <p className="text-xs text-accent-600 dark:text-accent-400 mb-2 flex items-center gap-1">
                                        <PackageIcon /> Containere comandate:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {containers.filter(c => c.quantity > 0).map((c, i) => (
                                            <span key={i} className="px-2 py-1 bg-white dark:bg-neutral-800 rounded text-xs font-medium text-primary-800 dark:text-white">
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
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupplierData({ ...supplierData, supplierName: e.target.value })}
                                            required
                                        />
                                    </FormField>

                                    <FormField label="Persoană de Contact" required>
                                        <CalcInput
                                            type="text"
                                            placeholder="Ex: Zhang Wei"
                                            value={supplierData.supplierContact}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupplierData({ ...supplierData, supplierContact: e.target.value })}
                                            required
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Adresa Furnizor" required>
                                    <CalcInput
                                        type="text"
                                        placeholder="Ex: 123 Industrial Zone, Shanghai, China"
                                        value={supplierData.supplierAddress}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupplierData({ ...supplierData, supplierAddress: e.target.value })}
                                        required
                                    />
                                </FormField>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Email Furnizor" required>
                                        <CalcInput
                                            type="email"
                                            placeholder="supplier@example.com"
                                            value={supplierData.supplierEmail}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupplierData({ ...supplierData, supplierEmail: e.target.value })}
                                            required
                                        />
                                    </FormField>

                                    <FormField label="Telefon Furnizor" required>
                                        <CalcInput
                                            type="tel"
                                            placeholder="+86 123 456 7890"
                                            value={supplierData.supplierPhone}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupplierData({ ...supplierData, supplierPhone: e.target.value })}
                                            required
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Descriere Marfă" required>
                                    <CalcTextArea
                                        rows={3}
                                        placeholder="Ex: Mobilier din lemn - 50 seturi canapele"
                                        value={supplierData.cargoDescription}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSupplierData({ ...supplierData, cargoDescription: e.target.value })}
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
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupplierData({ ...supplierData, invoiceValue: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </FormField>

                                    <FormField label="Monedă">
                                        <CalcSelect
                                            value={supplierData.invoiceCurrency}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSupplierData({ ...supplierData, invoiceCurrency: e.target.value })}
                                        >
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="CNY">CNY</option>
                                        </CalcSelect>
                                    </FormField>
                                </div>

                                <FormField label="Instrucțiuni Speciale" hint="Opțional - cerințe speciale pentru transport">
                                    <CalcTextArea
                                        rows={2}
                                        placeholder="Ex: Marfă fragilă, necesită manipulare atentă"
                                        value={supplierData.specialInstructions}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSupplierData({ ...supplierData, specialInstructions: e.target.value })}
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
                    )}

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
                                            {containers.filter(c => c.quantity > 0).map((c, i) => (
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
                                    <div
                                        key={offer.rank}
                                        onClick={() => setSelectedOffer(selectedOffer === index ? null : index)}
                                        className={cn(
                                            "bg-white dark:bg-neutral-800 rounded-xl border-2 p-5 cursor-pointer transition-all duration-300",
                                            selectedOffer === index
                                                ? "border-accent-500 shadow-lg shadow-accent-500/10"
                                                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left: Rank & Shipping Line */}
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                                                    offer.rank === 1
                                                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
                                                        : offer.rank === 2
                                                            ? "bg-gradient-to-br from-neutral-300 to-neutral-400 text-white"
                                                            : offer.rank === 3
                                                                ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                                                : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                                                )}>
                                                    #{offer.rank}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-primary-800 dark:text-white">{offer.shippingLine}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-sm text-neutral-500">
                                                            <ClockIcon />
                                                            {offer.estimatedTransitDays} zile
                                                        </span>
                                                        <span className={cn(
                                                            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                                                            offer.availability === 'AVAILABLE'
                                                                ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500'
                                                                : offer.availability === 'LIMITED'
                                                                    ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-500'
                                                                    : 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-500'
                                                        )}>
                                                            <CheckCircleIcon />
                                                            {offer.availability === 'AVAILABLE' ? 'Disponibil' : offer.availability === 'LIMITED' ? 'Limitat' : 'Indisponibil'}
                                                        </span>
                                                    </div>
                                                    {/* Route Display */}
                                                    <div className="mt-2">
                                                        <RouteDisplay route={offer.route} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Price */}
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-accent-500">${offer.totalPriceUSD.toFixed(0)}</p>
                                                <p className="text-sm text-neutral-400">{offer.totalPriceMDL.toFixed(0)} MDL</p>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {selectedOffer === index && (
                                            <div className="mt-5 pt-5 border-t border-neutral-200 dark:border-neutral-700 animate-fade-in">
                                                {isAdmin ? (
                                                    <>
                                                        {/* Admin: detailed Rata 1 */}
                                                        <div className="mb-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h5 className="text-sm font-semibold text-primary-800 dark:text-white">
                                                                    Rata 1: {offer.portOrigin} → {offer.portIntermediate}
                                                                </h5>
                                                                <span className="text-sm font-bold text-accent-500">
                                                                    ${(offer.freightPrice + offer.portAdjustment + offer.portTaxes).toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                    <p className="text-xs text-neutral-400 mb-1">Tarif Maritim</p>
                                                                    <p className="font-semibold text-primary-800 dark:text-white">${offer.freightPrice.toFixed(2)}</p>
                                                                </div>
                                                                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                    <p className="text-xs text-neutral-400 mb-1">Ajustare Port</p>
                                                                    <p className="font-semibold text-primary-800 dark:text-white">${offer.portAdjustment.toFixed(2)}</p>
                                                                </div>
                                                                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                    <p className="text-xs text-neutral-400 mb-1">Taxe Portuare</p>
                                                                    <p className="font-semibold text-primary-800 dark:text-white">${offer.portTaxes.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Admin: detailed Rata 2 */}
                                                        <div className="mb-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h5 className="text-sm font-semibold text-primary-800 dark:text-white">
                                                                    Rata 2: {offer.portIntermediate} → {offer.portFinal}
                                                                </h5>
                                                                <span className="text-sm font-bold text-accent-500">
                                                                    ${(offer.terrestrialTransport + offer.customsTaxes + offer.commission + (offer.insurance || 0)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                    <p className="text-xs text-neutral-400 mb-1">Transport Terestru</p>
                                                                    <p className="font-semibold text-primary-800 dark:text-white">${offer.terrestrialTransport.toFixed(2)}</p>
                                                                </div>
                                                                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                    <p className="text-xs text-neutral-400 mb-1">Taxe Vamale</p>
                                                                    <p className="font-semibold text-primary-800 dark:text-white">${offer.customsTaxes.toFixed(2)}</p>
                                                                </div>
                                                                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                    <p className="text-xs text-neutral-400 mb-1">Comision</p>
                                                                    <p className="font-semibold text-primary-800 dark:text-white">${offer.commission.toFixed(2)}</p>
                                                                </div>
                                                                {(offer.insurance || 0) > 0 && (
                                                                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                                                                        <p className="text-xs text-neutral-400 mb-1">Asigurare</p>
                                                                        <p className="font-semibold text-primary-800 dark:text-white">${offer.insurance.toFixed(2)}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    /* Client: simplified - only 2 blocks with subtotals */
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                                                                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                                                    {offer.portOrigin} → {offer.portIntermediate}
                                                                </h5>
                                                            </div>
                                                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                                                ${(offer.freightPrice + offer.portAdjustment + offer.portTaxes).toFixed(0)}
                                                            </p>
                                                            <p className="text-xs text-blue-500 mt-1">Transport maritim</p>
                                                        </div>
                                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                                                                <h5 className="text-sm font-semibold text-green-800 dark:text-green-300">
                                                                    {offer.portIntermediate} → {offer.portFinal}
                                                                </h5>
                                                            </div>
                                                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                                                ${(offer.terrestrialTransport + offer.customsTaxes + offer.commission + (offer.insurance || 0)).toFixed(0)}
                                                            </p>
                                                            <p className="text-xs text-green-500 mt-1">Transport terestru + vămuire</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <Button
                                                    variant="accent"
                                                    className="w-full mt-4"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectOffer(offer, index);
                                                    }}
                                                >
                                                    Selectează Această Ofertă
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-neutral-400 text-center py-2">
                                * Prețurile sunt orientative și pot varia în funcție de disponibilitate și condiții speciale.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PriceCalculator;
