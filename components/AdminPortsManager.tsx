/**
 * Admin Ports Manager
 * Component for managing shipping ports (origin and destination)
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import portsService, { Port, CreatePortDto } from '../services/ports';

// Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

const ShipIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

interface PortModalProps {
  port?: Port | null;
  portType: 'ORIGIN' | 'DESTINATION';
  onClose: () => void;
  onSave: (data: CreatePortDto & { isActive?: boolean }) => Promise<void>;
}

const PortModal: React.FC<PortModalProps> = ({ port, portType, onClose, onSave }) => {
  const [name, setName] = useState(port?.name || '');
  const [code, setCode] = useState(port?.code || '');
  const [country, setCountry] = useState(port?.country || (portType === 'ORIGIN' ? 'China' : ''));
  const [isActive, setIsActive] = useState(port?.isActive ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onSave({
        name: name.trim(),
        code: code.trim() || undefined,
        country: country.trim(),
        type: portType,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Eroare la salvare');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {port ? 'Editare port' : 'Adaugare port nou'}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({portType === 'ORIGIN' ? 'Origine' : 'Destinatie'})
            </span>
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nume port *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: Shanghai, Ningbo, Constanta"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cod port (optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: CNSHA, ROCON"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tara *
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: China, Romania, Ukraine"
                required
              />
            </div>

            {port && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Port activ
                </label>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Anulare
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim() || !country.trim()}
                className="flex-1"
              >
                {isLoading ? 'Se salveaza...' : port ? 'Salveaza' : 'Adauga'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminPortsManager: React.FC = () => {
  const [originPorts, setOriginPorts] = useState<Port[]>([]);
  const [destinationPorts, setDestinationPorts] = useState<Port[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'ORIGIN' | 'DESTINATION'>('ORIGIN');
  const [editingPort, setEditingPort] = useState<Port | null>(null);

  const loadPorts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [origin, destination] = await Promise.all([
        portsService.getOriginPorts(showInactive),
        portsService.getDestinationPorts(showInactive),
      ]);
      setOriginPorts(origin);
      setDestinationPorts(destination);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Eroare la incarcarea porturilor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPorts();
  }, [showInactive]);

  const handleAddPort = (type: 'ORIGIN' | 'DESTINATION') => {
    setEditingPort(null);
    setModalType(type);
    setShowModal(true);
  };

  const handleEditPort = (port: Port) => {
    setEditingPort(port);
    setModalType(port.type);
    setShowModal(true);
  };

  const handleSavePort = async (data: CreatePortDto & { isActive?: boolean }) => {
    if (editingPort) {
      await portsService.update(editingPort.id, {
        name: data.name,
        code: data.code,
        country: data.country,
        isActive: data.isActive,
      });
    } else {
      await portsService.create(data);
    }
    await loadPorts();
  };

  const handleDeletePort = async (port: Port) => {
    if (!confirm(`Sigur doriti sa stergeti portul "${port.name}"?`)) return;

    try {
      await portsService.delete(port.id);
      await loadPorts();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Eroare la stergere');
    }
  };

  const renderPortsTable = (ports: Port[], type: 'ORIGIN' | 'DESTINATION') => {
    const title = type === 'ORIGIN' ? 'Porturi de origine (China)' : 'Porturi de destinatie';

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShipIcon />
            {title}
          </h3>
          <Button size="sm" onClick={() => handleAddPort(type)} className="flex items-center gap-1">
            <PlusIcon />
            Adauga
          </Button>
        </div>

        {ports.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Nu exista porturi. Apasati "Adauga" pentru a crea primul port.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                    Nume
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                    Cod
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                    Tara
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                    Actiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {ports.map((port) => (
                  <tr
                    key={port.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-2 text-gray-900 dark:text-white font-medium">
                      {port.name}
                    </td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                      {port.code || '-'}
                    </td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{port.country}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          port.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400'
                        }`}
                      >
                        {port.isActive ? 'Activ' : 'Inactiv'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditPort(port)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                          title="Editeaza"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDeletePort(port)}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                          title="Sterge"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  };

  if (isLoading && originPorts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestionare Porturi</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Adaugati si gestionati porturile de origine si destinatie
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Arata inactive
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Ports tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderPortsTable(originPorts, 'ORIGIN')}
        {renderPortsTable(destinationPorts, 'DESTINATION')}
      </div>

      {/* Modal */}
      {showModal && (
        <PortModal
          port={editingPort}
          portType={modalType}
          onClose={() => setShowModal(false)}
          onSave={handleSavePort}
        />
      )}
    </div>
  );
};

export default AdminPortsManager;
