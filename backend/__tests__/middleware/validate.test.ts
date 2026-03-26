import {
  registerSchema,
  loginSchema,
  createBookingSchema,
  createClientSchema,
  updateClientSchema,
  createInvoiceSchema,
  markPaidSchema,
} from '../../src/middleware/validate.middleware';

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
  };

  it('accepts valid registration data', () => {
    expect(() => registerSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional phone and company', () => {
    const result = registerSchema.safeParse({
      ...valid,
      phone: '+37369000000',
      company: 'ACME SRL',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required email field', () => {
    const { email, ...withoutEmail } = valid;
    const result = registerSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  const valid = { email: 'user@example.com', password: 'anypass' };

  it('accepts valid login data', () => {
    expect(() => loginSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'bad-email' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ ...valid, password: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional twoFactorCode', () => {
    const result = loginSchema.safeParse({ ...valid, twoFactorCode: '123456' });
    expect(result.success).toBe(true);
  });
});

describe('createBookingSchema', () => {
  const valid = {
    portOrigin: 'Constanta',
    containerType: '20DV',
    cargoCategory: 'General',
    cargoWeight: '10000 kg',
    cargoReadyDate: '2026-04-01',
  };

  it('accepts valid booking data', () => {
    expect(() => createBookingSchema.parse(valid)).not.toThrow();
  });

  it('rejects missing portOrigin', () => {
    const { portOrigin, ...rest } = valid;
    const result = createBookingSchema.safeParse({ ...rest, portOrigin: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing containerType', () => {
    const result = createBookingSchema.safeParse({ ...valid, containerType: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing cargoCategory', () => {
    const result = createBookingSchema.safeParse({ ...valid, cargoCategory: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid supplier email format', () => {
    const result = createBookingSchema.safeParse({
      ...valid,
      supplierEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for optional supplier email', () => {
    const result = createBookingSchema.safeParse({ ...valid, supplierEmail: '' });
    expect(result.success).toBe(true);
  });
});

describe('createClientSchema', () => {
  const valid = {
    companyName: 'ACME SRL',
    contactPerson: 'John Doe',
    email: 'client@acme.com',
    phone: '+37369000000',
  };

  it('accepts valid client data', () => {
    expect(() => createClientSchema.parse(valid)).not.toThrow();
  });

  it('rejects company name shorter than 2 chars', () => {
    const result = createClientSchema.safeParse({ ...valid, companyName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects contact person shorter than 2 chars', () => {
    const result = createClientSchema.safeParse({ ...valid, contactPerson: 'J' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = createClientSchema.safeParse({ ...valid, email: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects phone shorter than 6 chars', () => {
    const result = createClientSchema.safeParse({ ...valid, phone: '123' });
    expect(result.success).toBe(false);
  });
});

describe('updateClientSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(() => updateClientSchema.parse({})).not.toThrow();
  });

  it('rejects invalid email if provided', () => {
    const result = updateClientSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('accepts valid status values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'SUSPENDED']) {
      const result = updateClientSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    const result = updateClientSchema.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });
});

describe('createInvoiceSchema', () => {
  const valid = {
    bookingId: 'booking-123',
    clientId: 'client-456',
    dueDate: '2026-05-01',
  };

  it('accepts valid invoice data', () => {
    expect(() => createInvoiceSchema.parse(valid)).not.toThrow();
  });

  it('rejects missing bookingId', () => {
    const result = createInvoiceSchema.safeParse({ ...valid, bookingId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects discount below 0', () => {
    const result = createInvoiceSchema.safeParse({ ...valid, discount: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects discount above 100', () => {
    const result = createInvoiceSchema.safeParse({ ...valid, discount: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts valid discount value', () => {
    const result = createInvoiceSchema.safeParse({ ...valid, discount: 10 });
    expect(result.success).toBe(true);
  });
});

describe('markPaidSchema', () => {
  const valid = {
    amount: 1500.5,
    paymentDate: '2026-04-15',
    paymentMethod: 'BANK_TRANSFER',
  };

  it('accepts valid payment data', () => {
    expect(() => markPaidSchema.parse(valid)).not.toThrow();
  });

  it('rejects zero or negative amount', () => {
    expect(markPaidSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(markPaidSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it('rejects invalid payment method', () => {
    const result = markPaidSchema.safeParse({ ...valid, paymentMethod: 'CRYPTO' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid payment methods', () => {
    for (const method of ['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']) {
      const result = markPaidSchema.safeParse({ ...valid, paymentMethod: method });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing paymentDate', () => {
    const result = markPaidSchema.safeParse({ ...valid, paymentDate: '' });
    expect(result.success).toBe(false);
  });
});
