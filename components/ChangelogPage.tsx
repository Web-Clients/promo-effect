import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHANGELOG, HOW_IT_WORKS, ChangeKind } from '../data/changelog';
import { cn } from '../lib/utils';

/**
 * What changed, and how the platform works.
 *
 * Ion asked for both on 8 Sep and drew the line himself: a record of what was
 * done, and a description of what each part does. They share a page because
 * the second is what makes the first readable — "the commission rule changed"
 * means nothing without the rule next to it.
 *
 * Written for Ion's team, so entries carry no version numbers and no file
 * names, and the whole page follows the user's language rather than defaulting
 * to Romanian.
 */

type Lang = 'ro' | 'ru' | 'en';

/** zh falls back to English here: the entries are not translated to Chinese. */
function contentLang(language: string): Lang {
  const base = (language || 'ro').split('-')[0];
  return base === 'ru' ? 'ru' : base === 'ro' ? 'ro' : 'en';
}

const KIND_STYLES: Record<ChangeKind, string> = {
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  fix: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  improvement: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export default function ChangelogPage() {
  const { t, i18n } = useTranslation();
  const lang = contentLang(i18n.language);
  const [tab, setTab] = useState<'changes' | 'how'>('changes');
  const [kind, setKind] = useState<ChangeKind | 'all'>('all');

  const entries = useMemo(
    () =>
      [...CHANGELOG]
        .filter((e) => kind === 'all' || e.kind === kind)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [kind]
  );

  // Group by date so a day's work reads as one release rather than a list.
  const byDate = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return [...map.entries()];
  }, [entries]);

  const dateLocale = { ro: 'ro-RO', ru: 'ru-RU', en: 'en-GB' }[lang];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-primary-800 dark:text-white">
          {t('changelog.title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {t('changelog.subtitle')}
        </p>
      </header>

      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        {(
          [
            ['changes', t('changelog.tabChanges')],
            ['how', t('changelog.tabHowItWorks')],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === value
                ? 'border-primary-600 text-primary-800 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'changes' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', t('changelog.kinds.all')],
                ['feature', t('changelog.kinds.feature')],
                ['fix', t('changelog.kinds.fix')],
                ['improvement', t('changelog.kinds.improvement')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setKind(value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  kind === value
                    ? 'bg-primary-800 text-white dark:bg-white dark:text-primary-900'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {byDate.length === 0 && (
            <p className="text-sm text-neutral-500">{t('changelog.emptyForFilter')}</p>
          )}

          <div className="space-y-8">
            {byDate.map(([date, items]) => (
              <section key={date}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                  {new Date(date).toLocaleDateString(dateLocale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <ul className="space-y-4">
                  {items.map((e, i) => (
                    <li
                      key={`${date}-${i}`}
                      className="rounded-xl border border-neutral-200/70 bg-white p-4 dark:border-neutral-700/60 dark:bg-neutral-800"
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            KIND_STYLES[e.kind]
                          )}
                        >
                          {t(`changelog.kinds.${e.kind}`)}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                          {t(`changelog.areas.${e.area}`, e.area)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-primary-800 dark:text-white">
                        {e.title[lang]}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {e.body[lang]}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {HOW_IT_WORKS.map((entry) => (
            <section
              key={entry.id}
              id={entry.id}
              className="rounded-xl border border-neutral-200/70 bg-white p-4 dark:border-neutral-700/60 dark:bg-neutral-800"
            >
              <h2 className="font-semibold text-primary-800 dark:text-white">
                {entry.title[lang]}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {entry.body[lang]}
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
