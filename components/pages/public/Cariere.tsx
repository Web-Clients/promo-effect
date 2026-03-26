import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const Cariere = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Talente Alpha"
      title="Construiește Viitorul Logisticii"
      description="Căutăm gânditori strategici, experți în Supply Chain și pasionați de tehnologie pentru a ni se alătura în Chișinău și Asia."
      image="/assets/generated/media__1773226091381.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Why Us */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {[
          {
            t: 'Stack Tehnologic',
            d: 'Lucrăm cu instrumente proprietary de tracking și AI pentru a optimiza rutele comerciale.',
          },
          {
            t: 'Impact Global',
            d: 'Coordonezi mișcarea a mii de tone de marfă între cele mai mari hub-uri ale lumii.',
          },
          {
            t: 'Evoluție Rapidă',
            d: 'Promovăm meritocrația. Performanța ta determină direct ascensiunea în ierarhie.',
          },
        ].map((benefit, i) => (
          <SolidCard
            key={i}
            className="bg-white/2 border-white/5 p-8 hover:bg-white/5 transition-colors"
          >
            <h4 className="text-primary-500 font-bold italic uppercase text-xs tracking-widest mb-4">
              {benefit.t}
            </h4>
            <p className="text-neutral-500 text-sm italic leading-relaxed">{benefit.d}</p>
          </SolidCard>
        ))}
      </div>

      {/* Hiring Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">
            Roadmap de Aplicare
          </h2>
          <p className="text-neutral-500 italic leading-relaxed">
            Procesul nostru de selecție este riguros, dar transparent. Căutăm acea combinație rară
            de precizie tehnică și instict comercial.
          </p>
          <div className="space-y-6">
            {[
              { s: 'Review CV', d: 'Evaluăm experiența ta în domeniu sau potențialul tech.' },
              {
                s: 'Interviu Tehnic',
                d: 'Discutăm cazuri reale de logistică sau arhitectură software.',
              },
              { s: 'Cultural Fit', d: 'Să vedem dacă împărțim aceeași viziune "Solid Premium".' },
              {
                s: 'Onboarding Alpha',
                d: 'Intri direct în nucleul operațional alături de un mentor senior.',
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="text-neutral-800 font-black italic text-3xl">0{i + 1}</div>
                <div>
                  <h5 className="text-white font-bold italic uppercase text-sm tracking-widest">
                    {step.s}
                  </h5>
                  <p className="text-neutral-600 text-xs italic mt-1">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-8">
          <h3 className="text-2xl font-bold text-white uppercase italic tracking-widest text-center mb-10">
            Poziții Deschise
          </h3>
          <div className="space-y-4">
            {[
              { title: 'Freight Forwarder Senior', type: 'Full-time', loc: 'Chișinău' },
              { title: 'Specialist Vămuire', type: 'Full-time', loc: 'Chișinău / Constanța' },
              { title: 'Account Manager Asia', type: 'Remote / Shanghai', loc: 'Global' },
            ].map((job, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-white/5 bg-[#0A0C10] flex flex-col md:flex-row justify-between items-center group hover:border-primary-500/30 transition-all"
              >
                <div className="text-center md:text-left">
                  <h4 className="text-white font-bold italic uppercase tracking-widest group-hover:text-primary-500 transition-colors">
                    {job.title}
                  </h4>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] text-neutral-600 font-bold uppercase italic">
                      {job.type}
                    </span>
                    <span className="text-[10px] text-primary-500 font-bold uppercase italic tracking-widest">
                      {job.loc}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-6 md:mt-0 border-white/10 text-white font-bold text-[10px] uppercase tracking-widest italic"
                  onClick={onLoginRedirect}
                >
                  APLICĂ ACUM
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default Cariere;
