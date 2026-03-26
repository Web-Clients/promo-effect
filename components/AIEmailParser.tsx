/**
 * AI Email Parser - Autopilot Dashboard
 *
 * Automatically reads emails from Gmail every 15 minutes,
 * finds container numbers in emails and PDF attachments,
 * and registers them in the database.
 */

import React, { useState, useEffect } from 'react';
import { useToast } from './ui/Toast';
import { MailIcon, SparklesIcon, CheckIcon, RefreshCwIcon, ShipIcon, PackageIcon } from './icons';
import emailParserService, { GmailStatus, RecentEmailContainer } from '../services/emailParser';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../utils/formatters';

const AIEmailParser: React.FC = () => {
  const { addToast } = useToast();

  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [recentContainers, setRecentContainers] = useState<RecentEmailContainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [status, aiStatus, recent] = await Promise.allSettled([
        emailParserService.getGmailStatus(),
        emailParserService.checkAIStatus(),
        emailParserService.getRecentContainers(),
      ]);

      if (status.status === 'fulfilled') setGmailStatus(status.value);
      if (aiStatus.status === 'fulfilled') setAiAvailable(aiStatus.value.available);
      if (recent.status === 'fulfilled') setRecentContainers(recent.value);
    } catch (err) {
      console.error('Failed to load email parser data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunNow = async () => {
    setIsFetching(true);
    try {
      const result = await emailParserService.fetchAndProcess(20);
      if (result.summary.fetched === 0) {
        addToast('Nu sunt email-uri noi de procesat', 'info');
      } else {
        addToast(
          `${result.summary.fetched} email-uri procesate, ${result.summary.bookingsCreated} containere înregistrate`,
          result.summary.failed > 0 ? 'warning' : 'success'
        );
      }
      await loadData();
    } catch (error: unknown) {
      addToast(getErrorMessage(error, 'Eroare la procesarea email-urilor'), 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const min = Math.floor(diff / 60000);
    const hours = Math.floor(min / 60);
    if (hours > 0) return `acum ${hours}h ${min % 60}m`;
    return `acum ${min}m`;
  };

  const lastRun = gmailStatus?.lastFetchResult;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            AI Email Parser
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Citește automat email-urile și înregistrează containerele din PDF-uri
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          title="Reîncarcă"
        >
          <RefreshCwIcon className={cn('h-5 w-5 text-neutral-500', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gmail Status */}
        <div
          className={cn(
            'rounded-xl border p-4 flex items-start gap-3',
            gmailStatus?.connected
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50'
          )}
        >
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              gmailStatus?.connected
                ? 'bg-green-100 dark:bg-green-800/30'
                : 'bg-red-100 dark:bg-red-800/30'
            )}
          >
            <MailIcon
              className={cn(
                'h-5 w-5',
                gmailStatus?.connected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Gmail
            </p>
            <p
              className={cn(
                'font-semibold text-sm mt-0.5',
                gmailStatus?.connected
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {gmailStatus?.connected
                ? 'Conectat'
                : gmailStatus === null
                  ? 'Se verifică...'
                  : 'Deconectat'}
            </p>
            {gmailStatus?.email && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {gmailStatus.email}
              </p>
            )}
          </div>
        </div>

        {/* AI Status */}
        <div
          className={cn(
            'rounded-xl border p-4 flex items-start gap-3',
            aiAvailable
              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50'
              : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
          )}
        >
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              aiAvailable
                ? 'bg-purple-100 dark:bg-purple-800/30'
                : 'bg-neutral-200 dark:bg-neutral-700'
            )}
          >
            <SparklesIcon
              className={cn(
                'h-5 w-5',
                aiAvailable ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-400'
              )}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Gemini AI
            </p>
            <p
              className={cn(
                'font-semibold text-sm mt-0.5',
                aiAvailable
                  ? 'text-purple-700 dark:text-purple-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              {aiAvailable === null
                ? 'Se verifică...'
                : aiAvailable
                  ? 'Disponibil'
                  : 'Indisponibil'}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">Parsare PDF + email</p>
          </div>
        </div>

        {/* Autopilot Status */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center flex-shrink-0">
            <div className="relative">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Autopilot
            </p>
            <p className="font-semibold text-sm text-blue-700 dark:text-blue-400 mt-0.5">
              Activ - la 15 min
            </p>
            {lastRun?.timestamp && (
              <p className="text-xs text-neutral-400 mt-0.5">
                Ultima rulare: {formatTimeAgo(lastRun.timestamp)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Last Run Result */}
      {lastRun && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-primary-800 dark:text-white">
              Ultima Rulare Automată
            </h2>
            <span className="text-xs text-neutral-400">{formatTime(lastRun.timestamp)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary-800 dark:text-white">
                {lastRun.emailsFetched}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Email-uri găsite
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {lastRun.emailsProcessed}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Procesate</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {lastRun.bookingsCreated}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Containere înreg.
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg p-3 text-center',
                lastRun.processingFailed > 0
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-neutral-50 dark:bg-neutral-700/50'
              )}
            >
              <p
                className={cn(
                  'text-2xl font-bold',
                  lastRun.processingFailed > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-neutral-400'
                )}
              >
                {lastRun.processingFailed}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Erori</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Trigger */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-primary-800 dark:text-white">Procesare Manuală</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Rulează acum fără să aștepți ciclul de 15 minute. Procesează max. 20 email-uri noi.
            </p>
          </div>
          <button
            onClick={handleRunNow}
            disabled={isFetching || !gmailStatus?.connected}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all',
              isFetching || !gmailStatus?.connected
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-primary-800 text-white hover:bg-primary-700 shadow-sm'
            )}
          >
            {isFetching ? (
              <>
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
                Se procesează...
              </>
            ) : (
              <>
                <MailIcon className="h-4 w-4" />
                Procesează Acum
              </>
            )}
          </button>
        </div>

        {!gmailStatus?.connected && !isLoading && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Gmail nu este conectat. Verificați variabilele de mediu:{' '}
              <code className="font-mono text-xs">GMAIL_EMAIL</code> și{' '}
              <code className="font-mono text-xs">GMAIL_APP_PASSWORD</code>
            </p>
          </div>
        )}
      </div>

      {/* Recent Registered Containers */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="font-semibold text-primary-800 dark:text-white">
            Containere Înregistrate din Email
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Containere detectate automat în email-uri și PDF-uri
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-4 border-primary-800 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-neutral-400">Se încarcă...</span>
          </div>
        ) : recentContainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
              <PackageIcon className="h-7 w-7 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
              Niciun container înregistrat din email încă.
              <br />
              <span className="text-xs text-neutral-400">
                Sistemul va procesa automat email-urile noi.
              </span>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {recentContainers.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <ShipIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-primary-800 dark:text-white">
                      {item.containerNumber || '—'}
                    </span>
                    {item.blNumber && (
                      <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                        BL: {item.blNumber}
                      </span>
                    )}
                    {item.confidence && (
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded font-medium',
                          item.confidence >= 80
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        )}
                      >
                        {item.confidence}%
                      </span>
                    )}
                  </div>
                  {item.emailSubject && (
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{item.emailSubject}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-neutral-400">{formatTime(item.createdAt)}</span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">Înregistrat</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-card p-5">
        <h2 className="font-semibold text-primary-800 dark:text-white mb-4">Cum funcționează</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            {
              icon: <MailIcon className="h-5 w-5 text-blue-500" />,
              title: 'La fiecare 15 min',
              desc: 'Verifică email-urile necitite',
            },
            {
              icon: <SparklesIcon className="h-5 w-5 text-purple-500" />,
              title: 'AI analizează',
              desc: 'Citește email + PDF/documente',
            },
            {
              icon: <PackageIcon className="h-5 w-5 text-orange-500" />,
              title: 'Găsește containere',
              desc: 'Extrage nr. container și BL',
            },
            {
              icon: <CheckIcon className="h-5 w-5 text-green-500" />,
              title: 'Înregistrează',
              desc: 'Adaugă în baza de date',
            },
          ].map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {step.title}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIEmailParser;
