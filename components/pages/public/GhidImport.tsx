import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const GhidImport = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Strategic Supply Chain"
      title="Ghid Complet de Import din Asia"
      description="Navigați prin complexitatea comerțului internațional cu un roadmap clar. De la identificarea sursei până la recepția finală în depozit."
      image="/assets/generated/logistics_aerial_hub_1773224370709.png"
    />
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-32">
      <div className="space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">
            Fluxul Strategic de Import
          </h2>
          <p className="text-neutral-500 italic text-sm">
            7 pași fundamentali pentru un Supply Chain rezilient din Asia către Moldova/EU.
          </p>
        </div>
        <div className="space-y-20">
          {[
            {
              s: '01',
              t: 'Identificarea & Vetting-ul Furnizorului',
              d: 'Nu vă limitați la preț. Verificați istoricul de export, capitalul social și certificările de calitate (ISO 9001, CE). Echipa noastră locală din China poate executa acest audit tehnic direct în fabrică.',
            },
            {
              s: '02',
              t: 'Negocierea Incoterms (2020)',
              d: 'Alegeți FOB (Free On Board) pentru a păstra controlul asupra logisticii și costurilor locale din Asia. Evitați CIF deja la destinație.',
            },
            {
              s: '03',
              t: 'Analiză TARIC & Vamuire',
              d: 'Identificați codul HS corect înainte de a plasa comanda. Taxele vamale pot varia între 0% și 15%, influențând critic profitabilitatea.',
            },
            {
              s: '04',
              t: 'Consolidare & Booking (LCL/FCL)',
              d: 'Vă recomandăm rezervarea spațiului cu minimum 14 zile înainte de data gata a mărfii. Pentru volume mici, folosim Hub-ul din Ningbo pentru consolidare săptămânală.',
            },
            {
              s: '05',
              t: 'Controlul Calității la Încărcare',
              d: 'Inspecția finală de tip FRI (Final Random Inspection) asigură că ceea ce s-a produs corespunde specificațiilor din contractul inițial.',
            },
            {
              s: '06',
              t: 'Monitorizare Tranzit AIS',
              d: 'Urmăriți locația exactă a navei prin portalul nostru. Tranzitul mediu este de 35 de zile prin canalul Suez către portul Constanța.',
            },
            {
              s: '07',
              t: 'De-vamuire & Livrare Last-Mile',
              d: 'După acostare, containerele sunt procesate prioritar. Transportul final din port către depozitul dumneavoastră se face cu camioane monitorizate GPS.',
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-10 group">
              <div className="flex-shrink-0">
                <div className="text-5xl font-black text-white/5 italic group-hover:text-primary-500/20 transition-all duration-700">
                  {step.s}
                </div>
              </div>
              <div className="pt-2">
                <h4 className="text-white font-bold italic uppercase tracking-wider mb-4 group-hover:text-primary-500 transition-colors">
                  {step.t}
                </h4>
                <p className="text-neutral-500 text-sm leading-relaxed italic border-l border-white/5 pl-8">
                  {step.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SolidCard className="bg-primary-600/5 border-primary-500/20 p-16 text-center space-y-8">
        <h3 className="text-3xl font-black text-white italic uppercase tracking-widest">
          Ești gata pentru primul import?
        </h3>
        <p className="text-neutral-500 italic max-w-xl mx-auto">
          Consultanții noștri pot oferi un audit gratuit al primului tău proiect de import,
          analizând riscurile și oportunitățile fiscale.
        </p>
        <Button
          size="lg"
          className="bg-primary-600 text-white font-bold h-16 px-16 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.2)]"
          onClick={onLoginRedirect}
        >
          SOLICITĂ CONSULTANȚĂ
        </Button>
      </SolidCard>
    </div>
  </PublicLayout>
);

export default GhidImport;
