import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const Preturi = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Tranzacționare"
      title="Transparență Totală a Costurilor"
      description="Eliminăm taxele ascunse. Structura noastră de prețuri este bazată pe volume reale și cotații portuare la zi."
      image="/assets/generated/trade_routes_neon_1773224386483.png"
    />

    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Dynamic Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            title: "Standard FCL 20'",
            price: 'Market Rate',
            desc: 'Cotații SPOT bazate pe cererea actuală din porturile Shanghai/Ningbo.',
          },
          {
            title: 'Grupaj LCL (CBM)',
            price: '$85* / W/M',
            desc: 'Tarif bazat pe greutate sau volum, incluzând consolidarea profesională.',
          },
          {
            title: 'Consultanță / Audit',
            price: 'Custom',
            desc: 'Audit de fabrică și controlul calității AQL 2.5 la sursă.',
          },
        ].map((item, i) => (
          <SolidCard
            key={i}
            className="text-center group border-white/5 hover:border-primary-500/30 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            <h3 className="text-neutral-700 font-bold uppercase tracking-[0.3em] text-[8px] mb-6">
              {item.title}
            </h3>
            <div className="text-4xl font-black text-white italic mb-6 group-hover:text-primary-500 transition-colors tracking-tighter">
              {item.price}
            </div>
            <p className="text-neutral-600 text-[10px] italic mb-10 leading-relaxed px-4">
              {item.desc}
            </p>
            <Button
              variant="outline"
              className="w-full border-white/10 text-white font-bold h-12 text-[10px] uppercase tracking-widest italic hover:bg-white/5"
              onClick={onLoginRedirect}
            >
              DETALII COTAȚIE
            </Button>
          </SolidCard>
        ))}
      </div>

      {/* Surcharges & Variables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">
            Structura Surcharge-urilor
          </h2>
          <p className="text-neutral-500 leading-relaxed italic text-sm">
            Prețurile noastre sunt defalcate pentru o transparență radicală. Înțelegerea acestor
            variabile vă permite să anticipați costurile Supply Chain-ului:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { n: 'BAF', d: 'Bunker Adjustment Factor (Combustibil)' },
              { n: 'CAF', d: 'Currency Adjustment Factor (Valutar)' },
              { n: 'THC', d: 'Terminal Handling (Manipulare Port)' },
              { n: 'DOC', d: 'Documentation Fees (Vamuire)' },
            ].map((v) => (
              <div
                key={v.n}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/2 border border-white/5"
              >
                <span className="text-primary-500 font-black italic text-xs underline underline-offset-4 decoration-primary-500/20">
                  {v.n}
                </span>
                <span className="text-neutral-600 text-[10px] italic font-bold uppercase tracking-widest">
                  {v.d}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-12 rounded-[2.5rem] bg-gradient-to-br from-primary-600/10 to-transparent border border-primary-500/20 text-center flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 mx-auto mb-6 px-4 py-1 rounded-full bg-primary-600/20 border border-primary-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.2em] italic">
              Open Pricing Model
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-6 uppercase italic tracking-tighter">
            Fără Taxe Ascunse
          </h2>
          <p className="text-neutral-600 text-xs italic mb-10 mx-auto max-w-sm">
            Dacă cotația inițială nu menționează o taxă, noi o acoperim. Garantăm stabilitatea
            prețului pe durata tranzitului.
          </p>
          <Button
            className="bg-primary-600 text-white font-bold h-14 px-10 rounded-full shadow-[0_10px_40px_rgba(249,115,22,0.3)] animate-glow"
            onClick={onLoginRedirect}
          >
            SOLICITĂ OFERTĂ FERMĂ
          </Button>
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default Preturi;
