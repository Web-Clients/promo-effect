import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ro', label: 'RO', flag: '🇲🇩' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.split('-')[0] || 'ro';

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            currentLang === lang.code
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700'
          }`}
          title={lang.flag}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
