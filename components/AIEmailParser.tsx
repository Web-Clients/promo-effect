/**
 * AI Email Parser Component
 *
 * Parses forwarded shipping emails using Gemini AI
 * Extracts container info, shipping details, ports, dates
 * Can search for existing containers or create new ones
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import {
  MailIcon,
  SparklesIcon,
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
  PlusIcon,
  CopyIcon,
  RefreshCwIcon,
  ShipIcon,
  CalendarIcon,
  MapPinIcon,
  PackageIcon,
  UserIcon,
  PhoneIcon,
} from './icons';
import emailParserService, { ParsedEmailData, EmailProcessingResult } from '../services/emailParser';

interface ExtractedField {
  label: string;
  value: string | undefined;
  icon: React.ReactNode;
}

const AIEmailParser: React.FC = () => {
  const { addToast } = useToast();

  // State
  const [emailContent, setEmailContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEmailData | null>(null);
  const [processingResult, setProcessingResult] = useState<EmailProcessingResult | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'parse' | 'queue' | 'stats'>('parse');
  const [stats, setStats] = useState<any>(null);
  const [pendingEmails, setPendingEmails] = useState<any[]>([]);

  // Check AI availability on mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const status = await emailParserService.checkAIStatus();
      setAiAvailable(status.available);
      if (!status.available) {
        addToast(`AI недоступен: ${status.reason}`, 'warning');
      }
    } catch (error) {
      setAiAvailable(false);
      console.error('Failed to check AI status:', error);
    }
  };

  // Parse email with AI only (quick preview)
  const handleQuickParse = async () => {
    if (!emailContent.trim()) {
      addToast('Введите содержимое email', 'error');
      return;
    }

    setIsParsing(true);
    setParsedData(null);
    setProcessingResult(null);

    try {
      const result = await emailParserService.parseWithAI(emailContent);

      if (result.success && result.data) {
        setParsedData(result.data);
        addToast(`Данные извлечены (уверенность: ${result.confidence}%)`, 'success');
      } else {
        addToast(result.error || 'Не удалось извлечь данные', 'error');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      addToast(error.message || 'Ошибка парсинга', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Full processing with container search/creation
  const handleFullProcess = async (autoCreate: boolean = false) => {
    if (!emailContent.trim()) {
      addToast('Введите содержимое email', 'error');
      return;
    }

    setIsLoading(true);
    setProcessingResult(null);

    try {
      const result = await emailParserService.processEmail(
        {
          subject: 'Forwarded email',
          body: emailContent,
        },
        autoCreate,
        70 // minConfidence
      );

      setProcessingResult(result);
      if (result.extractedData) {
        setParsedData(result.extractedData);
      }

      if (result.status === 'SUCCESS') {
        if (result.containerId) {
          addToast(`Контейнер ${result.containerId ? 'найден/создан' : 'не найден'}`, 'success');
        } else {
          addToast('Данные извлечены успешно', 'success');
        }
      } else if (result.status === 'NEEDS_REVIEW') {
        addToast('Требуется ручная проверка данных', 'warning');
      } else {
        addToast(result.error || 'Обработка не удалась', 'error');
      }
    } catch (error: any) {
      console.error('Process error:', error);
      addToast(error.message || 'Ошибка обработки', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const data = await emailParserService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Load pending emails
  const loadPendingEmails = async () => {
    try {
      const data = await emailParserService.getPendingEmails();
      setPendingEmails(data.emails || []);
    } catch (error) {
      console.error('Failed to load pending emails:', error);
    }
  };

  // Process queue
  const handleProcessQueue = async () => {
    setIsLoading(true);
    try {
      const result = await emailParserService.processQueue(true, 70);
      addToast(
        `Обработано: ${result.summary.success} успешно, ${result.summary.failed} ошибок`,
        result.summary.failed > 0 ? 'warning' : 'success'
      );
      loadPendingEmails();
      loadStats();
    } catch (error: any) {
      addToast(error.message || 'Ошибка обработки очереди', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setEmailContent(text);
      addToast('Текст вставлен из буфера обмена', 'success');
    } catch (error) {
      addToast('Не удалось вставить из буфера обмена', 'error');
    }
  };

  // Clear all
  const handleClear = () => {
    setEmailContent('');
    setParsedData(null);
    setProcessingResult(null);
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence: number) => {
    const color = confidence >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : confidence >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {confidence}% уверенность
      </span>
    );
  };

  // Build extracted fields array
  const getExtractedFields = (): ExtractedField[] => {
    if (!parsedData) return [];

    return [
      { label: 'Номер контейнера', value: parsedData.containerNumber, icon: <PackageIcon className="h-4 w-4" /> },
      { label: 'Bill of Lading', value: parsedData.billOfLading, icon: <CopyIcon className="h-4 w-4" /> },
      { label: 'Shipping Line', value: parsedData.shippingLine, icon: <ShipIcon className="h-4 w-4" /> },
      { label: 'Судно', value: parsedData.vesselName, icon: <ShipIcon className="h-4 w-4" /> },
      { label: 'Voyage', value: parsedData.voyageNumber, icon: <MapPinIcon className="h-4 w-4" /> },
      { label: 'Порт загрузки', value: parsedData.portOfLoading, icon: <MapPinIcon className="h-4 w-4" /> },
      { label: 'Порт выгрузки', value: parsedData.portOfDischarge, icon: <MapPinIcon className="h-4 w-4" /> },
      { label: 'Дата отправления', value: parsedData.departureDate, icon: <CalendarIcon className="h-4 w-4" /> },
      { label: 'ETA', value: parsedData.eta, icon: <CalendarIcon className="h-4 w-4" /> },
      { label: 'Тип контейнера', value: parsedData.containerType, icon: <PackageIcon className="h-4 w-4" /> },
      { label: 'Вес', value: parsedData.weight, icon: <PackageIcon className="h-4 w-4" /> },
      { label: 'Описание груза', value: parsedData.cargoDescription, icon: <PackageIcon className="h-4 w-4" /> },
      { label: 'Поставщик', value: parsedData.supplierName, icon: <UserIcon className="h-4 w-4" /> },
      { label: 'Телефон поставщика', value: parsedData.supplierPhone, icon: <PhoneIcon className="h-4 w-4" /> },
      { label: 'Email поставщика', value: parsedData.supplierEmail, icon: <MailIcon className="h-4 w-4" /> },
    ].filter(f => f.value);
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'queue') {
      loadPendingEmails();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <SparklesIcon className="h-7 w-7 text-primary-500" />
            AI Email Parser
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Извлечение данных о контейнерах из email с помощью Gemini AI
          </p>
        </div>

        {/* AI Status Badge */}
        {aiAvailable !== null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            aiAvailable
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {aiAvailable ? (
              <>
                <CheckIcon className="h-4 w-4" />
                Gemini AI готов
              </>
            ) : (
              <>
                <AlertCircleIcon className="h-4 w-4" />
                AI недоступен
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('parse')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'parse'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <MailIcon className="h-4 w-4 inline mr-2" />
          Парсинг Email
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'queue'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <RefreshCwIcon className="h-4 w-4 inline mr-2" />
          Очередь ({pendingEmails.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'stats'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <SparklesIcon className="h-4 w-4 inline mr-2" />
          Статистика
        </button>
      </div>

      {/* Parse Tab */}
      {activeTab === 'parse' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                Содержимое Email
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePaste}>
                  <CopyIcon className="h-4 w-4 mr-1" />
                  Вставить
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Очистить
                </Button>
              </div>
            </div>

            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder={`Вставьте содержимое email от партнёров из Китая...

Пример:
Subject: Booking Confirmation - MSCU1234567
From: shipping@partner.cn

Dear Promo-Efect,

Please find below the shipping details:
Container: MSCU1234567
B/L: MEDUEN123456789
Vessel: MSC OSCAR
ETD: 2025-02-10
ETA: 2025-03-15
Port of Loading: Shanghai
Port of Discharge: Constanta
Weight: 18,500 kg
Commodity: Furniture

Best regards,
China Shipping Partner`}
              className="w-full h-80 p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleQuickParse}
                disabled={isParsing || !emailContent.trim() || !aiAvailable}
                loading={isParsing}
                className="flex-1"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Быстрый парсинг (AI)
              </Button>
              <Button
                onClick={() => handleFullProcess(false)}
                disabled={isLoading || !emailContent.trim()}
                loading={isLoading}
                variant="outline"
                className="flex-1"
              >
                <SearchIcon className="h-4 w-4 mr-2" />
                Поиск контейнера
              </Button>
            </div>

            <Button
              onClick={() => handleFullProcess(true)}
              disabled={isLoading || !emailContent.trim()}
              variant="primary"
              className="w-full mt-3"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Обработать и создать контейнер
            </Button>
          </Card>

          {/* Results Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
              Извлечённые данные
            </h2>

            {!parsedData && !processingResult && (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
                <SparklesIcon className="h-12 w-12 mb-3" />
                <p className="text-sm">Вставьте email и нажмите "Парсинг"</p>
              </div>
            )}

            {parsedData && (
              <div className="space-y-4">
                {/* Confidence Score */}
                {parsedData.confidence !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Уверенность AI
                    </span>
                    {getConfidenceBadge(parsedData.confidence)}
                  </div>
                )}

                {/* Processing Result */}
                {processingResult && (
                  <div className={`p-3 rounded-lg ${
                    processingResult.status === 'SUCCESS'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : processingResult.status === 'NEEDS_REVIEW'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 text-sm">
                      {processingResult.status === 'SUCCESS' && <CheckIcon className="h-4 w-4 text-green-600" />}
                      {processingResult.status === 'NEEDS_REVIEW' && <AlertCircleIcon className="h-4 w-4 text-yellow-600" />}
                      {processingResult.status === 'FAILED' && <AlertCircleIcon className="h-4 w-4 text-red-600" />}
                      <span className="font-medium">
                        {processingResult.status === 'SUCCESS' && 'Успешно обработано'}
                        {processingResult.status === 'NEEDS_REVIEW' && 'Требуется проверка'}
                        {processingResult.status === 'FAILED' && 'Ошибка обработки'}
                      </span>
                    </div>
                    {processingResult.containerId && (
                      <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">
                        Container ID: {processingResult.containerId}
                      </p>
                    )}
                    {processingResult.bookingId && (
                      <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">
                        Booking ID: {processingResult.bookingId}
                      </p>
                    )}
                    <p className="text-xs mt-1 text-neutral-500">
                      Время обработки: {processingResult.processingTime}ms
                    </p>
                  </div>
                )}

                {/* Extracted Fields */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getExtractedFields().map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                    >
                      <span className="text-neutral-400">{field.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {field.label}
                        </p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                          {field.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error display */}
                {parsedData.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {parsedData.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              Очередь обработки
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadPendingEmails}>
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                Обновить
              </Button>
              <Button
                onClick={handleProcessQueue}
                disabled={isLoading || pendingEmails.length === 0}
                loading={isLoading}
              >
                Обработать все
              </Button>
            </div>
          </div>

          {pendingEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <MailIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">Очередь пуста</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEmails.map((email) => (
                <div
                  key={email.id}
                  className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-800 dark:text-neutral-100 truncate">
                        {email.subject}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        От: {email.from}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {new Date(email.receivedAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      email.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : email.status === 'PROCESSED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {email.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Всего обработано</p>
            <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">
              {stats?.totalProcessed || 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Успешно</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
              {stats?.successCount || 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Требуют проверки</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {stats?.reviewCount || 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Ошибки</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
              {stats?.failedCount || 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Авто-создано букингов</p>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-1">
              {stats?.autoCreatedBookings || 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Средняя уверенность</p>
            <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">
              {stats?.averageConfidence || 0}%
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AIEmailParser;
