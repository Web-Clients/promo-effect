import React, { useState, useEffect } from 'react';
import {
    getAgentPrices,
    createAgentPrice,
    updateAgentPrice,
    deleteAgentPrice,
    Agent,
    AgentPrice
} from '../services/agents';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { cn } from '../lib/utils';
import { AgentPriceInput } from '../services/agentPortal';

// Reuse constants from AgentPricesDashboard for consistency
const SHIPPING_LINES = ['MSC', 'Maersk', 'Hapag-Lloyd', 'CMA CGM', 'Cosco', 'Yangming'];
const PORTS = ['Shanghai', 'Ningbo', 'Qingdao', 'Shenzhen', 'Guangzhou', 'Xiamen'];
const CONTAINER_TYPES = ['20ft', '40ft', '40ft HC'];
const WEIGHT_RANGES = ['1-5 tone', '5-10 tone', '10-15 tone', '15-20 tone', '20-24 tone'];

interface Props {
    agent: Agent;
    onClose: () => void;
}

export function AgentPriceManager({ agent, onClose }: Props) {
    const [prices, setPrices] = useState<AgentPrice[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingPrice, setEditingPrice] = useState<AgentPrice | null>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const [formData, setFormData] = useState<AgentPriceInput>({
        freightPrice: 0,
        shippingLine: SHIPPING_LINES[0],
        portOrigin: PORTS[0],
        containerType: CONTAINER_TYPES[0],
        weightRange: WEIGHT_RANGES[0],
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: '',
    });

    useEffect(() => {
        loadPrices();
    }, [agent.id]);

    const loadPrices = async () => {
        setLoading(true);
        try {
            const data = await getAgentPrices(agent.id);
            setPrices(data);
        } catch (err: any) {
            addToast(err.message || 'Eroare la încărcarea prețurilor', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (price: AgentPrice) => {
        setEditingPrice(price);
        setFormData({
            freightPrice: price.freightPrice,
            shippingLine: price.shippingLine,
            portOrigin: price.portOrigin,
            containerType: price.containerType,
            weightRange: price.weightRange,
            validFrom: price.validFrom.split('T')[0],
            validUntil: price.validUntil.split('T')[0],
            departureDate: price.departureDate.split('T')[0],
            reason: (price as any).reason || '', // Cast as any because frontend AgentPrice interface might lack reason
        });
        setShowForm(true);
    };

    const handleDelete = async (priceId: string) => {
        if (!confirm('Sigur doriți să ștergeți acest preț?')) return;
        try {
            await deleteAgentPrice(agent.id, priceId);
            addToast('Prețul a fost șters', 'success');
            loadPrices();
        } catch (err: any) {
            addToast(err.message || 'Eroare la ștergere', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPrice) {
                await updateAgentPrice(agent.id, editingPrice.id, formData);
                addToast('Prețul a fost actualizat', 'success');
            } else {
                await createAgentPrice(agent.id, formData);
                addToast('Prețul a fost creat', 'success');
            }
            setShowForm(false);
            setEditingPrice(null);
            loadPrices();
        } catch (err: any) {
            addToast(err.message || 'Eroare la salvare', 'error');
        }
    };

    const resetForm = () => {
        setEditingPrice(null);
        setFormData({
            freightPrice: 0,
            shippingLine: SHIPPING_LINES[0],
            portOrigin: PORTS[0],
            containerType: CONTAINER_TYPES[0],
            weightRange: WEIGHT_RANGES[0],
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reason: '',
        });
        setShowForm(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-primary-800 dark:text-white">
                            Gestionare Prețuri - {agent.company}
                        </h2>
                        <p className="text-sm text-neutral-500">Agent Code: {agent.agentCode}</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {!showForm ? (
                        <>
                            <div className="flex justify-end mb-4">
                                <Button variant="accent" onClick={resetForm}>
                                    + Adaugă Preț Nou
                                </Button>
                            </div>

                            {loading ? (
                                <div className="text-center py-10">Se încarcă...</div>
                            ) : prices.length === 0 ? (
                                <div className="text-center py-10 text-neutral-500">Acest agent nu are prețuri definite.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                                            <tr>
                                                <th className="p-3 font-medium text-neutral-500">Linie / Port</th>
                                                <th className="p-3 font-medium text-neutral-500">Container / Greutate</th>
                                                <th className="p-3 font-medium text-neutral-500">Validitate</th>
                                                <th className="p-3 font-medium text-neutral-500 text-right">Preț</th>
                                                <th className="p-3 font-medium text-neutral-500 text-center">Acțiuni</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                            {prices.map((price) => (
                                                <tr key={price.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                                    <td className="p-3">
                                                        <div className="font-medium text-primary-800 dark:text-white">{price.shippingLine}</div>
                                                        <div className="text-neutral-500">{price.portOrigin}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-neutral-800 dark:text-neutral-200">{price.containerType}</div>
                                                        <div className="text-neutral-500 text-xs">{price.weightRange}</div>
                                                    </td>
                                                    <td className="p-3 text-xs text-neutral-500">
                                                        <div>{new Date(price.validFrom).toLocaleDateString()} - {new Date(price.validUntil).toLocaleDateString()}</div>
                                                        <div>Plecare: {new Date(price.departureDate).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-accent-500">
                                                        ${price.freightPrice}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleEdit(price)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Editează"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(price.id)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                                title="Șterge"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-neutral-500 hover:text-primary-800" onClick={() => setShowForm(false)}>
                                ← Înapoi la listă
                            </div>

                            <h3 className="text-lg font-bold mb-4">{editingPrice ? 'Editare Preț' : 'Adăugare Preț Nou'}</h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Linie Maritimă</label>
                                        <select
                                            value={formData.shippingLine}
                                            onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        >
                                            {SHIPPING_LINES.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Port Origine</label>
                                        <select
                                            value={formData.portOrigin}
                                            onChange={(e) => setFormData({ ...formData, portOrigin: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        >
                                            {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Tip Container</label>
                                        <select
                                            value={formData.containerType}
                                            onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        >
                                            {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Greutate</label>
                                        <select
                                            value={formData.weightRange}
                                            onChange={(e) => setFormData({ ...formData, weightRange: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        >
                                            {WEIGHT_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Preț Freight (USD)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.freightPrice}
                                        onChange={(e) => setFormData({ ...formData, freightPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border rounded-lg"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Valid De La</label>
                                        <input
                                            type="date"
                                            value={formData.validFrom}
                                            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Valid Până La</label>
                                        <input
                                            type="date"
                                            value={formData.validUntil}
                                            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data Plecării</label>
                                        <input
                                            type="date"
                                            value={formData.departureDate}
                                            onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                                            className="w-full p-2 border rounded-lg"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Notă / Motiv (Opțional)</label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Anulează</Button>
                                    <Button type="submit" variant="accent">Salvează</Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
