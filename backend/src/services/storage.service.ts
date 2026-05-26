/**
 * Storage Service
 *
 * Handles file storage for PDFs, documents, and other files
 * Supports: Local filesystem, AWS S3, Azure Blob, Google Cloud Storage
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export type StorageProvider = 'LOCAL_FILESYSTEM' | 'AWS_S3' | 'AZURE_BLOB' | 'GOOGLE_CLOUD_STORAGE';

export interface StorageConfig {
  provider: StorageProvider;
  localStoragePath?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsS3Bucket?: string;
  baseUrl?: string; // Base URL for file access (e.g., https://cdn.promo-efect.md)
}

/**
 * Normalize provider string from env (accept lowercase aliases like "local",
 * "s3", "azure", "gcs") into the canonical enum used by the switch statement.
 * This fixes the "Unsupported storage provider: local" spam from email cron.
 */
function normalizeProvider(raw: string | undefined): StorageProvider {
  if (!raw) return 'LOCAL_FILESYSTEM';
  const v = raw.trim().toLowerCase();
  switch (v) {
    case 'local':
    case 'local_filesystem':
    case 'filesystem':
    case 'fs':
    case 'disk':
      return 'LOCAL_FILESYSTEM';
    case 's3':
    case 'aws':
    case 'aws_s3':
      return 'AWS_S3';
    case 'azure':
    case 'azure_blob':
    case 'blob':
      return 'AZURE_BLOB';
    case 'gcs':
    case 'gcp':
    case 'google':
    case 'google_cloud_storage':
      return 'GOOGLE_CLOUD_STORAGE';
    default:
      // Try uppercase match against canonical enum
      const upper = raw.trim().toUpperCase();
      if (
        upper === 'LOCAL_FILESYSTEM' ||
        upper === 'AWS_S3' ||
        upper === 'AZURE_BLOB' ||
        upper === 'GOOGLE_CLOUD_STORAGE'
      ) {
        return upper as StorageProvider;
      }
      logger.warn(`Unknown STORAGE_PROVIDER='${raw}', falling back to LOCAL_FILESYSTEM`);
      return 'LOCAL_FILESYSTEM';
  }
}

/**
 * Sanitize a file name to prevent path traversal attacks.
 * Strips directory separators, null bytes, and leading dots.
 */
function sanitizeFileName(fileName: string): string {
  return (
    fileName.replace(/[\\/]/g, '_').replace(/\0/g, '').replace(/^\.+/, '').slice(0, 255) || 'file'
  );
}

