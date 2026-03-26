import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { PlusIcon, DownloadIcon, SearchIcon, RefreshCwIcon, EyeIcon } from '../icons';
import { useToast } from '../ui/Toast';
import invoicesService, {
  Invoice,
  InvoiceStats,
  CreateInvoiceData,
  PaymentInput,
} from '../../services/invoices';
import clientsService, { Client } from '../../services/clients';
import { statusVariantMap, statusTextMap } from './types';
import CreateInvoiceModal from './CreateInvoiceModal';
import PaymentModal from './PaymentModal';
import InvoiceDetailModal from './InvoiceDetailModal';

const InvoicesList: React.FC = () => {
  const { addToast } = useToast();

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invoicesData, statsData] = await Promise.all([
        invoicesService.getInvoices({
          page: currentPage,
          limit: pageSize,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined,
        }),
        invoicesService.getStats(),
      ]);

      setInvoices(invoicesData.invoices);
      setTotalPages(invoicesData.totalPages);
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      addToast(error.response?.data?.error || 'Eroare la încărcarea facturilor', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, addToast]);

  // Fetch clients and bookings for create modal
  const fetchClientsAndBookings = async () => {
    try {
      const [clientsData] = await Promise.all([clientsService.getClients({ limit: 100 })]);
      setClients(clientsData.clients);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchClientsAndBookings();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handlers
  const handleCreateInvoice = async (data: CreateInvoiceData) => {
    setIsSubmitting(true);
    try {
      await invoicesService.createInvoice(data);
      addToast('Factură creată cu succes!', 'success');
      setShowCreateModal(false);
      fetchInvoices();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Eroare la crearea facturii', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvoice = async (id: string) => {
    if (!confirm('Trimiteți această factură clientului?')) return;

    try {
      const result = await invoicesService.sendInvoice(id);
      addToast(result.message || 'Factură trimisă cu succes!', 'success');
      fetchInvoices();
      setShowDetailModal(false);
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Eroare la trimiterea facturii', 'error');
    }
  };

  const handleMarkPaid = async (payment: PaymentInput) => {
    if (!selectedInvoice) return;

    setIsSubmitting(true);
    try {
      await invoicesService.markAsPaid(selectedInvoice.id, payment);
      addToast('Plată înregistrată cu succes!', 'success');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Eroare la înregistrarea plății', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const blob = await invoicesService.downloadPDF(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const invoice = invoices.find((i) => i.id === id);
      link.download = invoice ? `${invoice.invoiceNumber}.pdf` : `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('PDF descărcat!', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Eroare la descărcarea PDF', 'error');
    }
  };

  const handleCancelInvoice = async (id: string) => {
    const reason = prompt('Motivul anulării (opțional):');
    if (reason === null) return;

    try {
      await invoicesService.cancelInvoice(id, reason || undefined);
      addToast('Factură anulată!', 'success');
      setShowDetailModal(false);
      fetchInvoices();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Eroare la anularea facturii', 'error');
    }
  };

  const openDetailModal = async (invoice: Invoice) => {
    try {
      const fullInvoice = await invoicesService.getInvoiceById(invoice.id);
      setSelectedInvoice(fullInvoice);
      setShowDetailModal(true);
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Eroare la încărcarea facturii', 'error');
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
    setShowDetailModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">Facturi</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Factură Nouă
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Facturi</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.total}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Facturat</p>
            <p className="text-2xl font-bold text-blue-600">${stats.totalAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Încasat</p>
            <p className="text-2xl font-bold text-green-600">${stats.totalPaid.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">De Încasat</p>
            <p className="text-2xl font-bold text-red-600">${stats.totalOutstanding.toFixed(2)}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Caută după număr factură sau client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
          >
            <option value="all">Toate statusurile</option>
            <option value="DRAFT">Ciornă</option>
            <option value="UNPAID">Neachitată</option>
            <option value="PAID">Achitată</option>
            <option value="OVERDUE">Scadentă</option>
            <option value="CANCELLED">Anulată</option>
          </select>

          <Button variant="secondary" onClick={fetchInvoices} disabled={isLoading}>
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
                <TableHead>Nr. Factură</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Sumă</TableHead>
                <TableHead>Data Scadentă</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCwIcon className="h-6 w-6 animate-spin mx-auto text-neutral-400" />
                    <p className="mt-2 text-neutral-500">Se încarcă...</p>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-neutral-500">Nu există facturi</p>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.client?.companyName || '-'}</TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString('ro-RO')}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[invoice.status]}>
                        {statusTextMap[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDetailModal(invoice)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(invoice.id)}
                        >
                          <DownloadIcon className="h-4 w-4" />
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
          <div className="flex items-center justify-between p-4 border-t dark:border-neutral-700">
            <p className="text-sm text-neutral-500">
              Pagina {currentPage} din {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Următor
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateInvoice}
        isLoading={isSubmitting}
        clients={clients}
        bookings={bookings}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        onSubmit={handleMarkPaid}
        isLoading={isSubmitting}
        invoice={selectedInvoice}
      />

      <InvoiceDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onSend={handleSendInvoice}
        onMarkPaid={openPaymentModal}
        onDownload={handleDownloadPDF}
        onCancel={handleCancelInvoice}
      />
    </div>
  );
};

export default InvoicesList;
