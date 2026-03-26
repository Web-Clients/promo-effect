const messages: Record<string, Record<string, string>> = {
  ro: {
    'auth.invalidCredentials': 'Email sau parolă incorectă',
    'auth.accountLocked': 'Contul este blocat temporar',
    'auth.emailNotVerified': 'Emailul nu a fost verificat',
    'validation.required': 'Acest câmp este obligatoriu',
    'validation.invalidEmail': 'Adresă de email invalidă',
    'server.error': 'Eroare internă a serverului',
    'booking.notFound': 'Rezervarea nu a fost găsită',
    'booking.created': 'Rezervare creată cu succes',
    'invoice.created': 'Factură creată cu succes',
  },
  ru: {
    'auth.invalidCredentials': 'Неверный email или пароль',
    'auth.accountLocked': 'Аккаунт временно заблокирован',
    'auth.emailNotVerified': 'Email не подтверждён',
    'validation.required': 'Это поле обязательно',
    'validation.invalidEmail': 'Неверный адрес электронной почты',
    'server.error': 'Внутренняя ошибка сервера',
    'booking.notFound': 'Бронирование не найдено',
    'booking.created': 'Бронирование успешно создано',
    'invoice.created': 'Счёт успешно создан',
  },
  en: {
    'auth.invalidCredentials': 'Invalid email or password',
    'auth.accountLocked': 'Account is temporarily locked',
    'auth.emailNotVerified': 'Email not verified',
    'validation.required': 'This field is required',
    'validation.invalidEmail': 'Invalid email address',
    'server.error': 'Internal server error',
    'booking.notFound': 'Booking not found',
    'booking.created': 'Booking created successfully',
    'invoice.created': 'Invoice created successfully',
  },
};

export function t(key: string, lang: string = 'ro'): string {
  return messages[lang]?.[key] || messages['en']?.[key] || key;
}
