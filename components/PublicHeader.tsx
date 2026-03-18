import React from 'react';
import { Link } from 'react-router-dom';
import { PromoEffectLogo } from '@/components/PromoEffectLogo';
import { Button } from './ui/Button';

export const PublicHeader = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#050608]/80 backdrop-blur-md border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to='/' className="hover:opacity-80 transition-opacity"><PromoEffectLogo /></Link>
        <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          {['Servicii', 'Prețuri', 'Calcul Prompt', 'FAQ', 'Contact'].map(item => (
            <Link 
              key={item} 
              to={item === 'Calcul Prompt' ? '/calcul-prompt' : item === 'Prețuri' ? '/preturi' : `/${item.toLowerCase().replace(' ', '')}`} 
              className="hover:text-white transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="hidden md:flex text-[11px] font-bold tracking-wider uppercase text-neutral-400 hover:text-white" onClick={onLoginRedirect}>
            TRACKING
          </Button>
          <Button size="sm" className="bg-primary-600 text-white hover:bg-primary-500 font-bold text-[11px] tracking-wider uppercase px-6" onClick={onLoginRedirect}>
            ACCES PORTAL
          </Button>
        </div>
      </nav>
    </header>
  );
};