class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = {
      provider: normalizeProvider(process.env.STORAGE_PROVIDER),
      localStoragePath:
        process.env.STORAGE_LOCAL_PATH ||
        process.env.LOCAL_STORAGE_PATH ||
        '/opt/promo-effect/backend/uploads',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
      awsS3Bucket: process.env.AWS_S3_BUCKET,
      baseUrl: process.env.STORAGE_BASE_URL || process.env.API_URL || 'http://localhost:3001',
    };

    // Initialize local storage directory if using local filesystem
    if (this.config.provider === 'LOCAL_FILESYSTEM' && this.config.localStoragePath) {
      try {
        this.ensureDirectoryExists(this.config.localStoragePath);
      } catch (err) {
        logger.error(
          `Failed to create local storage dir ${this.config.localStoragePath}:`,
          (err as Error).message
        );
      }
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Upload file to storage
   * @param buffer File buffer
   * @param fileName Original file name
   * @param folder Folder path (e.g., 'invoices', 'documents')
   * @returns URL to access the file
   */
  async uploadFile(buffer: Buffer, fileName: string, folder: string = 'files'): Promise<string> {
    const safeName = sanitizeFileName(fileName);
    const safeFolder = sanitizeFileName(folder);
    const fileExtension = path.extname(safeName);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(safeFolder, uniqueFileName);

    switch (this.config.provider) {
      case 'LOCAL_FILESYSTEM':
        return this.uploadToLocal(buffer, filePath, folder);

      case 'AWS_S3':
        return this.uploadToS3(buffer, filePath);

      case 'AZURE_BLOB':
        return this.uploadToAzure(buffer, filePath);

      case 'GOOGLE_CLOUD_STORAGE':
        return this.uploadToGCS(buffer, filePath);

      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  /**
   * Resolve a stored file URL/path back to an absolute on-disk path,
   * protecting against directory traversal.
   * Accepts:
   *   - full URL like http://host/storage/folder/abc.pdf
   *   - file:// URL
   *   - relative paths like /storage/folder/abc.pdf or folder/abc.pdf
   * Returns absolute path inside localStoragePath, or null if outside.
   */
  private resolveLocalPath(fileUrl: string): string | null {
    if (!fileUrl || !this.config.localStoragePath) return null;
    let relativePath = fileUrl;
    try {
      // Strip protocol+host if present
      if (/^[a-z]+:\/\//i.test(fileUrl)) {
        const u = new URL(fileUrl);
        relativePath = u.pathname;
      }
    } catch {
      // not a URL, treat as path
    }
    // Strip known prefixes
    relativePath = relativePath
      .replace(/^\/+storage\/+/, '')
      .replace(/^\/+uploads\/+/, '')
      .replace(/^\/+/, '');

    const base = path.resolve(this.config.localStoragePath);
    const full = path.resolve(base, relativePath);
    // Path traversal guard
    if (!full.startsWith(base + path.sep) && full !== base) {
      logger.warn(`Path traversal attempt blocked: ${fileUrl}`);
      return null;
    }
    return full;
  }

  /**
   * Upload to local filesystem
   */
  private async uploadToLocal(buffer: Buffer, filePath: string, folder: string): Promise<string> {
    const fullPath = path.join(this.config.localStoragePath!, folder);
    this.ensureDirectoryExists(fullPath);

    const fileFullPath = path.join(fullPath, path.basename(filePath));
    fs.writeFileSync(fileFullPath, buffer);

    // Return URL for accessing the file
    const relativePath = path.join(folder, path.basename(filePath)).replace(/\\/g, '/');
    return `${this.config.baseUrl}/storage/${relativePath}`;
  }

  /**
   * Upload to AWS S3 using @aws-sdk/client-s3 (AWS SDK v3)
   */
  private async uploadToS3(buffer: Buffer, filePath: string): Promise<string> {
    // Check if credentials are configured
    if (!this.config.awsAccessKeyId || !this.config.awsSecretAccessKey) {
      logger.warn('AWS S3 credentials not configured, using local storage');
      return this.uploadToLocal(buffer, filePath, 'invoices');
    }

    try {
      // Import AWS SDK v3
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

      // Create S3 client
      const s3Client = new S3Client({
        region: this.config.awsRegion || 'us-east-1',
        credentials: {
          accessKeyId: this.config.awsAccessKeyId,
          secretAccessKey: this.config.awsSecretAccessKey,
        },
      });

      const bucket = this.config.awsS3Bucket || 'promo-efect-documents';

      // Create put object command
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: filePath,
        Body: buffer,
        ContentType: 'application/pdf',
      });

      // Upload file
      await s3Client.send(command);

      // Return S3 URL
      return `https://${bucket}.s3.${this.config.awsRegion || 'us-east-1'}.amazonaws.com/${filePath}`;
    } catch (error: any) {
      // If @aws-sdk/client-s3 is not installed, provide helpful error
      if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
        logger.error(
          '@aws-sdk/client-s3 is not installed. Install it with: npm install @aws-sdk/client-s3'
        );
      }
      logger.error('S3 upload failed, falling back to local storage:', error.message || error);
      return this.uploadToLocal(buffer, filePath, 'invoices');
    }
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzure(buffer: Buffer, filePath: string): Promise<string> {
    // TODO: Implement Azure Blob upload
    logger.warn('Azure Blob Storage not yet implemented, using local storage');
    return this.uploadToLocal(buffer, filePath, 'invoices');
  }

  /**
   * Upload to Google Cloud Storage
   */
  private async uploadToGCS(buffer: Buffer, filePath: string): Promise<string> {
    // TODO: Implement GCS upload
    logger.warn('Google Cloud Storage not yet implemented, using local storage');
    return this.uploadToLocal(buffer, filePath, 'invoices');
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      if (this.config.provider === 'LOCAL_FILESYSTEM') {
        const fullPath = this.resolveLocalPath(fileUrl);
        if (fullPath && fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          return true;
        }
      } else if (this.config.provider === 'AWS_S3') {
        try {
          const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

          const s3Client = new S3Client({
            region: this.config.awsRegion || 'us-east-1',
            credentials: {
              accessKeyId: this.config.awsAccessKeyId!,
              secretAccessKey: this.config.awsSecretAccessKey!,
            },
          });

          const bucket = this.config.awsS3Bucket || 'promo-efect-documents';
          // Extract key from URL (everything after bucket name)
          const key = fileUrl.split(`${bucket}/`)[1] || fileUrl.split('.com/')[1];

          const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          });

          await s3Client.send(command);
          return true;
        } catch (error: any) {
          logger.error('Failed to delete file from S3:', error.message || error);
          return false;
        }
      }
      // TODO: Implement delete for Azure, GCS
      return false;
    } catch (error) {
      logger.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get file from storage
   */
  async getFile(fileUrl: string): Promise<Buffer | null> {
    try {
      if (this.config.provider === 'LOCAL_FILESYSTEM') {
        const fullPath = this.resolveLocalPath(fileUrl);
        if (fullPath && fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath);
        }
      } else if (this.config.provider === 'AWS_S3') {
        try {
          const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

          const s3Client = new S3Client({
            region: this.config.awsRegion || 'us-east-1',
            credentials: {
              accessKeyId: this.config.awsAccessKeyId!,
              secretAccessKey: this.config.awsSecretAccessKey!,
            },
          });

          const bucket = this.config.awsS3Bucket || 'promo-efect-documents';
          // Extract key from URL (everything after bucket name)
          const key = fileUrl.split(`${bucket}/`)[1] || fileUrl.split('.com/')[1];

          const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          });

          const response = await s3Client.send(command);

          if (response.Body) {
            // Convert stream to buffer
            const chunks: Uint8Array[] = [];
            for await (const chunk of response.Body as any) {
              chunks.push(chunk);
            }
            return Buffer.concat(chunks);
          }

          return null;
        } catch (error: any) {
          logger.error('Failed to get file from S3:', error.message || error);
          return null;
        }
      }
      // TODO: Implement get for Azure, GCS
      return null;
    } catch (error) {
      logger.error('Failed to get file:', error);
      return null;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
