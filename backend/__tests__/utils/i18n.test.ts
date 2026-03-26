import { t } from '../../src/utils/i18n';

describe('i18n t() function', () => {
  describe('Romanian translations (ro)', () => {
    it('returns Romanian translation for auth.invalidCredentials', () => {
      expect(t('auth.invalidCredentials', 'ro')).toBe('Email sau parolă incorectă');
    });

    it('returns Romanian translation for auth.accountLocked', () => {
      expect(t('auth.accountLocked', 'ro')).toBe('Contul este blocat temporar');
    });

    it('returns Romanian translation for auth.emailNotVerified', () => {
      expect(t('auth.emailNotVerified', 'ro')).toBe('Emailul nu a fost verificat');
    });

    it('returns Romanian translation for validation.required', () => {
      expect(t('validation.required', 'ro')).toBe('Acest câmp este obligatoriu');
    });

    it('returns Romanian translation for validation.invalidEmail', () => {
      expect(t('validation.invalidEmail', 'ro')).toBe('Adresă de email invalidă');
    });

    it('returns Romanian translation for server.error', () => {
      expect(t('server.error', 'ro')).toBe('Eroare internă a serverului');
    });

    it('returns Romanian translation for booking.notFound', () => {
      expect(t('booking.notFound', 'ro')).toBe('Rezervarea nu a fost găsită');
    });

    it('returns Romanian translation for booking.created', () => {
      expect(t('booking.created', 'ro')).toBe('Rezervare creată cu succes');
    });

    it('returns Romanian translation for invoice.created', () => {
      expect(t('invoice.created', 'ro')).toBe('Factură creată cu succes');
    });

    it('uses Romanian as default language when lang not specified', () => {
      expect(t('auth.invalidCredentials')).toBe('Email sau parolă incorectă');
    });
  });

  describe('Russian translations (ru)', () => {
    it('returns Russian translation for auth.invalidCredentials', () => {
      expect(t('auth.invalidCredentials', 'ru')).toBe('Неверный email или пароль');
    });

    it('returns Russian translation for auth.accountLocked', () => {
      expect(t('auth.accountLocked', 'ru')).toBe('Аккаунт временно заблокирован');
    });

    it('returns Russian translation for auth.emailNotVerified', () => {
      expect(t('auth.emailNotVerified', 'ru')).toBe('Email не подтверждён');
    });

    it('returns Russian translation for validation.required', () => {
      expect(t('validation.required', 'ru')).toBe('Это поле обязательно');
    });

    it('returns Russian translation for server.error', () => {
      expect(t('server.error', 'ru')).toBe('Внутренняя ошибка сервера');
    });

    it('returns Russian translation for booking.notFound', () => {
      expect(t('booking.notFound', 'ru')).toBe('Бронирование не найдено');
    });

    it('returns Russian translation for booking.created', () => {
      expect(t('booking.created', 'ru')).toBe('Бронирование успешно создано');
    });

    it('returns Russian translation for invoice.created', () => {
      expect(t('invoice.created', 'ru')).toBe('Счёт успешно создан');
    });
  });

  describe('English translations (en)', () => {
    it('returns English translation for auth.invalidCredentials', () => {
      expect(t('auth.invalidCredentials', 'en')).toBe('Invalid email or password');
    });

    it('returns English translation for auth.accountLocked', () => {
      expect(t('auth.accountLocked', 'en')).toBe('Account is temporarily locked');
    });

    it('returns English translation for auth.emailNotVerified', () => {
      expect(t('auth.emailNotVerified', 'en')).toBe('Email not verified');
    });

    it('returns English translation for validation.required', () => {
      expect(t('validation.required', 'en')).toBe('This field is required');
    });

    it('returns English translation for validation.invalidEmail', () => {
      expect(t('validation.invalidEmail', 'en')).toBe('Invalid email address');
    });

    it('returns English translation for server.error', () => {
      expect(t('server.error', 'en')).toBe('Internal server error');
    });

    it('returns English translation for booking.notFound', () => {
      expect(t('booking.notFound', 'en')).toBe('Booking not found');
    });

    it('returns English translation for booking.created', () => {
      expect(t('booking.created', 'en')).toBe('Booking created successfully');
    });

    it('returns English translation for invoice.created', () => {
      expect(t('invoice.created', 'en')).toBe('Invoice created successfully');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to English when key does not exist in Romanian', () => {
      // If a key exists in English but not Romanian, fallback to English
      // We test this by requesting a key in ro that maps to English
      // (all current keys exist in all 3 languages, so we test with unknown lang)
      const result = t('server.error', 'fr'); // French not defined
      expect(result).toBe('Internal server error'); // Should fall back to English
    });

    it('falls back to English for unknown language', () => {
      expect(t('booking.notFound', 'de')).toBe('Booking not found');
    });

    it('returns the key itself when not found in any language', () => {
      expect(t('nonexistent.key', 'ro')).toBe('nonexistent.key');
    });

    it('returns the key itself for unknown language and unknown key', () => {
      expect(t('totally.unknown.key', 'xx')).toBe('totally.unknown.key');
    });

    it('returns the key itself when key does not exist in English either', () => {
      expect(t('missing.in.all.languages', 'en')).toBe('missing.in.all.languages');
    });
  });
});
