export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CONTABIL = 'CONTABIL',
  MANAGER_TRANSPORT = 'MANAGER_TRANSPORT',
  AGENT_CONSTANTA = 'AGENT_CONSTANTA',
  CLIENT = 'CLIENT',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export enum BookingStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  id: number;
  booking_number: string;
  client_id: number;
  client_name: string;
  status: BookingStatus;
  origin_port: string;
  destination_port: string;
  shipping_line: string;
  container_type: string;
  quoted_price_usd: number;
  container_number?: string;
  estimated_arrival_date?: string;
  created_at: string;
}

export enum TrackingStatus {
    BOOKED = 'BOOKED',
    GATE_IN = 'GATE_IN',
    LOADED = 'LOADED',
    DEPARTED = 'DEPARTED',
    IN_TRANSIT = 'IN_TRANSIT',
    ARRIVED = 'ARRIVED',
    DISCHARGED = 'DISCHARGED',
    GATE_OUT = 'GATE_OUT',
    DELIVERED = 'DELIVERED'
}

export interface TrackingEvent {
    id: number;
    title: string;
    description: string;
    location: string;
    timestamp: string;
    status: 'completed' | 'current' | 'pending';
}

export interface Container {
    id: number;
    booking_id: number;
    container_number: string;
    shipping_line: string;
    current_status: TrackingStatus;
    current_location: string;
    vessel_name?: string;
    estimated_arrival_date: string;
    is_refrigerated: boolean;
    is_urgent: boolean;
    priority_level: number;
    tracking_history: TrackingEvent[];
}

export interface PriceCalculationParams {
    origin_port: string;
    destination_port: string;
    container_type: string;
    shipping_line: string;
}

export interface PriceBreakdown {
    base_rate_maritim: number;
    taxe_portuare_constanta: number;
    vama_tranzit: number;
    transport_terestru: number;
    comision_promo_efect: number;
    total: number;
}

export interface SystemSettings {
  // Email Integration
  emailSettings: {
    provider: 'GMAIL' | 'OUTLOOK' | 'CUSTOM_SMTP';
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRefreshToken: string;
    gmailUserEmail: string;
    enabled: boolean;
    lastSyncAt: string;
    syncInterval: number;
  };
  
  // Container Tracking
  trackingSettings: {
    provider: 'TERMINAL49' | 'DIRECT_APIS';
    terminal49ApiKey: string;
    terminal49WebhookSecret: string;
    enabled: boolean;
    syncInterval: number;
  };
  
  // Notifications - Email (uses FREE SMTP via nodemailer)
  emailNotificationSettings: {
    provider: 'SMTP' | 'GMAIL' | 'OUTLOOK' | 'CUSTOM_SMTP';
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    senderEmail: string;
    senderName: string;
    enabled: boolean;
  };
  
  // Notifications - SMS (currently disabled - requires paid service)
  smsSettings: {
    provider: 'DISABLED' | 'FUTURE_FREE_SERVICE';
    enabled: boolean;
    note: string; // "SMS requires paid service. Use email notifications instead."
  };
  
  // Notifications - WhatsApp (currently disabled - requires paid service)
  whatsappSettings: {
    provider: 'DISABLED' | 'FUTURE_FREE_SERVICE';
    enabled: boolean;
    note: string; // "WhatsApp requires paid service. Use email notifications instead."
  };
  
  // Notifications - Viber
  viberSettings: {
    botToken: string;
    botName: string;
    botAvatar: string;
    enabled: boolean;
  };
  
  // AI Parsing
  aiSettings: {
    provider: 'ANTHROPIC_CLAUDE' | 'OPENAI' | 'NONE';
    anthropicApiKey: string;
    openaiApiKey: string;
    model: string;
    enabled: boolean;
    confidenceThreshold: number;
  };
  
  // Translation
  translationSettings: {
    provider: 'GOOGLE_TRANSLATE' | 'DEEPL' | 'NONE';
    googleTranslateApiKey: string;
    deeplApiKey: string;
    enabled: boolean;
  };
  
  // OCR
  ocrSettings: {
    // FIX: Added 'NONE' as a valid provider option for ocrSettings.
    provider: 'GOOGLE_VISION' | 'TESSERACT' | 'AWS_TEXTRACT' | 'NONE';
    googleVisionApiKey: string;
    awsTextractAccessKey: string;
    awsTextractSecretKey: string;
    enabled: boolean;
  };
  
  // 1C Integration
  oneC_Settings: {
    integrationType: 'FTP' | 'HTTP_API' | 'FILE_SHARE';
    ftpHost: string;
    ftpPort: number;
    ftpUsername: string;
    ftpPassword: string;
    apiEndpoint: string;
    apiKey: string;
    fileSharePath: string;
    exportFormat: 'XML' | 'JSON' | 'CSV';
    exportSchedule: 'DAILY' | 'EVERY_2_DAYS' | 'WEEKLY' | 'MANUAL';
    exportTime: string;
    enabled: boolean;
  };
  
  // File Storage
  storageSettings: {
    provider: 'AWS_S3' | 'LOCAL_FILESYSTEM' | 'AZURE_BLOB' | 'GOOGLE_CLOUD_STORAGE';
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    awsS3Bucket: string;
    localStoragePath: string;
    azureConnectionString: string;
    azureContainerName: string;
    gcpProjectId: string;
    gcpBucketName: string;
    maxFileSizeMB: number;
  };
  
  // Payment Settings
  paymentSettings: {
    penaltyRateDaily: number;
    gracePeriodDays: number;
    reminderSchedule: {
      firstReminder: number;
      secondReminder: number;
      thirdReminder: number;
      escalationToManager: number;
      finalNotice: number;
    };
    currency: 'USD' | 'EUR' | 'MDL';
  };
  
  // System Settings
  systemSettings: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    companyLogo: string;
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    language: 'ro' | 'ru' | 'en';
    maintenanceMode: boolean;
  };
}