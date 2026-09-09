/**
 * Agent Prices Dashboard
 * Allows Chinese agents to manage their shipping prices
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatWeek, parseWeek, weekToDate } from '../utils/isoWeek';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import agentPortalService, {
  AgentProfile,
  AgentPrice,
  AgentPriceInput,
  AgentStats,
} from '../services/agentPortal';
import portsService from '../services/ports';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../utils/formatters';
import { useConfirm } from '../hooks/useConfirm';

// Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <ClockIcon />,
  APPROVED: <CheckIcon />,
  REJECTED: <XIcon />,
};

// Status wording is translated at render time — a Chinese agent reads this
// page, and a module-level constant cannot see the active language.
const STATUS_KEYS: Record<string, string> = {
  PENDING: 'agentPortal.status.PENDING',
  APPROVED: 'agentPortal.status.APPROVED',
  REJECTED: 'agentPortal.status.REJECTED',
};

// Available options
const SHIPPING_LINES = ['MSC', 'Maersk', 'Hapag-Lloyd', 'CMA CGM', 'Cosco', 'Yangming'];
// Used only until /agent-portal/vocabulary answers, and if it never does.
const FALLBACK_CONTAINER_TYPES = ['20DV', '40DV', '40HC', '40HQ'];
const FALLBACK_WEIGHT_RANGES = ['<23', '23-24', '24-25', '25-26', '26-27', '27-28'];
// Fallback ports if API fails
/**
 * An expired rate is the agent's problem to fix, so it has to be visible on his
 * own screen. The calculator refuses to quote it — silently, from his point of
 * view — and Ion's complaint about being offered a rate that had lapsed came
 * from exactly this blind spot.
 */
