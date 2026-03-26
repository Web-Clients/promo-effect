import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const Vamuire = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Conformitate Fiscală"
      title="Reprezentare Vamală de Elită"
      description="Simplificăm birocrația. Procesăm documentația vamală rapid și corect pentru a evita întârzierile portuare și amenzile ridicate."
      image="/assets/generated/trade_routes_neon_1773224386483.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Digital HUD & Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        <div className="order-2 md:order-1 relative aspect-video rounded-3xl overflow-hidden border border-white/5 group">
          <img
            src="/assets/generated/smart_logistics_dashboard_mockup_1773224135612.png"
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
            alt="Customs HUD"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-primary-500/10 pointer-events-none" />
          <div className="absolute top-4 right-4 px-3 py-1 bg-primary-600 rounded text-[8px] text-white font-black italic uppercase tracking-[0.2em]">
            LIVE COMPLIANCE
          </div>
        </div>
        <div className="order-1 md:order-2 space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">
            Eficiență Fără Erori
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed italic">
            Sistemul nostru digital colectează automat datele din facturile furnizorului și
            întocmește setul de documente conform legislației UE și RM. Această automatizare reduce
            riscul erorilor umane în codificarea TARIC cu peste 95%.
          </p>
          <div className="space-y-4">
            {[
              {
                t: 'Analiză HS Code',
                d: 'Determinăm codul tarifar optim pentru a asigura cel mai mic nivel de taxe legale.',
              },
              {
                t: 'Customs Value Audit',
                d: 'Verificăm valoarea în vamă pentru a asigura conformitatea cu metodele de evaluare OMC.',
              },
              {
                t: 'Regimuri la Amânare',
                d: 'Soluții pentru plata amânată a TVA prin reprezentare fiscală autorizată.',
              },
            ].map((item) => (
              <div
                key={item.t}
                className="flex gap-4 p-4 border-l-2 border-primary-500 bg-primary-500/5 group hover:bg-primary-500/10 transition-colors"
              >
                <div>
                  <h4 className="text-white font-bold italic uppercase text-[10px] tracking-widest">
                    {item.t}
                  </h4>
                  <p className="text-neutral-600 text-xs mt-1 italic">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Port Costs & EORI Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SolidCard className="lg:col-span-2 space-y-8 p-12">
          <h3 className="text-2xl font-bold text-white uppercase italic tracking-tight">
            Ghidul Costurilor Portuare
          </h3>
          <p className="text-neutral-500 italic text-xs leading-relaxed">
            Dincolo de transport, vamuirea implică taxe locale care trebuie planificate riguros
            pentru a menține prețul de cost sub control:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">
                Taxe Portuare (THC)
              </h5>
              <p className="text-neutral-700 text-[10px] leading-relaxed italic">
                Terminal Handling Charge acoperă manipularea containerului de la navă în stivă.
              </p>
              <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">
                ISPS Security fee
              </h5>
              <p className="text-neutral-700 text-[10px] leading-relaxed italic">
                Taxă de securitate portuară conform normelor internaționale.
              </p>
            </div>
            <div className="space-y-4">
              <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">
                Demurrage & Detention
              </h5>
              <p className="text-neutral-700 text-[10px] leading-relaxed italic">
                Penalități aplicate pentru depășirea timpului liber de utilizare a containerului sau
                stocare portuară.
              </p>
              <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">
                EORI Registration
              </h5>
              <p className="text-neutral-700 text-[10px] leading-relaxed italic">
                Număr unic necesar pentru orice operațiune de import/export în spațiul european.
              </p>
            </div>
          </div>
        </SolidCard>
        <div className="space-y-8 bg-[#0A0C10] border border-white/5 p-12 rounded-[2rem] flex flex-col justify-center">
          <div className="text-center space-y-4">
            <div className="text-4xl font-black text-white italic tracking-tighter">0</div>
            <div className="text-primary-500 font-bold uppercase tracking-[0.2em] text-[10px]">
              Blocaje Vamale în 2025
            </div>
            <p className="text-neutral-600 text-[10px] italic pt-4">
              Performanța noastră rezultă dintr-un audit prealabil de 100% al setului de documente.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full border-white/5 text-white font-bold h-12 text-[10px] tracking-widest uppercase italic"
            onClick={onLoginRedirect}
          >
            VERIFICĂ HS CODE
          </Button>
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default Vamuire;
