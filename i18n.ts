import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import ro from './locales/ro/common.json';
import ru from './locales/ru/common.json';
import en from './locales/en/common.json';
import zh from './locales/zh/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ro: { translation: ro },
      ru: { translation: ru },
      en: { translation: en },
      zh: { translation: zh },
    },
    // Chinese covers the agent portal and the screens around it, not the whole
    // back office. Anything it does not carry falls through to English rather
    // than to Romanian — a forwarder in Ningbo can work around an English
    // label, not a Romanian one.
    fallbackLng: { zh: ['en'], default: ['ro'] },
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
    },
  });

export default i18n;
