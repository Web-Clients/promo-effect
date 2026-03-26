import React, { useState, useEffect } from 'react';
import { parseEmailWithGemini, checkAIStatus } from '../services/geminiService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SparklesIcon, PlusIcon, AlertCircleIcon } from './icons';
import { Booking } from '../types';

const sampleEmail = `Subject: Shipment Update - Container MSCU1234567

Dear Team,

Please find the update for the shipment under B/L: BL12345.
The container MSCU1234567 has been loaded onto vessel MAERSK ESSEX.

Departure date: 2025-10-25 from Port of Shanghai.
ETA at Constanta is now 2025-12-03.

Cargo Weight: 18500.00 kg
Volume: 28.5 CBM

Please arrange for customs clearance accordingly.

Best,
China Freight Forwarders`;

const SpinnerIcon = ({ large, isTextWhite = true }: { large?: boolean; isTextWhite?: boolean }) => (
  <svg
    className={`animate-spin ${large ? 'h-10 w-10' : 'h-5 w-5'} ${isTextWhite ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

interface EmailParserAssistantProps {
  onBookingCreate: (data: Partial<Booking>) => void;
}

const EmailParserAssistant = ({ onBookingCreate }: EmailParserAssistantProps) => {
  const [emailContent, setEmailContent] = useState('');
  const [parsedResult, setParsedResult] = useState('');
  const [parsedObject, setParsedObject] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<{ available: boolean; reason: string } | null>(null);

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus().then(setAiStatus);
  }, []);

  const handleParse = async () => {
    if (!emailContent.trim()) {
      setError('Conținutul emailului nu poate fi gol.');
      return;
    }
    setIsLoading(true);
    setError('');
    setParsedResult('');
    setParsedObject(null);

    const result = await parseEmailWithGemini(emailContent);
    try {
      const jsonResult = JSON.parse(result);
      if (jsonResult.error) {
        setError(jsonResult.error);
        setParsedResult(JSON.stringify(jsonResult, null, 2));
      } else {
        setParsedResult(JSON.stringify(jsonResult, null, 2));
        setParsedObject(jsonResult);
      }
    } catch {
      setError('Am primit un răspuns JSON invalid de la AI.');
      setParsedResult(result);
    }

    setIsLoading(false);
  };

  const handleCreateBooking = () => {
    if (!parsedObject) return;

    const mappedData: Partial<Booking> = {
      container_number: parsedObject.containerNumber,
      origin_port: parsedObject.portOfLoading,
      estimated_arrival_date: parsedObject.eta,
    };
    onBookingCreate(mappedData);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          Asistent AI pentru Analiza Emailurilor
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Lipiți un email de la un partener pentru a extrage automat informațiile cheie.
        </p>
      </div>

      {/* AI Status Warning */}
      {aiStatus && !aiStatus.available && (
        <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Serviciul AI nu este disponibil</p>
            <p className="text-sm">{aiStatus.reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="emailContent"
              className="text-lg font-semibold text-neutral-700 dark:text-neutral-200"
            >
              Conținut Email
            </label>
            <button
              onClick={() => setEmailContent(sampleEmail)}
              className="text-sm text-primary-600 hover:underline"
            >
              Încarcă Exemplu
            </button>
          </div>
          <textarea
            id="emailContent"
            className="flex-grow w-full p-3 border rounded-md font-mono text-sm bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Lipiți conținutul emailului aici..."
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            rows={15}
          ></textarea>
          <Button
            onClick={handleParse}
            disabled={isLoading || (aiStatus != null && !aiStatus.available)}
            loading={isLoading}
            className="w-full mt-4"
          >
            <SparklesIcon className="mr-2 h-4 w-4" />
            Analizează cu AI
          </Button>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
              Rezultat Analiză (JSON)
            </h4>
            <Button size="sm" onClick={handleCreateBooking} disabled={!parsedObject || isLoading}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Creează Rezervare
            </Button>
          </div>
          <div className="relative h-[450px]">
            {isLoading && (
              <div className="absolute inset-0 bg-neutral-50/80 dark:bg-neutral-800/80 flex items-center justify-center rounded-md">
                <div className="text-center text-neutral-500 dark:text-neutral-400">
                  <SpinnerIcon large isTextWhite={false} />
                  <p className="mt-2">Analiza în curs...</p>
                </div>
              </div>
            )}
            <pre className="w-full h-full p-3 border rounded-md bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 font-mono text-sm overflow-auto">
              {error && (
                <code className="text-red-500">
                  {error}\n\n{parsedResult}
                </code>
              )}
              {!error && parsedResult && <code>{parsedResult}</code>}
              {!parsedResult && !error && (
                <code className="text-neutral-400">Rezultatul va apărea aici...</code>
              )}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmailParserAssistant;
