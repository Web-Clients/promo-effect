import logger from '../../src/utils/logger';

describe('logger', () => {
  it('exports a logger instance', () => {
    expect(logger).toBeDefined();
  });

  it('has expected logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('has at least one transport configured', () => {
    // Winston logger transports are stored internally
    // Access them via the logger's transport list
    const transports = (logger as any).transports;
    expect(Array.isArray(transports)).toBe(true);
    expect(transports.length).toBeGreaterThan(0);
  });

  it('has a Console transport', () => {
    const transports = (logger as any).transports;
    const hasConsole = transports.some(
      (t: any) => t.constructor?.name === 'Console' || t.name === 'console'
    );
    expect(hasConsole).toBe(true);
  });

  it('has level set to info or the LOG_LEVEL env value', () => {
    const expectedLevel = process.env.LOG_LEVEL || 'info';
    expect(logger.level).toBe(expectedLevel);
  });

  it('does not throw when logging info messages', () => {
    expect(() => logger.info('test info message')).not.toThrow();
  });

  it('does not throw when logging error messages', () => {
    expect(() => logger.error('test error message')).not.toThrow();
  });

  it('does not throw when logging warnings', () => {
    expect(() => logger.warn('test warn message')).not.toThrow();
  });

  it('does not throw when logging with metadata', () => {
    expect(() => logger.info('test with meta', { userId: '123', action: 'test' })).not.toThrow();
  });
});
