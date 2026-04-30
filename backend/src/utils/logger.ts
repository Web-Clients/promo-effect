import winston from 'winston';

// ─── Sensitive data redaction ──────────────────────────────────────────────────

/** Redact sensitive values from a string */
function redactString(value: string): string {
  // Tokens / secrets / keys / passwords
  value = value.replace(
    /(token|jwt|bearer|password|secret|key|auth|credential)['"]?\s*[:=]\s*['"]?[a-zA-Z0-9._\-/+]{6,}/gi,
    '$1=[REDACTED]'
  );
  // Email addresses → ***@domain.com
  value = value.replace(/[a-zA-Z0-9._%+\-]+@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g, '***@$1');
  // Phone numbers (E.164 and common formats)
  value = value.replace(/(\+?[0-9]{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}/g, '[PHONE]');
  return value;
}

/** Recursively redact sensitive fields from objects */
function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') return redactString(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(redactObject);

  const SENSITIVE_KEYS = new Set([
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'resetToken',
    'verificationToken',
    'twoFactorSecret',
    'backupCodes',
    'secret',
    'apiKey',
    'key',
    'authorization',
    'gmailAccessToken',
    'gmailRefreshToken',
    'bankAccount',
    'creditCard',
    'cvv',
  ]);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || SENSITIVE_KEYS.has(k)) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = redactObject(v);
    }
  }
  return result;
}

/** Winston format that redacts sensitive data from all log messages and metadata */
const sanitizeFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = redactString(info.message);
  }
  // Redact all extra metadata keys (except standard ones)
  const skipKeys = new Set(['level', 'message', 'timestamp', 'service', 'stack']);
  for (const key of Object.keys(info)) {
    if (!skipKeys.has(key)) {
      (info as Record<string, unknown>)[key] = redactObject((info as Record<string, unknown>)[key]);
    }
  }
  return info;
});

// ──────────────────────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    sanitizeFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'promo-effect-api' },
  transports: [
    // Console transport (always)
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// File transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export default logger;
