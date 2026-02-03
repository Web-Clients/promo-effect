/**
 * Storage Service
 * 
 * Handles file storage for PDFs, documents, and other files
 * Supports: Local filesystem, AWS S3, Azure Blob, Google Cloud Storage
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageConfig {
  provider: 'LOCAL_FILESYSTEM' | 'AWS_S3' | 'AZURE_BLOB' | 'GOOGLE_CLOUD_STORAGE';
  localStoragePath?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsS3Bucket?: string;
  baseUrl?: string; // Base URL for file access (e.g., https://cdn.promo-efect.md)
}

class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = {
      provider: (process.env.STORAGE_PROVIDER as any) || 'LOCAL_FILESYSTEM',
      localStoragePath: process.env.LOCAL_STORAGE_PATH || './storage',
      baseUrl: process.env.STORAGE_BASE_URL || process.env.API_URL || 'http://localhost:3001',
    };

    // Initialize local storage directory if using local filesystem
    if (this.config.provider === 'LOCAL_FILESYSTEM' && this.config.localStoragePath) {
      this.ensureDirectoryExists(this.config.localStoragePath);
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
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    folder: string = 'files'
  ): Promise<string> {
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(folder, uniqueFileName);

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
   * Upload to local filesystem
   */
  private async uploadToLocal(
    buffer: Buffer,
    filePath: string,
    folder: string
  ): Promise<string> {
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
      console.warn('AWS S3 credentials not configured, using local storage');
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
        console.error('@aws-sdk/client-s3 is not installed. Install it with: npm install @aws-sdk/client-s3');
      }
      console.error('S3 upload failed, falling back to local storage:', error.message || error);
      return this.uploadToLocal(buffer, filePath, 'invoices');
    }
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzure(buffer: Buffer, filePath: string): Promise<string> {
    // TODO: Implement Azure Blob upload
    console.warn('Azure Blob Storage not yet implemented, using local storage');
    return this.uploadToLocal(buffer, filePath, 'invoices');
  }

  /**
   * Upload to Google Cloud Storage
   */
  private async uploadToGCS(buffer: Buffer, filePath: string): Promise<string> {
    // TODO: Implement GCS upload
    console.warn('Google Cloud Storage not yet implemented, using local storage');
    return this.uploadToLocal(buffer, filePath, 'invoices');
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      if (this.config.provider === 'LOCAL_FILESYSTEM') {
        // Extract relative path from URL
        const urlPath = new URL(fileUrl).pathname;
        const relativePath = urlPath.replace('/storage/', '');
        const fullPath = path.join(this.config.localStoragePath!, relativePath);

        if (fs.existsSync(fullPath)) {
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
          console.error('Failed to delete file from S3:', error.message || error);
          return false;
        }
      }
      // TODO: Implement delete for Azure, GCS
      return false;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get file from storage
   */
  async getFile(fileUrl: string): Promise<Buffer | null> {
    try {
      if (this.config.provider === 'LOCAL_FILESYSTEM') {
        // Extract relative path from URL
        const urlPath = new URL(fileUrl).pathname;
        const relativePath = urlPath.replace('/storage/', '');
        const fullPath = path.join(this.config.localStoragePath!, relativePath);

        if (fs.existsSync(fullPath)) {
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
          console.error('Failed to get file from S3:', error.message || error);
          return null;
        }
      }
      // TODO: Implement get for Azure, GCS
      return null;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

