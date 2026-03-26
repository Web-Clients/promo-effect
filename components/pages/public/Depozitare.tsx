import React from 'react';
import { PublicLayout, PageHero } from './_shared';

const Depozitare = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Infrastructură Alpha"
      title="Hub-uri Logistice & Depozitare"
      description="Puncte strategice de stocare în Constanța și Chișinău. Securitate maximă și gestiune digitalizată a stocurilor prin AI-WMS."
      image="/assets/generated/modern_warehouse_tech_1773224152286.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: WMS Logic & Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">
            Ecosistemul WMS
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed italic">
            Depozitele Promo-Efect operează sub un Warehouse Management System (WMS) de ultimă
            generație, permițând vizibilitatea live a inventarului și trasabilitatea fiecărui SKU
            prin tehnologie scan-and-track.
          </p>
          <div className="space-y-4">
            {[
              {
                t: 'Inbound Logic',
                d: 'Auditarea integrității paletului la recepție și alocarea dinamică a spațiului de stivuire.',
              },
              {
                t: 'Batch & Expiry tracking',
                d: 'Gestiunea automată a loturilor și termenelor de valabilitate pentru produse sensibile.',
              },
              {
                t: 'Omnichannel Ready',
                d: 'Integrare API cu platformele de e-commerce pentru fulfillment automatizat.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-4 p-6 rounded-2xl bg-white/2 border border-white/5 hover:border-primary-500/10 transition-all"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center text-primary-500 font-black italic">
                  0{i + 1}
                </div>
                <div>
                  <h4 className="text-white font-bold italic uppercase text-xs tracking-widest">
                    {item.t}
                  </h4>
                  <p className="text-neutral-700 text-[10px] mt-1 italic">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/5 grayscale hover:grayscale-0 transition-all duration-1000 group">
          <img
            src="/assets/generated/modern_warehouse_tech_1773224152286.png"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
            alt="AI Warehouse"
          />
          <div className="absolute inset-0 bg-primary-500/5 mix-blend-overlay" />
          <div className="absolute top-6 left-6 px-4 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-white font-black italic uppercase tracking-widest">
            WMS SYSTEM: ACTIVE
          </div>
        </div>
      </div>

      {/* Environment & Security Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            t: 'Securitate Tier-3',
            d: 'Supraveghere video 4K, control acces biometric și pază umană 24/7.',
          },
          {
            t: 'Control Climatic',
            d: 'Monitorizare senzorială a umidității și temperaturii pentru mărfuri tech/textile.',
          },
          {
            v: '2,500 KG',
            t: 'Max Floor Load',
            d: 'Infrastructură capabilă să susțină utilaje grele și stocuri industriale densificate.',
          },
        ].map((spec, i) => (
          <div
            key={i}
            className="p-10 border border-white/5 bg-[#0A0C10] rounded-[2rem] text-center space-y-4 hover:bg-white/2 transition-colors"
          >
            {spec.v && (
              <div className="text-2xl font-black text-white italic tracking-tighter">{spec.v}</div>
            )}
            <h4 className="text-primary-500 font-black italic uppercase text-xs tracking-widest">
              {spec.t}
            </h4>
            <p className="text-neutral-700 text-xs italic leading-relaxed">{spec.d}</p>
          </div>
        ))}
      </div>

      {/* Region Mapping */}
      <div className="p-12 md:p-20 border border-white/5 bg-white/2 rounded-[4rem] text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">
            Noduri Strategice de Distribuție
          </h2>
          <p className="text-neutral-500 italic max-w-2xl mx-auto text-sm leading-relaxed">
            Capacitățile noastre sunt divizate strategic pentru a acoperi terminalul maritim și
            poarta de intrare în Moldova și România Nord.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6 text-left p-8 bg-[#050608] rounded-3xl border border-white/5">
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Chișinău Hub
              </h3>
              <span className="text-primary-500 font-bold text-[10px] tracking-widest">
                ZONA LIBERĂ
              </span>
            </div>
            <div className="space-y-2">
              {[
                'Full Cross-Docking',
                'Audit Tehnic la Receptie',
                'Distributie Locală (Last Mile)',
              ].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-3 text-neutral-600 text-xs italic font-bold"
                >
                  <div className="w-1 h-1 bg-primary-500 rounded-full" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6 text-left p-8 bg-[#050608] rounded-3xl border border-white/5">
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Constanța Terminal
              </h3>
              <span className="text-neutral-500 font-bold text-[10px] tracking-widest uppercase">
                Regim Vamal
              </span>
            </div>
            <div className="space-y-2">
              {['Acces Direct Portual', 'Buffer Storage pt Export', 'Manipulare Agabaritică'].map(
                (f) => (
                  <div
                    key={f}
                    className="flex items-center gap-3 text-neutral-600 text-xs italic font-bold"
                  >
                    <div className="w-1 h-1 bg-neutral-600 rounded-full" /> {f}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default Depozitare;
