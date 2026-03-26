import React from 'react';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const ConsultantaChina = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Expertiză la Sursă"
      title="Consultanță și Sourcing China"
      description="Navigăm complexitatea pieței asiatice pentru tine. Verificarea furnizorilor, controlul calității și negociere contracte."
      image="/assets/generated/consultation_futuristic_1773224405458.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Audit Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">
            Ierarhia Auditului
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed italic">
            Riscul în China nu este găsirea unui furnizor, ci găsirea partenerului *sustenabil*.
            Echipa noastră locală execută un protocol de audit ierarhic, asigurându-vă că investiția
            este protejată prin contracte blindate sub jurisdicție locală și europeană.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                t: 'Verificare Juridică',
                d: 'Validăm licența de business (Business License) și dreptul de export (Export License).',
              },
              {
                t: 'Analiză Financiară',
                d: 'Audităm capitalul social și solvabilitatea furnizorului prin baze de date chineze.',
              },
              {
                t: 'Capacitate Productivă',
                d: 'Inspecție fizică a utilajelor, numărului de angajați și fluxului de producție.',
              },
              {
                t: 'Sistem de Management',
                d: 'Verificăm conformitatea cu standardele ISO 9001 și BSCI (Social Compliance).',
              },
            ].map((item) => (
              <div
                key={item.t}
                className="p-6 bg-[#0A0C10] border border-white/5 rounded-2xl hover:border-primary-500/20 transition-colors"
              >
                <h4 className="text-primary-500 font-bold italic uppercase text-xs tracking-widest mb-2">
                  {item.t}
                </h4>
                <p className="text-neutral-600 text-xs italic leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/5 grayscale group">
          <img
            src="/assets/generated/consultation_futuristic_1773224405458.png"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            alt="Sourcing Audit"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-primary-500/5" />
        </div>
      </div>

      {/* QC & AQL Standards */}
      <div className="space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">
            Controlul Calității (AQL 2.5)
          </h2>
          <p className="text-neutral-500 italic text-sm">
            Standarde statistice riguroase pentru minimizarea defectelor.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              t: 'Initial Check (IPC)',
              d: 'Verificarea primei unități de producție și a materiilor prime folosite.',
            },
            {
              t: 'During Production (DUPRO)',
              d: 'Inspecție la 30-50% din proces pentru a corecta erorile sistemice.',
            },
            {
              t: 'Final Inspection (FRI)',
              d: 'Verificare finală înainte de încărcarea containerului (Final Random Inspection).',
            },
          ].map((check, i) => (
            <SolidCard
              key={i}
              className="text-center border-white/5 hover:border-primary-500/30 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary-500 font-black italic mx-auto mb-6">
                0{i + 1}
              </div>
              <h4 className="text-white font-bold italic uppercase tracking-wider mb-4">
                {check.t}
              </h4>
              <p className="text-neutral-600 text-xs italic leading-relaxed">{check.d}</p>
            </SolidCard>
          ))}
        </div>
      </div>

      {/* Category Expertise */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-white uppercase italic tracking-tight">
            Expertiză pe Verticale
          </h3>
          <p className="text-neutral-500 italic text-sm leading-relaxed">
            Nu operăm generic. Avem specialiști dedicați pentru categorii specifice de marfă,
            cunoscând reglementările CE și cerințele tehnice locale pentru:
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              'Electronică',
              'Textile/Fashion',
              'Industrial/Utilaje',
              'Consumer Goods',
              'Auto Parts',
            ].map((cat) => (
              <span
                key={cat}
                className="px-6 py-2 border border-white/5 rounded-full text-xs text-neutral-400 font-bold italic uppercase hover:text-white hover:border-primary-500/50 transition-all cursor-default"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        <SolidCard className="bg-primary-600/5 border-primary-500/10 p-10">
          <div className="text-sm text-primary-500 font-black italic uppercase tracking-[0.3em] mb-4">
            Statistici 2024
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-neutral-500 text-[10px] uppercase font-bold italic">
                Furnizori Auditați
              </span>
              <span className="text-white font-mono text-lg font-black tracking-tighter">450+</span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-neutral-500 text-[10px] uppercase font-bold italic">
                Rata de Respingere QC
              </span>
              <span className="text-primary-500 font-mono text-lg font-black tracking-tighter">
                12.5%
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-neutral-500 text-[10px] uppercase font-bold italic">
                Clienti Activi Sourcing
              </span>
              <span className="text-white font-mono text-lg font-black tracking-tighter">85+</span>
            </div>
          </div>
        </SolidCard>
      </div>
    </div>
  </PublicLayout>
);

export default ConsultantaChina;
