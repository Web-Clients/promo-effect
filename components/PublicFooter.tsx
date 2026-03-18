import React from 'react';
import { Link } from 'react-router-dom';
import { PromoEffectLogo } from '@/components/PromoEffectLogo';

export const PublicFooter = () => {
  return (
    <footer className="bg-[#030406] border-t border-white/5 pt-32 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-32">
          <div>
            <PromoEffectLogo inFooter />
            <p className="mt-8 text-neutral-600 text-sm font-medium leading-relaxed italic">
              Lider în digitalizarea importurilor strategice din Asia. Transparență totală, expertiză vamală și eficiență operațională garantată.
            </p>
          </div>
          <div>
            <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-10">Servicii</h5>
            <ul className="space-y-4 text-sm font-bold text-neutral-600 uppercase tracking-widest">
              {[
                { name: 'FCL Transport', path: '/servicii/fcl' },
                { name: 'LCL Grupaj', path: '/servicii/lcl' },
                { name: 'Consultanta China', path: '/servicii/consultanta' },
                { name: 'Vamuire', path: '/servicii/vamuire' },
                { name: 'Depozitare', path: '/servicii/depozitare' }
              ].map(s => <li key={s.name} className="hover:text-primary-500 transition-colors"><Link to={s.path}>{s.name}</Link></li>)}
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-10">Companie</h5>
            <ul className="space-y-4 text-sm font-bold text-neutral-600 uppercase tracking-widest">
              {[
                { name: 'Despre Noi', path: '/despre' },
                { name: 'Prețuri', path: '/preturi' },
                { name: 'Calcul Prompt', path: '/calcul-prompt' },
                { name: 'Contact', path: '/contact' },
                { name: 'Hiring', path: '/cariere' }
              ].map(s => <li key={s.name} className="hover:text-primary-500 transition-colors"><Link to={s.path}>{s.name}</Link></li>)}
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-10">Suport</h5>
            <ul className="space-y-4 text-sm font-bold text-neutral-600 uppercase tracking-widest">
              {[
                { name: 'FAQ', path: '/faq' },
                { name: 'Ghid Import', path: '/ghid-import' },
                { name: 'Termeni', path: '/termeni' },
                { name: 'Confidențialitate', path: '/politica' },
                { name: 'Cookie Settings', path: '/cookies' }
              ].map(s => <li key={s.name} className="hover:text-primary-500 transition-colors"><Link to={s.path}>{s.name}</Link></li>)}
            </ul>
          </div>
        </div>
        
        <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="text-[10px] font-black text-neutral-800 uppercase tracking-[0.5em]">
            &copy; {new Date().getFullYear()} PROMO-EFECT Ltd. Toate drepturile rezervate.
          </p>
          <div className="flex gap-10">
            {['Linkedin', 'Facebook', 'Twitter'].map(s => <span key={s} className="text-[10px] font-black text-neutral-700 uppercase tracking-widest hover:text-white cursor-none">{s}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
};
