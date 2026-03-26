import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PlusIcon } from '../icons';
import trackingService, { EventType, TrackingEventInput } from '../../services/tracking';
import { getErrorMessage } from '../../utils/formatters';

export interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
  containerNumber: string;
  eventTypes: EventType[];
  onEventAdded: () => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  containerId,
  containerNumber,
  eventTypes,
  onEventAdded,
}) => {
  const [formData, setFormData] = useState<TrackingEventInput>({
    eventType: '',
    eventDate: new Date().toISOString().slice(0, 16),
    location: '',
    portName: '',
    vessel: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await trackingService.addTrackingEvent(containerId, formData);
      onEventAdded();
      onClose();
      setFormData({
        eventType: '',
        eventDate: new Date().toISOString().slice(0, 16),
        location: '',
        portName: '',
        vessel: '',
        notes: '',
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Eroare la adăugarea evenimentului'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Adaugă Eveniment - {containerNumber}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Tip Eveniment *
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Selectează tipul</option>
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Data și Ora *
            </label>
            <Input
              type="datetime-local"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Locație *
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="ex., Portul Shanghai"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nume Port
              </label>
              <Input
                type="text"
                value={formData.portName || ''}
                onChange={(e) => setFormData({ ...formData, portName: e.target.value })}
                placeholder="ex., Shanghai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Navă
              </label>
              <Input
                type="text"
                value={formData.vessel || ''}
                onChange={(e) => setFormData({ ...formData, vessel: e.target.value })}
                placeholder="ex., MSC Oscar"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Note
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              placeholder="Detalii suplimentare..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Anulează
            </Button>
            <Button type="submit" loading={loading} disabled={loading}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Adaugă Eveniment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventModal;
