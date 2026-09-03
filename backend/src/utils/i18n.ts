const messages: Record<string, Record<string, string>> = {
  ro: {
    'auth.invalidCredentials': 'Email sau parolă incorectă',
    'auth.accountLocked': 'Contul este blocat temporar',
    'auth.emailNotVerified': 'Emailul nu a fost verificat',
    'validation.required': 'Acest câmp este obligatoriu',
    'validation.invalidEmail': 'Adresă de email invalidă',
    'validation.passwordRequired': 'Parola este obligatorie',
    'validation.nameRequired': 'Numele este obligatoriu',
    'validation.minLength': 'Minim {{min}} caractere',
    'validation.maxLength': 'Maxim {{max}} caractere',
    'validation.invalidFormat': 'Format invalid',
    'validation.portOriginRequired': 'Portul de origine este obligatoriu',
    'validation.containerTypeRequired': 'Tipul containerului este obligatoriu',
    'validation.cargoWeightRequired': 'Greutatea mărfii este obligatorie',
    'validation.cargoReadyDateRequired': 'Data pregătirii mărfii este obligatorie',
    'validation.cargoReadyDateInvalid': 'Data pregătirii mărfii este invalidă',
    'validation.cargoReadyDatePast': 'Data pregătirii mărfii trebuie să fie în viitor',
    'validation.cfrShippingLineRequired': 'Pentru CFR/CIF selectați linia maritimă',
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
    'validation.passwordRequired': 'Пароль обязателен',
    'validation.nameRequired': 'Имя обязательно',
    'validation.minLength': 'Минимум {{min}} символов',
    'validation.maxLength': 'Максимум {{max}} символов',
    'validation.invalidFormat': 'Неверный формат',
    'validation.portOriginRequired': 'Порт отправления обязателен',
    'validation.containerTypeRequired': 'Тип контейнера обязателен',
    'validation.cargoWeightRequired': 'Вес груза обязателен',
    'validation.cargoReadyDateRequired': 'Дата готовности груза обязательна',
    'validation.cargoReadyDateInvalid': 'Дата готовности груза неверна',
    'validation.cargoReadyDatePast': 'Дата готовности груза должна быть в будущем',
    'validation.cfrShippingLineRequired': 'Для CFR/CIF выберите судоходную линию',
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
    'validation.passwordRequired': 'Password is required',
    'validation.nameRequired': 'Name is required',
    'validation.minLength': 'Minimum {{min}} characters',
    'validation.maxLength': 'Maximum {{max}} characters',
    'validation.invalidFormat': 'Invalid format',
    'validation.portOriginRequired': 'Port of origin is required',
    'validation.containerTypeRequired': 'Container type is required',
    'validation.cargoWeightRequired': 'Cargo weight is required',
    'validation.cargoReadyDateRequired': 'Cargo ready date is required',
    'validation.cargoReadyDateInvalid': 'Cargo ready date is invalid',
    'validation.cargoReadyDatePast': 'Cargo ready date must be in the future',
    'validation.cfrShippingLineRequired': 'For CFR/CIF please select a shipping line',
    'server.error': 'Internal server error',
    'booking.notFound': 'Booking not found',
    'booking.created': 'Booking created successfully',
    'invoice.created': 'Invoice created successfully',
  },
};

export function t(key: string, lang: string = 'ro'): string {
  return messages[lang]?.[key] || messages['en']?.[key] || key;
}

export function tv(
  key: string,
  vars: Record<string, string | number>,
  lang: string = 'ro'
): string {
  let msg = t(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return msg;
}

/**
 * Returns Zod error messages in the given language.
 * Usage: zodMessages('ro') returns an object with .required, .email, etc.
 */
export function zodMessages(lang: string = 'ro') {
  return {
    required: t('validation.required', lang),
    invalidEmail: t('validation.invalidEmail', lang),
    passwordRequired: t('validation.passwordRequired', lang),
    nameRequired: t('validation.nameRequired', lang),
    invalidFormat: t('validation.invalidFormat', lang),
    minLength: (min: number) => tv('validation.minLength', { min }, lang),
    maxLength: (max: number) => tv('validation.maxLength', { max }, lang),
  };
}
