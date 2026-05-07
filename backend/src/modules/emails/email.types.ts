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

  // Supplier info (Chinese shipper)
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  supplierContact?: string;
  supplierWebsite?: string;

  // Consignee info (Moldovan/Romanian beneficiary — distinct from supplier!)
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeContact?: string;
  consigneePhone?: string;
  consigneeEmail?: string;
  consigneeIDNO?: string; // Moldovan/Romanian tax ID

  // Notify party
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  notifyPartyEmail?: string;

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

/**
 * STRICT container number pattern: exactly 4 UPPERCASE letters + exactly 7 digits.
 * ISO 6346 standard. Examples: CMAU8850469, MRKU8601423, FFAU2287130.
 * NEVER use this pattern to match a BL number.
 */
const CONTAINER_NUMBER_STRICT = /\b([A-Z]{4}[0-9]{7})\b/g;

/**
 * BL number patterns — must NOT overlap with container pattern (4 letters + 7 digits).
 * Known carrier formats:
 *  - MSC:      MEDUKC298446, MEDUWS018408 (6+ letters + 6 digits)
 *  - Maersk:   MAEU1234567890, MATU1234567890 (4 letters + 10 digits)
 *  - Hapag:    HLCUSHA123456789 (HLCU + 3 letters + 9 digits = 16 chars total)
 *  - CMA CGM:  CMDUHAI1234567 (CMDU + 3 letters + 7 digits)
 *  - ONE:      ONEYA... (4+ letters + digits, but NOT 4+7)
 *  - ASG:      ASG 202604078 (3 letters + space + 9 digits)
 *  - HBL refs: HBL04078, HLCUTA12506BFWH4 (alphanumeric mix)
 *  - B/L NO field: anything after "B/L NO", "BL NO", "HBL:", "MBL:"
 * Strategy: extract from explicit label first; then match carrier-specific patterns
 * that can't be confused with container format (4+7).
 */
const BL_FROM_LABEL =
  /(?:B\/L\s*N[Oo]\.?|BL\s*N[Oo]\.?|H\.?B\.?L\.?:?|M\.?B\.?L\.?:?|Bill\s*of\s*Lading\s*N[Oo]\.?)\s*([A-Z0-9][A-Z0-9 \-]{2,19})/gi;

// Carrier-prefix BL patterns that are clearly NOT containers (5+ letters prefix, or <7 digits, or >7 digits)
const BL_CARRIER_PATTERNS =
  /\b(HLCU[A-Z]{3}[0-9]{9,}|MED[A-Z]{3,5}[0-9]{6,}|MATS[A-Z0-9]{8,}|CMDU[A-Z]{3}[0-9]{6,}|EASU[A-Z0-9]{8,}|OOLU[A-Z0-9]{8,}|YMLU[A-Z0-9]{8,}|[A-Z]{3}[0-9]{8,})\b/g;

