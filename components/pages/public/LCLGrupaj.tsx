import React from 'react';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const LCLGrupaj = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Consolidare Inteligentă"
      title="LCL - Less Than Container Load"
      description="Plătiți doar pentru spațiul pe care îl utilizați. Soluția flexibilă pentru afaceri în creștere și importuri frecvente."
      image="/assets/generated/logistics_aerial_hub_1773224370709.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Network & Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="order-2 lg:order-1 relative aspect-video rounded-3xl overflow-hidden border border-white/5 grayscale group">
          <img
            src="/assets/generated/trade_routes_neon_1773224386483.png"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
            alt="Hub Network"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent" />
          <div className="absolute bottom-6 left-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-white font-black italic uppercase text-[10px] tracking-widest">
                NINGBO HUB ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse delay-75" />
              <span className="text-white font-black italic uppercase text-[10px] tracking-widest">
                SHANGHAI CONSOLIDATION LIVE
              </span>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2 space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">
            Matricea de Consolidare
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed italic">
            Sistemul nostru LCL (Less than Container Load) este integrat într-o rețea de hub-uri
            eurasiatice care garantează plecări săptămânale indiferent de volumul total de marfă al
            pieței. Această stabilitate permite clienților noștri să mențină un inventar
            Just-In-Time.
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="p-6 border-l-2 border-primary-500 bg-primary-500/5">
              <div className="text-3xl font-black text-white italic tracking-tighter">
                SĂPTĂMÂNAL
              </div>
              <div className="text-primary-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2 italic">
                Frecvență Plecări
              </div>
            </div>
            <div className="p-6 border-l-2 border-white/10 bg-white/5">
              <div className="text-3xl font-black text-white italic tracking-tighter">NINGBO</div>
              <div className="text-white/40 font-bold uppercase tracking-[0.4em] text-[10px] mt-2 italic">
                Hub Principal Asia
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CBM Logic Breakdown */}
      <div className="space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">
            Logica Calculului Volumetric
          </h2>
          <p className="text-neutral-500 italic text-sm">
            Înțelegerea raportului Greutate/Volum pentru optimizarea costurilor.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <SolidCard className="bg-[#0A0C10] border-white/5 p-10 group">
            <h4 className="text-primary-500 font-black italic uppercase text-xs tracking-[0.3em] mb-8">
              Standardul Maritim
            </h4>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-6xl font-black text-white italic tracking-tighter leading-none">
                1:1000
              </span>
            </div>
            <p className="text-neutral-600 text-sm leading-relaxed italic mb-8">
              În transportul maritim LCL, 1 metru cub (CBM) este echivalentul a 1,000 kg. Taxarea se
              face pe valoarea cea mai mare dintre volumul real și greutatea convertită.
            </p>
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex justify-between text-[10px] font-bold uppercase italic tracking-widest">
                <span className="text-neutral-700">Formula CBM:</span>
                <span className="text-white">L (m) x l (m) x H (m)</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase italic tracking-widest">
                <span className="text-neutral-700">Exemplu:</span>
                <span className="text-white">1.2m x 0.8m x 1m = 0.96 CBM</span>
              </div>
            </div>
          </SolidCard>
          <div className="space-y-8 flex flex-col justify-center">
            <div className="space-y-4 pt-8">
              <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">
                Protocoale de Siguranță LCL
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    t: 'Segregare Marfă',
                    d: 'Mărfurile periculoase (DG) sunt strict separate de bunurile generale.',
                  },
                  {
                    t: 'Paletizare Standard',
                    d: 'Toate pachetele individuale sunt fixate pe palete tratate ISPM15.',
                  },
                  {
                    t: 'Audit vizual',
                    d: 'Fiecare unitate este fotografiată la intrarea în hub-ul de consolidare.',
                  },
                ].map((p) => (
                  <div
                    key={p.t}
                    className="p-4 rounded-xl border border-white/5 bg-white/2 hover:border-primary-500/20 transition-all"
                  >
                    <h5 className="text-white font-bold italic text-xs tracking-widest uppercase mb-1">
                      {p.t}
                    </h5>
                    <p className="text-neutral-500 text-[10px] italic">{p.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <div className="space-y-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">
            Workflow Operațional LCL
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              n: '01',
              t: 'Consolidare Hub',
              d: 'Marfa este colectată în Ningbo/Shanghai și stivuită strategic pentru maximă protecție.',
            },
            {
              n: '02',
              t: 'Analiză Vamală',
              d: 'Verificarea documentelor înainte de plecare pentru a preveni reținerile în portul Constanța.',
            },
            {
              n: '03',
              t: 'Tranzit Maritim',
              d: 'Monitorizare activă prin satelit pe toată durata celor 35-42 de zile de navigație.',
            },
            {
              n: '04',
              t: 'Deconsolidare',
              d: 'Sortare rapidă în Chișinău/Constanța și pregătire pentru livrarea la ușă.',
            },
          ].map((step, i) => (
            <div key={i} className="relative group">
              <div className="text-6xl font-black text-white/5 mb-6 group-hover:text-primary-500/20 transition-all italic duration-500">
                {step.n}
              </div>
              <h4 className="text-white font-bold italic uppercase tracking-widest mb-4 group-hover:text-primary-500 transition-colors">
                {step.t}
              </h4>
              <p className="text-neutral-600 text-xs leading-relaxed italic">{step.d}</p>
              {i < 3 && (
                <div className="hidden md:block absolute top-[2.5rem] -right-4 w-8 h-px bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default LCLGrupaj;
