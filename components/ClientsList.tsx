import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/Table';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, RefreshCwIcon, XIcon } from './icons';
import { useToast } from './ui/Toast';
import clientsService, {
  Client,
  ClientContact,
  CreateClientData,
  UpdateClientData,
} from '../services/clients';
import { getErrorMessage } from '../utils/formatters';

// Client Modal Component
interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientData | UpdateClientData) => Promise<void>;
  client?: Client | null;
  isLoading: boolean;
}

const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateClientData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    bankAccount: '',
    vatCode: '',
    bankName: '',
    swift: '',
    contacts: [],
  });

  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        address: client.address || '',
        taxId: client.taxId || '',
        bankAccount: client.bankAccount || '',
        vatCode: client.vatCode || '',
        bankName: client.bankName || '',
        swift: client.swift || '',
        contacts: client.contacts || [],
      });
    } else {
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        bankAccount: '',
        vatCode: '',
        bankName: '',
        swift: '',
        contacts: [],
      });
    }
  }, [client, isOpen]);

  const contacts: ClientContact[] = formData.contacts || [];
  const setContacts = (next: ClientContact[]) => setFormData({ ...formData, contacts: next });
  const addContact = (role: string) =>
    setContacts([...contacts, { name: '', role, email: '', phone: '', subscribed: true }]);
  const updateContact = (i: number, patch: Partial<ClientContact>) =>
    setContacts(contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeContact = (i: number) => setContacts(contacts.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-lg p-6">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-white mb-4">
            {client ? t('clients.editClient') : t('clients.newClient')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('clients.companyName')} *
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="SRL Exemplu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('clients.contactPerson')} *
                </label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Ion Popescu"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('clients.email')} *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@exemplu.md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('clients.phone')} *
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+373 69 123 456"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('clients.address')}
              </label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="str. Exemplu 123, Chișinău"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('clients.taxId')}
                </label>
                <Input
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="1234567890123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Cont bancar (IBAN)
                </label>
                <Input
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="MD12ABCD..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Cod TVA
                </label>
                <Input
                  value={formData.vatCode}
                  onChange={(e) => setFormData({ ...formData, vatCode: e.target.value })}
                  placeholder="0123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Banca
                </label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder='BC "..." S.A.'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  SWIFT / BIC
                </label>
                <Input
                  value={formData.swift}
                  onChange={(e) => setFormData({ ...formData, swift: e.target.value })}
                  placeholder="AGRNMD2X"
                />
              </div>
            </div>

            {/* Contact persons (Director, Logist…) with a "receives messages" flag */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Persoane de contact
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addContact('Director')}
                    className="text-xs px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700"
                  >
                    + Director
                  </button>
                  <button
                    type="button"
                    onClick={() => addContact('Logist')}
                    className="text-xs px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700"
                  >
                    + Logist
                  </button>
                </div>
              </div>
              {contacts.length === 0 && (
                <p className="text-xs text-neutral-400 mb-2">
                  Nicio persoană. Adaugă Director/Logist. Bifa „mesaje" = primește statusul
                  containerului.
                </p>
              )}
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-neutral-50 dark:bg-neutral-700/40 p-2 rounded-lg"
                  >
                    <div className="md:col-span-3">
                      <Input
                        value={c.name}
                        onChange={(e) => updateContact(i, { name: e.target.value })}
                        placeholder="Nume"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={c.role || ''}
                        onChange={(e) => updateContact(i, { role: e.target.value })}
                        placeholder="Rol"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        value={c.email || ''}
                        onChange={(e) => updateContact(i, { email: e.target.value })}
                        placeholder="Email"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={c.phone || ''}
                        onChange={(e) => updateContact(i, { phone: e.target.value })}
                        placeholder="Telefon"
                      />
                    </div>
                    <label
                      className="md:col-span-1 flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300"
                      title="Primește mesaje despre statusul containerului"
                    >
                      <input
                        type="checkbox"
                        checked={c.subscribed ?? true}
                        onChange={(e) => updateContact(i, { subscribed: e.target.checked })}
                      />
                      mesaje
                    </label>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="md:col-span-1 text-error-500 hover:text-error-600 text-lg"
                      title="Șterge contact"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading} loading={isLoading}>
                {client ? t('actions.save') : t('actions.create')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  clientName: string;
  isLoading: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  isLoading,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">
              {t('clients.deleteClient')}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {t('clients.deleteConfirm')} <strong>{clientName}</strong>?{' '}
              {t('clients.deleteWarning')}
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                {t('actions.cancel')}
              </Button>
              <Button variant="danger" onClick={onConfirm} disabled={isLoading} loading={isLoading}>
                {t('actions.delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientsList = () => {
  const { addToast } = useToast();
  const { t } = useTranslation();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await clientsService.getClients({
        page: currentPage,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      setClients(data.clients);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error: unknown) {
      addToast(getErrorMessage(error, t('clients.errorLoading')), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, addToast, t]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounced search: push searchTerm into debouncedSearch after a pause so the
  // fetch (which depends on debouncedSearch) runs once, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handlers
  const handleCreate = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: CreateClientData | UpdateClientData) => {
    setIsSubmitting(true);
    try {
      if (selectedClient) {
        await clientsService.updateClient(selectedClient.id, data);
        addToast(t('clients.updated'), 'success');
      } else {
        await clientsService.createClient(data as CreateClientData);
        addToast(t('clients.created'), 'success');
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (error: unknown) {
      addToast(getErrorMessage(error, t('clients.errorSaving')), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;

    setIsSubmitting(true);
    try {
      await clientsService.deleteClient(selectedClient.id);
      addToast(t('clients.deleted'), 'success');
      setIsDeleteModalOpen(false);
      fetchClients();
    } catch (error: unknown) {
      addToast(getErrorMessage(error, t('clients.errorDeleting')), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="green">{t('status.active')}</Badge>;
      case 'INACTIVE':
        return <Badge variant="default">{t('status.inactive')}</Badge>;
      case 'SUSPENDED':
        return <Badge variant="yellow">{t('status.suspended')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            {t('clients.title')}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('clients.subtitle', { total })}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('clients.newClient')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder={t('clients.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Șterge căutarea"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="ALL">{t('clients.allStatuses')}</option>
            <option value="ACTIVE">{t('clients.activeClients')}</option>
            <option value="INACTIVE">{t('clients.inactiveClients')}</option>
            <option value="SUSPENDED">{t('clients.suspendedClients')}</option>
          </select>

          {/* Refresh Button */}
          <Button variant="secondary" onClick={fetchClients} disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('clients.companyName')}</TableHead>
                <TableHead>{t('clients.contactPerson')}</TableHead>
                <TableHead>{t('clients.email')}</TableHead>
                <TableHead>{t('clients.phone')}</TableHead>
                <TableHead>{t('clients.bookings')}</TableHead>
                <TableHead>{t('bookings.status')}</TableHead>
                <TableHead>{t('users.actionsColumn')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-neutral-500">{t('clients.loading')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-neutral-500 dark:text-neutral-400 mb-3">
                      {searchTerm || statusFilter !== 'ALL'
                        ? t('clients.noClientsFound')
                        : t('clients.noClientsYet')}
                    </p>
                    {!searchTerm && statusFilter === 'ALL' && (
                      <Button variant="accent" onClick={handleCreate}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        {t('clients.newClient')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>{client.contactPerson}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${client.email}`}
                        className="text-accent-600 dark:text-accent-400 hover:underline"
                      >
                        {client.email}
                      </a>
                    </TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client._count?.bookings || client.totalBookings || 0}</TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          title={t('actions.edit')}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client)}
                          title={t('actions.delete')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('clients.pagination', { current: currentPage, total: totalPages, count: total })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                {t('clients.prevPage')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || isLoading}
              >
                {t('clients.nextPage')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        client={selectedClient}
        isLoading={isSubmitting}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        clientName={selectedClient?.companyName || ''}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default ClientsList;
