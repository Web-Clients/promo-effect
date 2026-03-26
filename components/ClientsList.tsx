import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/Table';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, RefreshCwIcon } from './icons';
import { useToast } from './ui/Toast';
import clientsService, { Client, CreateClientData, UpdateClientData } from '../services/clients';

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
      });
    }
  }, [client, isOpen]);

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
                  {t('clients.bankAccount')}
                </label>
                <Input
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="MD12ABCD..."
                />
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
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      setClients(data.clients);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error: any) {
      addToast(error.message || t('clients.errorLoading'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, addToast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
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
    } catch (error: any) {
      addToast(error.message || t('clients.errorSaving'), 'error');
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
    } catch (error: any) {
      addToast(error.message || t('clients.errorDeleting'), 'error');
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
              className="pl-10"
            />
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
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-neutral-500 dark:text-neutral-400">
                      {searchTerm || statusFilter !== 'ALL'
                        ? t('clients.noClientsFound')
                        : t('clients.noClientsYet')}
                    </p>
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
