import React, { useState, useRef } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { api } from '../../../services/api';
import { getErrorMessage, formatDateShort } from '../../../utils/formatters';

export interface BookingDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
}

interface BookingDocumentsProps {
  bookingId: string;
  documents?: BookingDocument[];
  canUpload?: boolean;
  onDocumentsChange?: (docs: BookingDocument[]) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  if (type.includes('pdf')) return '📄';
  if (type.includes('image') || /\.(png|jpg|jpeg)$/i.test(type)) return '🖼️';
  if (type.includes('word') || /\.(doc|docx)$/i.test(type)) return '📝';
  if (type.includes('sheet') || /\.(xls|xlsx)$/i.test(type)) return '📊';
  return '📎';
}

const BookingDocuments: React.FC<BookingDocumentsProps> = ({
  bookingId,
  documents = [],
  canUpload = false,
  onDocumentsChange,
}) => {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localDocs, setLocalDocs] = useState<BookingDocument[]>(documents);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/bookings/${bookingId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newDoc: BookingDocument = response.data;
      const updated = [...localDocs, newDoc];
      setLocalDocs(updated);
      onDocumentsChange?.(updated);
      addToast(`Documentul "${file.name}" a fost încărcat`, 'success');
    } catch (err) {
      addToast(getErrorMessage(err, 'Eroare la încărcarea documentului'), 'error');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
          Documente
        </h4>
        {canUpload && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              loading={isUploading}
              className="text-sm"
            >
              {isUploading ? 'Se încarcă...' : '+ Adaugă Document'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.doc,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}
      </div>

      {localDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-neutral-400 dark:text-neutral-500 text-sm">
          <span className="text-3xl mb-2">📂</span>
          <p>Nu există documente încărcate</p>
          {canUpload && (
            <p className="text-xs mt-1">Formate acceptate: PDF, PNG, JPG, DOCX, XLSX</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {localDocs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <span className="text-xl shrink-0">{getFileIcon(doc.type || doc.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {doc.name}
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {formatDateShort(doc.uploadedAt)}
                  {doc.size ? ` · ${formatBytes(doc.size)}` : ''}
                </p>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-primary-600 dark:text-primary-400 hover:underline text-xs font-medium"
              >
                Descarcă
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default BookingDocuments;
