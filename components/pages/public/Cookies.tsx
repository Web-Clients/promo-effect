import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, SolidCard } from './_shared';

const Cookies = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-16 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
          Cookie Policy & Settings
        </h1>
        <p className="text-neutral-500 italic text-sm max-w-xl mx-auto">
          Transparență tehnologică totală. Utilizăm cookie-uri pentru a asigura o experiență
          securizată și optimizată în portalul nostru B2B.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 text-left">
        {[
          {
            t: '1. Cookie-uri Esențiale (Strict Necessary)',
            d: 'Acestea sunt vitale pentru securitatea sesiunii și integritatea datelor dumneavoastră financiare (ex. token-uri CSRF, ID-uri de sesiune securizată). Portalul nu poate funcționa fără aceste tehnologii.',
            s: 'ACTIV PERMANENT',
          },
          {
            t: '2. Cookie-uri de Performanță și Optimizare',
            d: 'Folosite pentru a echilibra încărcarea pe serverele noastre globale (Load Balancing) și pentru a asigura livrarea rapidă a documentelor tehnice prin rețeaua noastră de tip CDN.',
            s: 'ACTIV - DEFAULT',
          },
          {
            t: '3. Cookie-uri de Preferințe Regionale',
            d: 'Stochează parametrii regiunii dumneavoastră pentru a pre-selecta automat porturile de descărcare relevante și moneda de calcul a taxelor vamale în simulator.',
            s: 'OPȚIONAL',
          },
          {
            t: '4. Cookie-uri Analitice (Anonymized)',
            d: 'Măsurăm anonim interacțiunea cu paginile publice pentru a identifica eventualele blocaje în navigare și a optimiza viteza de încărcare a resurselor vizuale grele.',
            s: 'OPȚIONAL',
          },
        ].map((c, i) => (
          <SolidCard
            key={i}
            className={`p-8 ${i > 1 ? 'opacity-70 group hover:opacity-100' : 'border-primary-500/20 bg-primary-600/5'}`}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2 max-w-2xl">
                <h3 className="text-white font-bold italic uppercase text-sm tracking-widest">
                  {c.t}
                </h3>
                <p className="text-neutral-600 text-xs italic leading-relaxed">{c.d}</p>
              </div>
              <div
                className={`flex-shrink-0 text-[10px] font-black italic uppercase tracking-widest px-4 py-2 rounded-full border ${i <= 1 ? 'text-primary-500 border-primary-500/30' : 'text-neutral-700 border-white/5'}`}
              >
                {c.s}
              </div>
            </div>
          </SolidCard>
        ))}
      </div>

      <div className="pt-10 flex flex-col md:flex-row gap-4 justify-center">
        <Button
          className="bg-primary-600 text-white font-bold h-16 px-12 rounded-full uppercase tracking-widest italic"
          onClick={() => window.location.reload()}
        >
          SALVEAZĂ PREFERINȚELE
        </Button>
        <Button
          variant="outline"
          className="border-white/5 text-neutral-400 font-bold h-16 px-12 rounded-full uppercase tracking-widest italic hover:text-white"
          onClick={() => window.location.reload()}
        >
          DOAR ESENȚIALE
        </Button>
      </div>
    </div>
  </PublicLayout>
);

export default Cookies;
