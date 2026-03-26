import React from 'react';
import { ShipIcon, ShieldCheckIcon, CheckCircleIcon } from '../../icons';
import { PublicLayout, PageHero, SolidCard } from './_shared';

const FCLTransport = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero
      subtitle="Transport Maritim"
      title="FCL - Full Container Load"
      description="Eficiență maximă pentru volume mari. Control total asupra întregului container, de la poarta fabricii până la destinația finală."
      image="/assets/generated/hero_cargo_ship_night_1773224120207.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
      {/* Section 1: Logic & Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">
            Capacitate Fără Compromis
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed italic">
            Transportul de tip FCL (Full Container Load) este alegerea strategică pentru companiile
            care importă volume semnificative. Prin Promo-Efect, beneficiați de un lanț de
            aprovizionare direct, eliminând manipulările intermediare și reducând riscul de avarie
            la zero.
          </p>
          <div className="space-y-6">
            {[
              {
                t: 'Sigilare Exclusivă',
                d: 'Containerul este încărcat și sigilat la furnizor, fiind deschis doar la destinația finală.',
              },
              {
                t: 'Tranzit Optimizat',
                d: 'Rute directe Shanghai/Ningbo -> Constanța, cu timpi de tranzit minimizați prin contracte prioritare.',
              },
              {
                t: 'Indexare SCFI',
                d: 'Tarifele noastre sunt aliniate la Shanghai Containerized Freight Index pentru transparență totală.',
              },
            ].map((item) => (
              <div key={item.t} className="flex gap-4">
                <div className="mt-1">
                  <CheckCircleIcon className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <h4 className="text-white font-bold italic uppercase text-sm tracking-widest">
                    {item.t}
                  </h4>
                  <p className="text-neutral-600 text-sm mt-1 leading-relaxed">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative group">
          <div className="absolute -inset-4 bg-primary-500/10 blur-3xl rounded-full" />
          <SolidCard className="relative aspect-square flex flex-col items-center justify-center border-primary-500/20 overflow-hidden bg-[#0A0C10]/80">
            <ShipIcon className="w-48 h-48 text-primary-500 opacity-5 absolute -bottom-10 -right-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            <div className="text-center p-10 z-10">
              <div className="text-7xl font-black text-white italic mb-4 tracking-tighter">
                100%
              </div>
              <div className="text-primary-500 font-bold uppercase tracking-[0.4em] text-xs">
                Exclusivitate Spațiu
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] text-neutral-700 font-mono">
              <span>MMSI: 211281000</span>
              <span>STATUS: UNDER WAY</span>
            </div>
          </SolidCard>
        </div>
      </div>

      {/* Technical Schematic Grid */}
      <div className="space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">
            Matricea Echipamentelor
          </h2>
          <p className="text-neutral-500 italic text-sm">
            Specificații brute pentru planificarea precisă a încărcăturii.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              type: "20' DRY VAN",
              vol: '33.2 CBM',
              payload: '28,200 KG',
              dim: '5.89m x 2.35m x 2.39m',
              use: 'Optimizat pentru mărfuri cu densitate mare (piese metalice, materie primă).',
            },
            {
              type: "40' DRY VAN",
              vol: '67.7 CBM',
              payload: '26,700 KG',
              dim: '12.03m x 2.35m x 2.39m',
              use: 'Standardul industrial pentru volume comerciale și bunuri de larg consum.',
            },
            {
              type: "40' HIGH CUBE",
              vol: '76.4 CBM',
              payload: '26,500 KG',
              dim: '12.03m x 2.35m x 2.69m',
              use: 'Maxim de volum pentru mărfuri voluminoase sau ambalaje non-standard.',
            },
          ].map((spec, i) => (
            <SolidCard
              key={i}
              className="bg-[#050608]/50 border-white/5 hover:border-primary-500/20 transition-colors group"
            >
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-primary-500 font-black italic tracking-widest text-lg">
                  {spec.type}
                </h3>
                <div className="w-12 h-6 border border-white/10 rounded flex items-center justify-center text-[8px] text-neutral-600 font-mono group-hover:text-primary-500 transition-colors">
                  ISO 6346
                </div>
              </div>
              <div className="space-y-6 mb-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-neutral-700 text-[8px] uppercase font-bold tracking-[0.2em]">
                      Capacitate Cubică
                    </div>
                    <div className="text-white font-mono text-sm">{spec.vol}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-neutral-700 text-[8px] uppercase font-bold tracking-[0.2em]">
                      Max Payload
                    </div>
                    <div className="text-white font-mono text-sm">{spec.payload}</div>
                  </div>
                </div>
                <div className="space-y-1 pt-4 border-t border-white/5">
                  <div className="text-neutral-700 text-[8px] uppercase font-bold tracking-[0.2em]">
                    Dimensiuni Interioare (L/l/H)
                  </div>
                  <div className="text-neutral-400 font-mono text-[10px]">{spec.dim}</div>
                </div>
              </div>
              <p className="text-neutral-500 text-xs italic leading-relaxed">{spec.use}</p>
            </SolidCard>
          ))}
        </div>
      </div>

      {/* Maritime Insurance Module */}
      <div className="p-12 md:p-20 bg-primary-600/5 rounded-[3rem] border border-primary-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <ShieldCheckIcon className="w-64 h-64 text-primary-500" />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">
              Siguranță Multinivel
            </h2>
            <p className="text-neutral-500 italic leading-relaxed">
              Riscul maritim este o variabilă inevitabilă. Oferim protecție Cargo conform Institute
              Cargo Clauses (A), acoperind riscuri de la avaria comună până la forța majoră,
              asigurându-ne că lichiditatea afacerii tale nu este niciodată compromisă.
            </p>
            <div className="flex flex-wrap gap-4">
              {['Full Risk Coverage', 'General Average Protection', 'Port-to-Port Liability'].map(
                (tier) => (
                  <span
                    key={tier}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] text-white font-bold italic uppercase tracking-wider"
                  >
                    {tier}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-primary-500 font-bold uppercase tracking-[0.2em] text-xs">
              Protocolul de Securitate
            </h4>
            <ul className="space-y-4">
              {[
                'Monitorizare Satelitară 24/7 AIS integration',
                'Senzori de impact și umiditate (la cerere)',
                'Auditare prealabilă a liniei de shipping',
                'Gestiune digitală a tuturor documentelor de transport',
              ].map((p) => (
                <li key={p} className="flex gap-4 text-sm italic text-neutral-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </PublicLayout>
);

export default FCLTransport;
