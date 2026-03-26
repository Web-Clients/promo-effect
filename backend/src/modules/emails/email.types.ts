// ===== EMAIL PARSING TYPES =====

export interface ParsedEmail {
  id: string;
  from: string;
  subject: string;
  date: Date;
  body: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // base64 encoded
}

export interface ExtractedBookingData {
  // Container info
  containerNumber?: string; // e.g., TEMU1234567
  blNumber?: string; // Bill of Lading

  // Shipping info
  shippingLine?: string; // e.g., MSC, Maersk, etc.
  vesselName?: string; // e.g., "MSC Oscar"
  voyageNumber?: string; // e.g., "VY123E"

  // Port info
  portOrigin?: string; // e.g., Shanghai, Ningbo
  portDestination?: string; // e.g., Constanta

  // Dates
  etd?: Date; // Estimated Time of Departure
  eta?: Date; // Estimated Time of Arrival
  cargoReadyDate?: Date;

  // Cargo info
  containerType?: string; // 20ft, 40ft, 40ft_HC
  cargoWeight?: string; // e.g., "10-20t"
  cargoDescription?: string;

  // Supplier info
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;

  // Parsing metadata
  confidence: number; // 0-100, confidence score
  extractionMethod: 'REGEX' | 'AI' | 'MANUAL';
  rawEmailId: string;
}

export interface EmailProcessingResult {
  emailId: string;
  status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
  extractedData?: ExtractedBookingData;
  bookingId?: string; // If booking was auto-created
  containerId?: string; // If container was found or created
  error?: string;
  processingTime: number; // ms
}

// ===== REGEX PATTERNS FOR EMAIL PARSING =====

export const REGEX_PATTERNS = {
  // Container number: 4 letters + 7 digits (e.g., TEMU1234567, MSCU1234567)
  containerNumber: /\b([A-Z]{4}[0-9]{7})\b/gi,

  // B/L number: Various formats
  blNumber: /\b(BL[A-Z0-9\-]{6,15}|[A-Z]{4}[0-9]{9,12}|MEDUEN[0-9]+)\b/gi,

  // Weight patterns
  weight: /(\d+(?:\.\d+)?)\s*(?:kg|KG|ton|t|MT|metric\s*ton)/gi,
  weightRange: /\b(\d+-\d+t|\d+\s*-\s*\d+\s*ton)\b/gi,

  // Date patterns (various formats)
  dateISO: /\b(\d{4}-\d{2}-\d{2})\b/g,
  dateEU: /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
  dateText: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,

  // Port names (Chinese ports)
  chinesePorts:
    /\b(Shanghai|Ningbo|Qingdao|Shenzhen|Guangzhou|Tianjin|Xiamen|Dalian|Fuzhou|Yantian)\b/gi,
  europeanPorts: /\b(Constanta|Constanța|Rotterdam|Hamburg|Piraeus|Gdansk|Felixstowe)\b/gi,

  // Shipping lines
  shippingLines:
    /\b(MSC|Maersk|Hapag[-\s]?Lloyd|Cosco|CMA\s*CGM|Evergreen|OOCL|Yang\s*Ming|ZIM|ONE)\b/gi,

  // Vessel name (usually "M/V" or "MV" prefix)
  vesselName: /(?:M\/V|MV|VESSEL:?|Ship:?)\s*([A-Z][A-Za-z0-9\s\-]+)/gi,

  // Voyage number
  voyageNumber: /(?:VOY|VOYAGE|VY)[\.:\s]*([A-Z0-9\-]+[EWN]?)/gi,

  // Container type
  containerType: /\b(20(?:\s*(?:ft|'|GP|DC))?|40(?:\s*(?:ft|'|GP|DC|HC|HQ))?)\b/gi,

  // Phone numbers (Chinese format)
  phoneChina: /(?:\+?86[\s\-]?)?1[3-9]\d{9}/g,
  phoneIntl: /\+\d{1,3}[\s\-]?\d{6,14}/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
};

// ===== SHIPPING LINE NORMALIZATION =====

export const SHIPPING_LINE_MAP: Record<string, string> = {
  msc: 'MSC',
  maersk: 'Maersk',
  'hapag-lloyd': 'Hapag-Lloyd',
  'hapag lloyd': 'Hapag-Lloyd',
  cosco: 'Cosco',
  'cma cgm': 'CMA CGM',
  cmacgm: 'CMA CGM',
  evergreen: 'Evergreen',
  oocl: 'OOCL',
  'yang ming': 'Yangming',
  yangming: 'Yangming',
  zim: 'ZIM',
  one: 'ONE',
};
