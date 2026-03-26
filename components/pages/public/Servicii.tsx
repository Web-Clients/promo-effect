import React from 'react';
import { ShipIcon, GlobeIcon, ShieldCheckIcon, ZapIcon, CheckCircleIcon } from '../../icons';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const Servicii = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Capabilități Operative"
      title="Soluții Logistice End-to-End"
      description="De la consultanță în China până la vămuire și transport final, operăm un lanț de aprovizionare integrat."
      image="/assets/generated/hero_cargo_ship_night_1773224120207.png"
    />

    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            icon: ShipIcon,
            title: 'FCL - Container Întreg',
            desc: 'Soluții dedicate de transport containerizat pentru volume mari, cu monitorizare satelitară.',
          },
          {
            icon: ZapIcon,
            title: 'LCL - Grupaj',
            desc: 'Transportul eficient al volumelor mici prin consolidare inteligentă în hub-urile noastre.',
          },
          {
            icon: ShieldCheckIcon,
            title: 'Consultanță Vamală',
            desc: 'Reprezentare fiscală și optimizare taxe porto-vamale de către experți de elită.',
          },
          {
            icon: GlobeIcon,
            title: 'Global Sourcing',
            desc: 'Verificarea furnizorilor și controlul calității mărfurilor direct la sursă în Asia.',
          },
        ].map((s, i) => (
          <SolidCard key={i}>
            <div className="h-12 w-12 rounded-xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center text-primary-500 mb-8">
              <s.icon className="h-6 w-6" />
            </div>
            <h3 className="text-white font-bold mb-4 uppercase italic tracking-tight">{s.title}</h3>
            <p className="text-neutral-500 text-sm font-medium italic leading-relaxed">{s.desc}</p>
          </SolidCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <span className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block">
            Optimizare
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight uppercase italic mb-8">
            Eficiență Fără Margină.
          </h2>
          <p className="text-neutral-500 text-lg font-medium italic leading-relaxed mb-10">
            Nu ne limităm la transport. Analizăm fiecare aspect al fluxului tău de mărfuri pentru a
            identifica rutele cele mai scurte și punctele de optimizare fiscală care îți cresc marja
            de profit.
          </p>
          <ul className="space-y-6">
            {[
              'Timp de tranzit redus cu 15%',
              'Costuri portuare optimizate',
              'Transparență totală prin API',
            ].map((item) => (
              <li key={item} className="flex items-center gap-4 text-white font-bold italic">
                <CheckCircleIcon className="h-5 w-5 text-primary-500" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/5">
          <img
            src="/assets/generated/modern_warehouse_tech_1773224152286.png"
            className="w-full h-full object-cover grayscale opacity-50"
            alt="Warehousing"
          />
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default Servicii;
