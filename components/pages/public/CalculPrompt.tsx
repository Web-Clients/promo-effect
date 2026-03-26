import React from 'react';
import { CalculatorIcon } from '../../icons';
import { Button } from '../../ui/Button';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const CalculPrompt = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Cotare Instant"
      title="Calcul Prompt al Costurilor"
      description="Obține o estimare imediată pentru transportul tău. Algoritmul nostru analizează rutele disponibile și taxele actuale."
      image="/assets/generated/smart_logistics_dashboard_mockup_1773224135612.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Landed Cost Logic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">
            Formula Landed Cost
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed italic">
            Spre deosebire de calculatoarele generice, Promo-Efect integrează realitatea fiscală a
            regiunii. Calculul nostru include nu doar transportul, ci și taxele portuare,
            comisioanele vamale și TVA-ul de import, oferindu-vă prețul real de descărcare la
            depozit.
          </p>
          <div className="p-8 bg-[#0A0C10] border border-primary-500/20 rounded-3xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CalculatorIcon className="w-32 h-32 text-primary-500" />
            </div>
            <div className="space-y-4 font-mono text-xs z-10 relative">
              <div className="flex justify-between text-neutral-600">
                <span>PRODUCT VALUE (FOB)</span>
                <span className="text-white">VAR(A)</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>OCEAN FREIGHT + BAF</span>
                <span className="text-white">+ VAR(B)</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>PORT HANDLING (THC)</span>
                <span className="text-white">+ VAR(C)</span>
              </div>
              <div className="flex justify-between text-neutral-600 border-b border-white/5 pb-2">
                <span>CUSTOMS DUTY (%)</span>
                <span className="text-white">+ %VAR(D)</span>
              </div>
              <div className="flex justify-between text-primary-500 font-bold text-sm pt-2">
                <span>TOTAL LANDED COST</span>
                <span>= ESTIMATE</span>
              </div>
            </div>
          </div>
        </div>
        <SolidCard className="bg-[#050608]/80 border-primary-500/30 p-12 text-center group">
          <div className="w-20 h-20 rounded-2xl bg-primary-600/10 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
            <CalculatorIcon className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-3xl font-black text-white italic mb-6 tracking-tighter uppercase">
            Simulator Portal
          </h3>
          <p className="text-neutral-500 italic mb-10 leading-relaxed">
            Pentru a procesa datele specifice (HS Code, Greutate Brută, Port de Plecare) și a obține
            o cotație oficială cu asigurare inclusă, vă rugăm să utilizați platforma noastră
            centralizată.
          </p>
          <Button
            size="lg"
            className="w-full bg-primary-600 text-white font-bold h-16 rounded-full uppercase tracking-[0.3em] text-xs shadow-[0_0_30px_rgba(249,115,22,0.2)]"
            onClick={onLoginRedirect}
          >
            ACCESEAZĂ SIMULATORUL
          </Button>
        </SolidCard>
      </div>

      {/* Precision Variables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            t: 'Live FX Rates',
            d: 'Calculele sunt sincronizate cu ratele de schimb ale Băncii Centrale (BNM/BNR).',
          },
          {
            t: 'Indexare SCFI',
            d: 'Costul de transport se ajustează automat în funcție de volatilitatea pieței asiatice.',
          },
          {
            t: 'Predictibilitate VAT',
            d: 'Simulăm impactul TVA de import asupra cash-flow-ului tău operațional.',
          },
        ].map((v, i) => (
          <div
            key={i}
            className="p-8 border border-white/5 rounded-3xl bg-white/2 hover:border-primary-500/20 transition-all"
          >
            <h4 className="text-white font-black italic uppercase text-xs tracking-widest mb-4">
              {v.t}
            </h4>
            <p className="text-neutral-600 text-[10px] leading-relaxed italic">{v.d}</p>
          </div>
        ))}
      </div>
    </div>
  </PublicLayout>
);

export default CalculPrompt;