function isExpired(validUntil?: string | Date | null): boolean {
  if (!validUntil) return false;
  const d = new Date(validUntil);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function expiryClass(validUntil?: string | Date | null): string {
  return isExpired(validUntil) ? 'text-red-600 dark:text-red-400 line-through' : '';
}

/**
 * A short date in the reader's own conventions. A Chinese agent should see
 * 9月15日, not "15 Sept"; the locale follows the active UI language rather than
 * the browser's, because the two diverge the moment anyone switches.
 */
function shortDate(value: string | Date | null | undefined, locale: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

/** BCP-47 tag for a UI language code. */
function dateLocale(language: string): string {
  const base = (language || 'ro').split('-')[0];
  return (
    ({ ro: 'ro-RO', ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN' } as Record<string, string>)[base] ||
    'en-GB'
  );
}

const FALLBACK_PORTS = ['Shanghai', 'Ningbo', 'Qingdao', 'Shenzhen', 'Guangzhou', 'Xiamen'];

const AgentPricesDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.language);
  const { confirm: confirmDialog, ConfirmDialogNode } = useConfirm();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [prices, setPrices] = useState<AgentPrice[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Ports loaded from API
  const [originPorts, setOriginPorts] = useState<string[]>(FALLBACK_PORTS);

  // Container labels and weight bands come from the pricing tables. Hardcoding
  // them is what let the form offer '40ft HC' against a database speaking
  // '40HQ': the rate saved fine and no quote could ever match it.
  const [containerTypes, setContainerTypes] = useState<string[]>(FALLBACK_CONTAINER_TYPES);
  const [weightRanges, setWeightRanges] = useState<string[]>(FALLBACK_WEIGHT_RANGES);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<AgentPrice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Free-text week box beside the departure date; see applyWeek.
  const [weekInput, setWeekInput] = useState('');

  // Form state
  const [formData, setFormData] = useState<AgentPriceInput>({
    freightPrice: 0,
    shippingLine: SHIPPING_LINES[0],
    portOrigin: FALLBACK_PORTS[0],
    containerType: FALLBACK_CONTAINER_TYPES[0],
    weightRange: FALLBACK_WEIGHT_RANGES[0],
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
  });

  const { addToast } = useToast();

  // Load ports from API
  useEffect(() => {
    const loadPorts = async () => {
      try {
        const ports = await portsService.getOriginPorts();
        if (ports.length > 0) {
          const portNames = ports.map((p) => p.name);
          setOriginPorts(portNames);
        }
      } catch (err) {
        console.warn('Failed to load ports, using fallback:', err);
      }
    };
    loadPorts();

    const loadVocabulary = async () => {
      try {
        const v = await agentPortalService.getAgentVocabulary();
        if (v.containerTypes?.length) setContainerTypes(v.containerTypes);
        if (v.weightRanges?.length) setWeightRanges(v.weightRanges);
      } catch (err) {
        console.warn('Failed to load vocabulary, using fallback:', err);
      }
    };
    loadVocabulary();
  }, []);

  /**
   * Turn what was typed in the week box into a departure date.
   *
   * Deliberately silent on nonsense: the box is an accelerator, not a required
   * field, so a stray character must not block the form. An unparseable value
   * simply leaves the date alone.
   */
  const applyWeek = () => {
    const parsed = parseWeek(weekInput);
    if (!parsed) return;
    const monday = weekToDate(parsed.week, parsed.year);
    setFormData((prev) => ({ ...prev, departureDate: monday.toISOString().slice(0, 10) }));
    setWeekInput('');
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [profileData, pricesData, statsData] = await Promise.all([
        agentPortalService.getAgentProfile(),
        agentPortalService.getAgentPrices(filterStatus ? { status: filterStatus } : undefined),
        agentPortalService.getAgentStats(),
      ]);

      setProfile(profileData);
      setPrices(pricesData);
      setStats(statsData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  // Load data
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (price?: AgentPrice) => {
    if (price) {
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
        reason: price.reason || '',
      });
    } else {
      setEditingPrice(null);
      setFormData({
        freightPrice: 0,
        shippingLine: SHIPPING_LINES[0],
        portOrigin: originPorts[0] || FALLBACK_PORTS[0],
        containerType: FALLBACK_CONTAINER_TYPES[0],
        weightRange: FALLBACK_WEIGHT_RANGES[0],
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPrice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Date-order guards
    if (new Date(formData.validUntil) < new Date(formData.validFrom)) {
      addToast(t('agentPortal.validation.validUntilBeforeFrom'), 'error');
      return;
    }
    if (new Date(formData.departureDate) < new Date(formData.validFrom)) {
      addToast(t('agentPortal.validation.departureBeforeFrom'), 'error');
      return;
    }
    setIsSaving(true);

    try {
      if (editingPrice) {
        await agentPortalService.updatePrice(editingPrice.id, formData);
        addToast(t('agentPortal.msg.updated'), 'success');
      } else {
        await agentPortalService.submitPrice(formData);
        addToast(t('agentPortal.msg.created'), 'success');
      }
      handleCloseModal();
      loadData();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, t('errors.saving')), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (priceId: string) => {
    const ok = await confirmDialog({
      title: t('agentPortal.msg.deleteTitle'),
      message: t('agentPortal.msg.deleteConfirm'),
      variant: 'danger',
      confirmText: t('agentPortal.delete'),
    });
    if (!ok) return;

    try {
      await agentPortalService.deletePrice(priceId);
      addToast(t('agentPortal.msg.deleted'), 'success');
      loadData();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, t('errors.deleting')), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-xl">
        <p className="text-error-700 dark:text-error-400">{error}</p>
        <Button variant="secondary" onClick={loadData} className="mt-4">
          {t('agentPortal.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogNode}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            {t('agentPortal.title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {profile?.company} ({profile?.agentCode})
          </p>
        </div>
        <Button variant="accent" onClick={() => handleOpenModal()}>
          <PlusIcon />
          <span className="ml-2">{t('agentPortal.addPrice')}</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-card border border-neutral-200/50 dark:border-neutral-700/50">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('agentPortal.stats.total')}
            </p>
            <p className="text-2xl font-bold text-primary-800 dark:text-white">
              {stats.prices.total}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-500/20">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {t('agentPortal.stats.pending')}
            </p>
            <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
              {stats.prices.pending}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200/50 dark:border-green-500/20">
            <p className="text-sm text-green-700 dark:text-green-400">
              {t('agentPortal.stats.approved')}
            </p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300">
              {stats.prices.approved}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200/50 dark:border-red-500/20">
            <p className="text-sm text-red-700 dark:text-red-400">
              {t('agentPortal.stats.rejected')}
            </p>
            <p className="text-2xl font-bold text-red-800 dark:text-red-300">
              {stats.prices.rejected}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { value: '', label: t('agentPortal.tabs.all') },
            { value: 'PENDING', label: t('agentPortal.tabs.pending') },
            { value: 'APPROVED', label: t('agentPortal.tabs.approved') },
            { value: 'REJECTED', label: t('agentPortal.tabs.rejected') },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                filterStatus === tab.value
                  ? 'bg-primary-800 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prices Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
        {prices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-500 dark:text-neutral-400">{t('agentPortal.noPrices')}</p>
            <Button variant="accent" onClick={() => handleOpenModal()} className="mt-4">
              <PlusIcon />
              <span className="ml-2">{t('agentPortal.addFirstPrice')}</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.line')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.port')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.container')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.form.weight')}
                  </th>
                  <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.price')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.validity')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.departure')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.status')}
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t('agentPortal.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {prices.map((price) => (
                  <tr key={price.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                    <td className="p-4 font-medium text-primary-800 dark:text-white">
                      {price.shippingLine}
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-300">
                      {price.portOrigin}
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-300">
                      {price.containerType}
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-300">
                      {price.weightRange}
                    </td>
                    <td className="p-4 text-right font-semibold text-accent-500">
                      ${price.freightPrice}
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                      <span className={expiryClass(price.validUntil)}>
                        {shortDate(price.validFrom, locale)} – {shortDate(price.validUntil, locale)}
                      </span>
                      {isExpired(price.validUntil) && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {t('agentPortal.expired')}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                      {shortDate(price.departureDate, locale)}
                      {price.departureDate && (
                        <span className="ml-1.5 text-xs text-neutral-400">
                          {formatWeek(new Date(price.departureDate))}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          statusColors[price.approvalStatus]
                        )}
                      >
                        {statusIcons[price.approvalStatus]}
                        {t(STATUS_KEYS[price.approvalStatus] || 'agentPortal.status.PENDING')}
                      </span>
                      {price.rejectionReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {price.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(price)}
                          className="p-2 text-neutral-500 hover:text-primary-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                          title={t('agentPortal.edit')}
                        >
                          <EditIcon />
                        </button>
                        {price.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleDelete(price.id)}
                            className="p-2 text-neutral-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors"
                            title={t('agentPortal.delete')}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold text-primary-800 dark:text-white">
                {editingPrice ? t('agentPortal.editPrice') : t('agentPortal.addNewPrice')}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {editingPrice
                  ? t('agentPortal.msg.changeWillBeApproved')
                  : t('agentPortal.msg.willBeApproved')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.shippingLine')}
                  </label>
                  <select
                    value={formData.shippingLine}
                    onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                  >
                    {SHIPPING_LINES.map((line) => (
                      <option key={line} value={line}>
                        {line}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.portOrigin')}
                  </label>
                  <select
                    value={formData.portOrigin}
                    onChange={(e) => setFormData({ ...formData, portOrigin: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                  >
                    {originPorts.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.containerType')}
                  </label>
                  <select
                    value={formData.containerType}
                    onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                  >
                    {containerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.weight')}
                  </label>
                  <select
                    value={formData.weightRange}
                    onChange={(e) => setFormData({ ...formData, weightRange: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                  >
                    {weightRanges.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('agentPortal.form.price')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.freightPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      freightPrice: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.validFrom')}
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.validUntil')}
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                    min={formData.validFrom}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('agentPortal.form.departureDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                    required
                  />
                  {/* Agents quote in weeks — "3000 USD / wk 24" — so accept a
                      week here rather than making them look up the dates. */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={weekInput}
                      onChange={(e) => setWeekInput(e.target.value)}
                      onBlur={() => applyWeek()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyWeek();
                        }
                      }}
                      placeholder={t('agentPortal.form.weekPlaceholder')}
                      aria-label={t('agentPortal.form.weekLabel')}
                      className="w-28 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-400">
                      {formData.departureDate
                        ? formatWeek(new Date(formData.departureDate))
                        : t('agentPortal.form.weekHint')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('agentPortal.form.notes')}
                </label>
                <textarea
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg resize-none"
                  rows={2}
                  placeholder={t('agentPortal.form.notesPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  {t('agentPortal.cancel')}
                </Button>
                <Button type="submit" variant="accent" disabled={isSaving}>
                  {isSaving
                    ? t('agentPortal.saving')
                    : editingPrice
                      ? t('agentPortal.update')
                      : t('agentPortal.submitForApproval')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AgentPricesDashboard);
