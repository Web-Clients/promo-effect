/**
 * The locale files themselves.
 *
 * Two classes of defect have already shipped from here and neither shows up in
 * a component test:
 *
 *   1. ConfirmDialog called t('common.confirm') and t('common.cancel'). Neither
 *      key existed in any locale, so every user in every language got the
 *      Romanian fallback baked into the call site.
 *   2. The fleet map's "3 days ago" rendered as the literal string
 *      "fleetMap.age.days". Romanian has three plural forms and Russian four;
 *      only days_one and days_other had been written, so a count of 3 looked
 *      for days_few, found nothing, and printed the key.
 */

import { describe, it, expect } from 'vitest';
import ro from '../locales/ro/common.json';
import ru from '../locales/ru/common.json';
import en from '../locales/en/common.json';
import zh from '../locales/zh/common.json';

type Dict = Record<string, unknown>;

function flatten(o: Dict, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object') Object.assign(out, flatten(v as Dict, `${prefix}${k}.`));
    else out[`${prefix}${k}`] = String(v);
  }
  return out;
}

const RO = flatten(ro as Dict);
const RU = flatten(ru as Dict);
const EN = flatten(en as Dict);
const ZH = flatten(zh as Dict);

/**
 * Plural variants are language-specific by design — English has no "few" form
 * and Chinese has only "other" — so they are compared separately, by CLDR
 * category, rather than by strict key equality.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const base = (dict: Record<string, string>) =>
  Object.keys(dict).filter((k) => !PLURAL_SUFFIX.test(k));

describe('office locales', () => {
  // Romanian, Russian and English are the platform's own languages and must
  // stay in step. Chinese is deliberately partial and falls back to English.
  it('ru and en carry every key ro does', () => {
    const missingRu = base(RO).filter((k) => !(k in RU));
    const missingEn = base(RO).filter((k) => !(k in EN));
    expect(missingRu).toEqual([]);
    expect(missingEn).toEqual([]);
  });

  it('ro carries every key ru and en do', () => {
    const extra = [...base(RU), ...base(EN)].filter((k) => !(k in RO));
    expect([...new Set(extra)]).toEqual([]);
  });

  it('has no empty values in any language', () => {
    for (const [name, dict] of [
      ['ro', RO],
      ['ru', RU],
      ['en', EN],
      ['zh', ZH],
    ] as const) {
      const empty = Object.entries(dict)
        .filter(([, v]) => !v.trim())
        .map(([k]) => `${name}:${k}`);
      expect(empty).toEqual([]);
    }
  });
});

describe('keys the code calls', () => {
  // Each of these is referenced by a t() call. A missing one silently shows
  // whatever fallback the call site happens to carry.
  const REQUIRED = [
    'actions.confirm',
    'actions.cancel',
    'common.notifications',
    'common.dismissNotification',
    'common.active',
    'common.skipToContent',
    'profile.resetLinkSent',
    'profile.sendResetLink',
    'nav.fleetMap',
    'auth.heroTitle',
    'auth.heroSubtitle',
  ];

  it('exists in ro, ru and en', () => {
    for (const key of REQUIRED) {
      expect(`ro:${key}:${key in RO}`).toBe(`ro:${key}:true`);
      expect(`ru:${key}:${key in RU}`).toBe(`ru:${key}:true`);
      expect(`en:${key}:${key in EN}`).toBe(`en:${key}:true`);
    }
  });
});

describe('plural forms', () => {
  // CLDR: Romanian needs one/few/other, Russian one/few/many/other,
  // English one/other, Chinese other. A missing form prints the raw key.
  const PLURALS: Record<string, { dict: Record<string, string>; forms: string[] }> = {
    ro: { dict: RO, forms: ['one', 'few', 'other'] },
    ru: { dict: RU, forms: ['one', 'few', 'many', 'other'] },
    en: { dict: EN, forms: ['one', 'other'] },
    zh: { dict: ZH, forms: ['other'] },
  };

  it('fleetMap.age.days has every form its language needs', () => {
    for (const [lang, { dict, forms }] of Object.entries(PLURALS)) {
      for (const form of forms) {
        const key = `fleetMap.age.days_${form}`;
        expect(`${lang}:${key}:${key in dict}`).toBe(`${lang}:${key}:true`);
      }
    }
  });
});

describe('the agent portal in Chinese', () => {
  // A Chinese agent must never fall through to Romanian, so every key his
  // screens use has to exist in zh — or in en, which is zh's fallback.
  it('covers the agent portal end to end', () => {
    const agentKeys = base(EN).filter((k) => k.startsWith('agentPortal.'));
    const missing = agentKeys.filter((k) => !(k in ZH));
    expect(missing).toEqual([]);
  });

  it('covers sign-in and navigation for an agent', () => {
    for (const key of ['auth.welcomeBack', 'auth.email', 'auth.password', 'nav.myPrices']) {
      expect(`${key}:${key in ZH}`).toBe(`${key}:true`);
    }
  });

  it('is written in Chinese, not left as English', () => {
    const hasHan = (s: string) => /[一-鿿]/.test(s);
    const suspicious = Object.entries(ZH)
      .filter(([k]) => k.startsWith('agentPortal.') && !k.includes('.status.'))
      .filter(([, v]) => v.length > 2 && !hasHan(v) && !/^[A-Z/]+$/.test(v))
      .map(([k]) => k);
    expect(suspicious).toEqual([]);
  });
});