export const REGEX_PATTERNS = {
  // Container number: STRICT 4 letters + 7 digits (ISO 6346)
  containerNumber: CONTAINER_NUMBER_STRICT,

  // B/L number: label-anchored extraction (preferred) + carrier patterns
  blNumber: BL_FROM_LABEL,
  blNumberCarrier: BL_CARRIER_PATTERNS,

  // Weight patterns
  weight: /(\d+(?:\.\d+)?)\s*(?:kg|KG|ton|t|MT|metric\s*ton)/gi,
  weightRange: /\b(\d+-\d+t|\d+\s*-\s*\d+\s*ton)\b/gi,

  // Date patterns (various formats)
  dateISO: /\b(\d{4}-\d{2}-\d{2})\b/g,
  dateEU: /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
  dateText: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,

  // Port names — Chinese origin ports (whitelist for portOrigin only)
  chinesePorts:
    /\b(Shanghai|Ningbo|Qingdao|Shenzhen|Guangzhou|Tianjin|Xiamen|Dalian|Fuzhou|Yantian|Nansha|Shekou|Chiwan|Huangpu|Xingang|Taicang|Nanjing|Wuhan|Chongqing|Lianyungang|Yingkou)\b/gi,

  // European/Black Sea destination ports (whitelist for portDestination)
  europeanPorts:
    /\b(Constanta|Constan[tț]a|Rotterdam|Hamburg|Piraeus|Gdansk|Felixstowe|Odessa|Giurgiulesti|Antwerp|Le\s*Havre|Valencia|Barcelona|Tekirdag|Tekirdağ|Istanbul|Mersin|Ambarli|Izmit|Gemlik)\b/gi,

  // Shipping lines — extended with ASG, SKY, PIL, Wan Hai, Sinolines
  shippingLines:
    /\b(MSC|Maersk|Hapag[-\s]?Lloyd|Cosco|CMA\s*CGM|Evergreen|OOCL|Yang\s*Ming|ZIM|ONE|ASG|PIL|Wan\s*Hai|Sinolines|SKY\s*Shipping|Arkas|KMTC|Heung[-\s]?A|TS\s*Lines)\b/gi,

  // Vessel name (M/V or Ocean Vessel label)
  vesselName: /(?:M\/V|MV|VESSEL:?|Ocean\s*Vessel:?|Ship:?)\s*([A-Z][A-Za-z0-9\s\-\.]+)/gi,

  // Voyage number
  voyageNumber: /(?:VOY|VOYAGE|VY|Voy\.?\s*No\.?)[\.:\s]*([A-Z0-9\-\/]+[EWN]?)/gi,

  // Container type — 20/40 + optional suffix
  containerType:
    /\b(20(?:\s*(?:ft|'|DV|GP|DC|OT|FR|RF))?|40(?:\s*(?:ft|'|DV|GP|DC|HC|HQ|HH|OT|FR|NOR|RF))?|45(?:\s*(?:ft|'|HC|HQ))?)\b/gi,

  // Phone numbers (Chinese format)
  phoneChina: /(?:\+?86[\s\-]?)?1[3-9]\d{9}/g,
  phoneIntl: /\+\d{1,3}[\s\-]?\d{6,14}/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
};

// ===== VALIDATION HELPERS =====

/**
 * Returns true if the value matches the strict ISO 6346 container number format.
 * 4 uppercase letters + 7 digits. NO exceptions.
 */
export function isContainerNumber(value: string): boolean {
  return /^[A-Z]{4}[0-9]{7}$/.test(value.trim().toUpperCase());
}

/**
 * Returns true if the value looks like a BL number (NOT a container number).
 * A BL is anything that is NOT strictly 4 letters + 7 digits, but is an
 * alphanumeric reference of sufficient length.
 */
export function isBlNumber(value: string): boolean {
  const v = value.trim().toUpperCase().replace(/\s/g, '');
  if (!v || v.length < 5) return false;
  // Reject pure container pattern
  if (/^[A-Z]{4}[0-9]{7}$/.test(v)) return false;
  // Must have at least one letter and one digit
  return /[A-Z]/.test(v) && /[0-9]/.test(v);
}

// ===== CHINESE PORT WHITELIST =====
export const CHINA_PORTS_WHITELIST = new Set([
  'SHANGHAI',
  'NINGBO',
  'QINGDAO',
  'SHENZHEN',
  'GUANGZHOU',
  'TIANJIN',
  'XIAMEN',
  'DALIAN',
  'FUZHOU',
  'YANTIAN',
  'NANSHA',
  'SHEKOU',
  'CHIWAN',
  'HUANGPU',
  'XINGANG',
  'TAICANG',
  'NANJING',
  'WUHAN',
  'CHONGQING',
  'LIANYUNGANG',
  'YINGKOU',
]);

// ===== SHIPPING LINE NORMALIZATION =====

export const SHIPPING_LINE_MAP: Record<string, string> = {
  msc: 'MSC',
  maersk: 'Maersk',
  'hapag-lloyd': 'Hapag-Lloyd',
  'hapag lloyd': 'Hapag-Lloyd',
  cosco: 'COSCO',
  'cma cgm': 'CMA CGM',
  cmacgm: 'CMA CGM',
  evergreen: 'Evergreen',
  oocl: 'OOCL',
  'yang ming': 'Yangming',
  yangming: 'Yangming',
  zim: 'ZIM',
  one: 'ONE',
  asg: 'ASG',
  pil: 'PIL',
  'wan hai': 'Wan Hai',
  sinolines: 'Sinolines',
  'sky shipping': 'SKY Shipping',
  arkas: 'Arkas',
  kmtc: 'KMTC',
  'heung-a': 'Heung-A',
  'heung a': 'Heung-A',
  'ts lines': 'TS Lines',
};
