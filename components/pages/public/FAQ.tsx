import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const FAQ = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Knowledge Base"
      title="Suport & Întrebări Frecvente"
      description="Găsește rapid răspunsuri tehnice la cele mai comune provocări din logistica internațională."
      image="/assets/generated/consultation_futuristic_1773224405458.png"
    />
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-8">
      {[
        {
          q: 'Cât durează tranzitul maritim din porturile principale asiatice?',
          a: 'În mod standard, o navă directă face între 32 și 38 de zile din Shanghai/Ningbo până în Constanța. Pentru Chișinău, adăugați 2-3 zile pentru vamuire și transport rutier.',
        },
        {
          q: 'Cum se calculează taxele vamale și TVA la import?',
          a: 'Taxele se calculează la valoarea CIF a mărfii. TVA-ul RM este de 20%, aplicat la valoarea vămuită. Putem simula aceste costuri în portalul de client.',
        },
        {
          q: 'Ce reprezintă numărul EORI și cine are nevoie de el?',
          a: 'EORI este codul unic de înregistrare pentru operațiuni vamale în UE. Orice firmă care importă trebuie să îl obțină de la Direcția Generală a Vămilor.',
        },
        {
          q: 'Care este diferența dintre FOB și EXW pentru un importator?',
          a: 'În FOB furnizorul plătește transportul până în portul de plecare. În EXW, dumneavoastră preluați toate costurile de la ușa fabricii. Recomandăm FOB pentru simplitate.',
        },
        {
          q: 'Este marfa mea asigurată automat în caz de avarie maritimă?',
          a: 'Nu automat. Oferim asigurare de tip Cargo (All-Risks) ca serviciu opțional, dar esențial pentru a acoperi avaria comună pe mare.',
        },
      ].map((item, i) => (
        <SolidCard key={i} className="p-10 hover:border-primary-500/20 transition-all group">
          <div className="flex gap-6">
            <span className="text-primary-500 font-black italic text-2xl">?</span>
            <div className="space-y-4">
              <h3 className="text-white font-bold italic uppercase tracking-wider text-sm">
                {item.q}
              </h3>
              <p className="text-neutral-600 text-sm leading-relaxed italic">{item.a}</p>
            </div>
          </div>
        </SolidCard>
      ))}
      <div className="pt-20 text-center">
        <p className="text-neutral-700 italic text-xs mb-8">
          Nu ai găsit răspunsul căutat? Experții noștri sunt online.
        </p>
        <Button
          variant="outline"
          className="border-white/5 text-white font-bold h-14 px-12 rounded-full italic uppercase tracking-widest text-[10px]"
          onClick={onLoginRedirect}
        >
          CONTACTEAZĂ UN EXPERT
        </Button>
      </div>
    </div>
  </PublicLayout>
);

export default FAQ;
