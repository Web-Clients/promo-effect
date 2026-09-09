import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Which languages a given user is offered.
 *
 * The office works in Romanian, Russian and English. The Chinese forwarding
 * agents work in Chinese and English, and offering them Romanian is noise — so
 * an agent gets his two and nobody else gets a script they cannot read.
 *
 * Simplified Chinese, not Traditional, and Mandarin rather than Cantonese:
 * Cantonese is a spoken variety, business correspondence in Guangdong is
 * written in Standard Chinese, and every port Promo-Efect loads from — Ningbo,
 * Shanghai, Qingdao, Shenzhen, Guangzhou, Xiamen — is mainland, where the
 * written standard is Simplified.
 */
const OFFICE_LANGUAGES = [
  { code: 'ro', label: 'RO', title: 'Română' },
  { code: 'ru', label: 'RU', title: 'Русский' },
  { code: 'en', label: 'EN', title: 'English' },
];

const AGENT_LANGUAGES = [
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'zh', label: '中文', title: '简体中文' },
];

/** Sign-in happens before the role is known, so everything is on offer there. */
const ALL_LANGUAGES = [
  { code: 'ro', label: 'RO', title: 'Română' },
  { code: 'ru', label: 'RU', title: 'Русский' },
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'zh', label: '中文', title: '简体中文' },
];

interface LanguageSwitcherProps {
  /** True for a Chinese forwarding agent. */
  isAgent?: boolean;
  /** Offer every language — used on sign-in, before the role is known. */
  all?: boolean;
}

export function LanguageSwitcher({ isAgent = false, all = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const languages = all ? ALL_LANGUAGES : isAgent ? AGENT_LANGUAGES : OFFICE_LANGUAGES;
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
          title={lang.title}
          lang={lang.code}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
