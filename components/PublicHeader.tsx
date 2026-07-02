import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PromoEffectLogo } from '@/components/PromoEffectLogo';
import { Button } from './ui/Button';
import { LanguageSwitcher } from './shared/LanguageSwitcher';

const NAV_ITEMS: { label: string; to: string }[] = [
  { label: 'Servicii', to: '/servicii' },
  { label: 'Prețuri', to: '/preturi' },
  { label: 'Calcul Prompt', to: '/calcul-prompt' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export const PublicHeader = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#050608]/80 backdrop-blur-md border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <PromoEffectLogo />
        </Link>
        <div className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-neutral-400">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex text-xs font-bold tracking-wider uppercase text-neutral-600 hover:text-white"
            onClick={onLoginRedirect}
          >
            TRACKING
          </Button>
          <Button
            size="sm"
            className="hidden sm:flex bg-primary-600 text-white hover:bg-primary-500 font-bold text-[11px] tracking-wider uppercase px-6"
            onClick={onLoginRedirect}
          >
            ACCES PORTAL
          </Button>
          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden p-2 text-neutral-300 hover:text-white"
            aria-label={open ? 'Închide meniul' : 'Deschide meniul'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden border-t border-white/5 bg-[#050608]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-bold uppercase tracking-wider text-neutral-300 hover:text-white border-b border-white/5"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs font-bold uppercase text-neutral-400 hover:text-white"
                onClick={() => {
                  setOpen(false);
                  onLoginRedirect();
                }}
              >
                TRACKING
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary-600 text-white hover:bg-primary-500 font-bold text-[11px] uppercase"
                onClick={() => {
                  setOpen(false);
                  onLoginRedirect();
                }}
              >
                ACCES PORTAL
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
