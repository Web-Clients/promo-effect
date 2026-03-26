/**
 * Admin Price Approval Component
 * Allows administrators to approve or reject agent-submitted prices
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import agentPortalService, { PendingPriceWithAgent, ApprovalStats } from '../services/agentPortal';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../utils/formatters';

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const AdminPriceApproval: React.FC = () => {
  const [pendingPrices, setPendingPrices] = useState<PendingPriceWithAgent[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingPriceId, setRejectingPriceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { addToast } = useToast();

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [pricesData, statsData] = await Promise.all([
        agentPortalService.getPendingPrices(),
        agentPortalService.getApprovalStats(),
      ]);

      setPendingPrices(pricesData);
      setStats(statsData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load pending prices'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (priceId: string) => {
    setProcessingId(priceId);

    try {
      await agentPortalService.approvePrice(priceId);
      addToast('Prețul a fost aprobat', 'success');
      loadData();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Eroare la aprobare'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (priceId: string) => {
    setRejectingPriceId(priceId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingPriceId || !rejectionReason.trim()) {
      addToast('Motivul respingerii este obligatoriu', 'error');
      return;
    }

    setProcessingId(rejectingPriceId);

    try {
      await agentPortalService.rejectPrice(rejectingPriceId, rejectionReason);
      addToast('Prețul a fost respins', 'success');
      setShowRejectModal(false);
      setRejectingPriceId(null);
      setRejectionReason('');
      loadData();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Eroare la respingere'), 'error');
    } finally {
      setProcessingId(null);
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
          Reîncearcă
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            Aprobare Prețuri
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Aprobați sau respingeți prețurile trimise de agenți
          </p>
        </div>
        <Button variant="secondary" onClick={loadData}>
          <RefreshIcon />
          <span className="ml-2">Actualizează</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                <ClockIcon />
              </div>
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">În Așteptare</p>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                  {stats.pending}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200/50 dark:border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckIcon />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-400">Aprobate Azi</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {stats.approvedToday}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200/50 dark:border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <XIcon />
              </div>
              <div>
                <p className="text-sm text-red-700 dark:text-red-400">Respinse Azi</p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                  {stats.rejectedToday}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Prices List */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
        {pendingPrices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckIcon />
            </div>
            <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">
              Totul este aprobat!
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Nu există prețuri în așteptare pentru aprobare
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {pendingPrices.map((price) => (
              <div
                key={price.id}
                className={cn(
                  'p-5 transition-colors',
                  processingId === price.id && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Agent Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-800 dark:text-primary-400 font-semibold">
                        {price.agent.company.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-primary-800 dark:text-white">
                          {price.agent.company}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {price.agent.user.name} ({price.agent.user.email})
                        </p>
                      </div>
                    </div>

                    {/* Price Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <div>
                        <p className="text-xs text-neutral-500 uppercase">Linie</p>
                        <p className="font-medium text-primary-800 dark:text-white">
                          {price.shippingLine}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 uppercase">Port</p>
                        <p className="font-medium text-primary-800 dark:text-white">
                          {price.portOrigin}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 uppercase">Container</p>
                        <p className="font-medium text-primary-800 dark:text-white">
                          {price.containerType}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 uppercase">Greutate</p>
                        <p className="font-medium text-primary-800 dark:text-white">
                          {price.weightRange}
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                      <span className="text-neutral-500">
                        Valid: {new Date(price.validFrom).toLocaleDateString('ro-RO')} -{' '}
                        {new Date(price.validUntil).toLocaleDateString('ro-RO')}
                      </span>
                      <span className="text-neutral-500">
                        Plecare: {new Date(price.departureDate).toLocaleDateString('ro-RO')}
                      </span>
                      {price.reason && (
                        <span className="text-neutral-500 italic">"{price.reason}"</span>
                      )}
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-3xl font-bold text-accent-500">${price.freightPrice}</p>
                      <p className="text-xs text-neutral-500">Preț freight propus</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleApprove(price.id)}
                        disabled={processingId === price.id}
                      >
                        <CheckIcon />
                        <span className="ml-1">Aprobă</span>
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleOpenRejectModal(price.id)}
                        disabled={processingId === price.id}
                      >
                        <XIcon />
                        <span className="ml-1">Respinge</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-semibold text-primary-800 dark:text-white">
                Respinge Preț
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Introduceți motivul respingerii - acesta va fi trimis agentului
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg resize-none"
                rows={4}
                placeholder="Ex: Prețul este prea mare comparativ cu piața actuală..."
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingPriceId(null);
                  setRejectionReason('');
                }}
              >
                Anulează
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === rejectingPriceId}
              >
                Respinge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPriceApproval;
