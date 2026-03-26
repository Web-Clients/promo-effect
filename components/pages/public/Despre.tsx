import React from 'react';
import { PublicLayout, PageHero } from './_shared';

const Despre = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Identitate"
      title="Istoria Excelenței în Logistică"
      description="Promo-Efect s-a născut din nevoia de digitalizare a unei industrii blocate în procese manuale și lipsă de transparență."
      image="/assets/generated/consultation_futuristic_1773224405458.png"
    />

    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
        {[
          { label: 'Volume Anuale', value: '5k+ TEU' },
          { label: 'Piață Deservită', value: 'EU & UA' },
          { label: 'Experiență Vamală', value: '15+ Ani' },
        ].map((stat, i) => (
          <div key={i}>
            <div className="text-6xl font-black text-white italic mb-2 tracking-tighter">
              {stat.value}
            </div>
            <div className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-10 uppercase italic tracking-tight">
          Viziunea Noastră
        </h2>
        <p className="text-neutral-500 text-xl font-medium italic leading-relaxed">
          Credem că logistica globală trebuie să fie la fel de simplă ca un transfer bancar.
          Investim constant în tehnologie proprie pentru a reduce barierele administrative și a
          oferi clienților noștri certitudine totală.
        </p>
      </div>
    </div>
  </PublicLayout>
);

export default Despre;
