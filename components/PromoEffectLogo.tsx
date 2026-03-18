import React from 'react';

export const PromoEffectLogo = ({ inFooter = false }: { inFooter?: boolean }) => (
    <div className="flex items-center gap-2 group">
      <div className="relative flex items-center justify-center p-1.5 rounded-lg bg-primary-600 shadow-lg shadow-primary-500/20 group-hover:bg-primary-500 transition-colors duration-300">
        <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0 m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 003.375-3.375h1.5a1.125 1.125 0 011.125 1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m6 6v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125-1.125-1.125H9.75M12 15.75M12 12V4.5m0 7.5l-3.75-3.75M12 12l3.75-3.75" />
        </svg>
      </div>
      <span className={`font-heading font-bold text-xl tracking-tight transition-colors ${inFooter ? 'text-neutral-200' : 'text-white'}`}>
        PROMO-EFECT
      </span>
    </div>
);
