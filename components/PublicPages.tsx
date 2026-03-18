import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShipIcon, CalculatorIcon, GlobeIcon, 
  ShieldCheckIcon, ClockIcon, PhoneIcon,
  MapPinIcon, MailIcon, BarChart3Icon,
  ZapIcon, CheckCircleIcon, ArrowRightIcon
} from './icons';
import { Button } from './ui/Button';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

const PublicLayout = ({ children, onLoginRedirect }: { children: React.ReactNode, onLoginRedirect: () => void }) => (
  <div className="bg-[#050608] min-h-screen selection:bg-primary-500/30 font-sans antialiased text-neutral-300">
    <PublicHeader onLoginRedirect={onLoginRedirect} />
    <main className="pt-20">
      {children}
    </main>
    <PublicFooter />
  </div>
);

const PageHero = ({ subtitle, title, description, image }: any) => (
  <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/80 via-[#050608]/40 to-[#050608] z-10" />
      <img src={image} className="w-full h-full object-cover grayscale opacity-40" alt={title} />
    </div>
    <div className="relative z-20 text-center max-w-4xl px-6">
      <motion.span 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block"
      >
        {subtitle}
      </motion.span>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight uppercase italic mb-8"
      >
        {title}
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-neutral-400 text-lg md:text-xl font-medium italic leading-relaxed"
      >
        {description}
      </motion.p>
    </div>
  </section>
);

const SolidCard = ({ children, className = "" }: any) => (
  <div className={`bg-[#0A0C10] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

export const Servicii = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
            { icon: ShipIcon, title: "FCL - Container Întreg", desc: "Soluții dedicate de transport containerizat pentru volume mari, cu monitorizare satelitară." },
            { icon: ZapIcon, title: "LCL - Grupaj", desc: "Transportul eficient al volumelor mici prin consolidare inteligentă în hub-urile noastre." },
            { icon: ShieldCheckIcon, title: "Consultanță Vamală", desc: "Reprezentare fiscală și optimizare taxe porto-vamale de către experți de elită." },
            { icon: GlobeIcon, title: "Global Sourcing", desc: "Verificarea furnizorilor și controlul calității mărfurilor direct la sursă în Asia." }
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
             <span className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block">Optimizare</span>
             <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight uppercase italic mb-8">Eficiență Fără Margină.</h2>
             <p className="text-neutral-500 text-lg font-medium italic leading-relaxed mb-10">
                Nu ne limităm la transport. Analizăm fiecare aspect al fluxului tău de mărfuri pentru a identifica rutele cele mai scurte și punctele de optimizare fiscală care îți cresc marja de profit.
             </p>
             <ul className="space-y-6">
                {['Timp de tranzit redus cu 15%', 'Costuri portuare optimizate', 'Transparență totală prin API'].map(item => (
                   <li key={item} className="flex items-center gap-4 text-white font-bold italic">
                      <CheckCircleIcon className="h-5 w-5 text-primary-500" /> {item}
                   </li>
                ))}
             </ul>
          </div>
          <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/5">
             <img src="/assets/generated/modern_warehouse_tech_1773224152286.png" className="w-full h-full object-cover grayscale opacity-50" alt="Warehousing" />
          </div>
       </div>
    </div>
  </PublicLayout>
);

export const CalculPrompt = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
             <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">Formula Landed Cost</h2>
             <p className="text-neutral-500 text-lg leading-relaxed italic">
                Spre deosebire de calculatoarele generice, Promo-Efect integrează realitatea fiscală a regiunii. Calculul nostru include nu doar transportul, ci și taxele portuare, comisioanele vamale și TVA-ul de import, oferindu-vă prețul real de descărcare la depozit.
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
             <h3 className="text-3xl font-black text-white italic mb-6 tracking-tighter uppercase">Simulator Portal</h3>
             <p className="text-neutral-500 italic mb-10 leading-relaxed">
                Pentru a procesa datele specifice (HS Code, Greutate Brută, Port de Plecare) și a obține o cotație oficială cu asigurare inclusă, vă rugăm să utilizați platforma noastră centralizată.
             </p>
             <Button size="lg" className="w-full bg-primary-600 text-white font-bold h-16 rounded-full uppercase tracking-[0.3em] text-xs shadow-[0_0_30px_rgba(249,115,22,0.2)]" onClick={onLoginRedirect}>ACCESEAZĂ SIMULATORUL</Button>
          </SolidCard>
       </div>

       {/* Precision Variables */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { t: 'Live FX Rates', d: 'Calculele sunt sincronizate cu ratele de schimb ale Băncii Centrale (BNM/BNR).' },
            { t: 'Indexare SCFI', d: 'Costul de transport se ajustează automat în funcție de volatilitatea pieței asiatice.' },
            { t: 'Predictibilitate VAT', d: 'Simulăm impactul TVA de import asupra cash-flow-ului tău operațional.' }
          ].map((v, i) => (
             <div key={i} className="p-8 border border-white/5 rounded-3xl bg-white/2 hover:border-primary-500/20 transition-all">
                <h4 className="text-white font-black italic uppercase text-xs tracking-widest mb-4">{v.t}</h4>
                <p className="text-neutral-600 text-[10px] leading-relaxed italic">{v.d}</p>
             </div>
          ))}
       </div>
    </div>
  </PublicLayout>
);

export const Preturi = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
            { title: "Standard FCL 20'", price: "Market Rate", desc: "Cotații SPOT bazate pe cererea actuală din porturile Shanghai/Ningbo." },
            { title: "Grupaj LCL (CBM)", price: "$85* / W/M", desc: "Tarif bazat pe greutate sau volum, incluzând consolidarea profesională." },
            { title: "Consultanță / Audit", price: "Custom", desc: "Audit de fabrică și controlul calității AQL 2.5 la sursă." }
          ].map((item, i) => (
            <SolidCard key={i} className="text-center group border-white/5 hover:border-primary-500/30 transition-all relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-primary-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
               <h3 className="text-neutral-700 font-bold uppercase tracking-[0.3em] text-[8px] mb-6">{item.title}</h3>
               <div className="text-4xl font-black text-white italic mb-6 group-hover:text-primary-500 transition-colors tracking-tighter">{item.price}</div>
               <p className="text-neutral-600 text-[10px] italic mb-10 leading-relaxed px-4">{item.desc}</p>
               <Button variant="outline" className="w-full border-white/10 text-white font-bold h-12 text-[10px] uppercase tracking-widest italic hover:bg-white/5" onClick={onLoginRedirect}>DETALII COTAȚIE</Button>
            </SolidCard>
          ))}
       </div>

       {/* Surcharges & Variables */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-8">
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">Structura Surcharge-urilor</h2>
             <p className="text-neutral-500 leading-relaxed italic text-sm">
                Prețurile noastre sunt defalcate pentru o transparență radicală. Înțelegerea acestor variabile vă permite să anticipați costurile Supply Chain-ului:
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { n: 'BAF', d: 'Bunker Adjustment Factor (Combustibil)' },
                  { n: 'CAF', d: 'Currency Adjustment Factor (Valutar)' },
                  { n: 'THC', d: 'Terminal Handling (Manipulare Port)' },
                  { n: 'DOC', d: 'Documentation Fees (Vamuire)' }
                ].map(v => (
                   <div key={v.n} className="flex items-center gap-4 p-4 rounded-xl bg-white/2 border border-white/5">
                      <span className="text-primary-500 font-black italic text-xs underline underline-offset-4 decoration-primary-500/20">{v.n}</span>
                      <span className="text-neutral-600 text-[10px] italic font-bold uppercase tracking-widest">{v.d}</span>
                   </div>
                ))}
             </div>
          </div>
          <div className="p-12 rounded-[2.5rem] bg-gradient-to-br from-primary-600/10 to-transparent border border-primary-500/20 text-center flex flex-col justify-center">
             <div className="inline-flex items-center gap-2 mx-auto mb-6 px-4 py-1 rounded-full bg-primary-600/20 border border-primary-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.2em] italic">Open Pricing Model</span>
             </div>
             <h2 className="text-3xl font-bold text-white mb-6 uppercase italic tracking-tighter">Fără Taxe Ascunse</h2>
             <p className="text-neutral-600 text-xs italic mb-10 mx-auto max-w-sm">Dacă cotația inițială nu menționează o taxă, noi o acoperim. Garantăm stabilitatea prețului pe durata tranzitului.</p>
             <Button className="bg-primary-600 text-white font-bold h-14 px-10 rounded-full shadow-[0_10px_40px_rgba(249,115,22,0.3)] animate-glow" onClick={onLoginRedirect}>SOLICITĂ OFERTĂ FERMĂ</Button>
          </div>
       </div>
    </div>
  </PublicLayout>
);

export const Despre = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
            { label: "Volume Anuale", value: "5k+ TEU" },
            { label: "Piață Deservită", value: "EU & UA" },
            { label: "Experiență Vamală", value: "15+ Ani" }
          ].map((stat, i) => (
            <div key={i}>
               <div className="text-6xl font-black text-white italic mb-2 tracking-tighter">{stat.value}</div>
               <div className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em]">{stat.label}</div>
            </div>
          ))}
       </div>

       <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-10 uppercase italic tracking-tight">Viziunea Noastră</h2>
          <p className="text-neutral-500 text-xl font-medium italic leading-relaxed">
            Credem că logistica globală trebuie să fie la fel de simplă ca un transfer bancar. Investim constant în tehnologie proprie pentru a reduce barierele administrative și a oferi clienților noștri certitudine totală.
          </p>
       </div>
    </div>
  </PublicLayout>
);


export const FCLTransport = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
             <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">Capacitate Fără Compromis</h2>
             <p className="text-neutral-500 text-lg leading-relaxed italic">
                Transportul de tip FCL (Full Container Load) este alegerea strategică pentru companiile care importă volume semnificative. Prin Promo-Efect, beneficiați de un lanț de aprovizionare direct, eliminând manipulările intermediare și reducând riscul de avarie la zero.
             </p>
             <div className="space-y-6">
                {[
                  { t: 'Sigilare Exclusivă', d: 'Containerul este încărcat și sigilat la furnizor, fiind deschis doar la destinația finală.' },
                  { t: 'Tranzit Optimizat', d: 'Rute directe Shanghai/Ningbo -> Constanța, cu timpi de tranzit minimizați prin contracte prioritare.' },
                  { t: 'Indexare SCFI', d: 'Tarifele noastre sunt aliniate la Shanghai Containerized Freight Index pentru transparență totală.' }
                ].map(item => (
                   <div key={item.t} className="flex gap-4">
                      <div className="mt-1"><CheckCircleIcon className="h-5 w-5 text-primary-500" /></div>
                      <div>
                         <h4 className="text-white font-bold italic uppercase text-sm tracking-widest">{item.t}</h4>
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
                   <div className="text-7xl font-black text-white italic mb-4 tracking-tighter">100%</div>
                   <div className="text-primary-500 font-bold uppercase tracking-[0.4em] text-xs">Exclusivitate Spațiu</div>
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
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">Matricea Echipamentelor</h2>
             <p className="text-neutral-500 italic text-sm">Specificații brute pentru planificarea precisă a încărcăturii.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { type: "20' DRY VAN", vol: "33.2 CBM", payload: "28,200 KG", dim: "5.89m x 2.35m x 2.39m", use: "Optimizat pentru mărfuri cu densitate mare (piese metalice, materie primă)." },
               { type: "40' DRY VAN", vol: "67.7 CBM", payload: "26,700 KG", dim: "12.03m x 2.35m x 2.39m", use: "Standardul industrial pentru volume comerciale și bunuri de larg consum." },
               { type: "40' HIGH CUBE", vol: "76.4 CBM", payload: "26,500 KG", dim: "12.03m x 2.35m x 2.69m", use: "Maxim de volum pentru mărfuri voluminoase sau ambalaje non-standard." }
             ].map((spec, i) => (
               <SolidCard key={i} className="bg-[#050608]/50 border-white/5 hover:border-primary-500/20 transition-colors group">
                  <div className="flex justify-between items-start mb-8">
                     <h3 className="text-primary-500 font-black italic tracking-widest text-lg">{spec.type}</h3>
                     <div className="w-12 h-6 border border-white/10 rounded flex items-center justify-center text-[8px] text-neutral-600 font-mono group-hover:text-primary-500 transition-colors">ISO 6346</div>
                  </div>
                  <div className="space-y-6 mb-10">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <div className="text-neutral-700 text-[8px] uppercase font-bold tracking-[0.2em]">Capacitate Cubică</div>
                           <div className="text-white font-mono text-sm">{spec.vol}</div>
                        </div>
                        <div className="space-y-1 text-right">
                           <div className="text-neutral-700 text-[8px] uppercase font-bold tracking-[0.2em]">Max Payload</div>
                           <div className="text-white font-mono text-sm">{spec.payload}</div>
                        </div>
                     </div>
                     <div className="space-y-1 pt-4 border-t border-white/5">
                        <div className="text-neutral-700 text-[8px] uppercase font-bold tracking-[0.2em]">Dimensiuni Interioare (L/l/H)</div>
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
                <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">Siguranță Multinivel</h2>
                <p className="text-neutral-500 italic leading-relaxed">
                   Riscul maritim este o variabilă inevitabilă. Oferim protecție Cargo conform Institute Cargo Clauses (A), acoperind riscuri de la avaria comună până la forța majoră, asigurându-ne că lichiditatea afacerii tale nu este niciodată compromisă.
                </p>
                <div className="flex flex-wrap gap-4">
                   {['Full Risk Coverage', 'General Average Protection', 'Port-to-Port Liability'].map(tier => (
                      <span key={tier} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] text-white font-bold italic uppercase tracking-wider">{tier}</span>
                   ))}
                </div>
             </div>
             <div className="space-y-6">
                <h4 className="text-primary-500 font-bold uppercase tracking-[0.2em] text-xs">Protocolul de Securitate</h4>
                <ul className="space-y-4">
                   {[
                     'Monitorizare Satelitară 24/7 AIS integration',
                     'Senzori de impact și umiditate (la cerere)',
                     'Auditare prealabilă a liniei de shipping',
                     'Gestiune digitală a tuturor documentelor de transport'
                   ].map(p => (
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

export const LCLGrupaj = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero 
      subtitle="Consolidare Inteligentă"
      title="LCL - Less Than Container Load"
      description="Plătiți doar pentru spațiul pe care îl utilizați. Soluția flexibilă pentru afaceri în creștere și importuri frecvente."
      image="/assets/generated/logistics_aerial_hub_1773224370709.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
       {/* Section 1: Network & Strategy */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative aspect-video rounded-3xl overflow-hidden border border-white/5 grayscale group">
             <img src="/assets/generated/trade_routes_neon_1773224386483.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Hub Network" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent" />
             <div className="absolute bottom-6 left-6 space-y-2">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                   <span className="text-white font-black italic uppercase text-[10px] tracking-widest">NINGBO HUB ACTIVE</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse delay-75" />
                   <span className="text-white font-black italic uppercase text-[10px] tracking-widest">SHANGHAI CONSOLIDATION LIVE</span>
                </div>
             </div>
          </div>
          <div className="order-1 lg:order-2 space-y-8">
             <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">Matricea de Consolidare</h2>
             <p className="text-neutral-500 text-lg leading-relaxed italic">
                Sistemul nostru LCL (Less than Container Load) este integrat într-o rețea de hub-uri eurasiatice care garantează plecări săptămânale indiferent de volumul total de marfă al pieței. Această stabilitate permite clienților noștri să mențină un inventar Just-In-Time.
             </p>
             <div className="grid grid-cols-2 gap-8">
                <div className="p-6 border-l-2 border-primary-500 bg-primary-500/5">
                   <div className="text-3xl font-black text-white italic tracking-tighter">SĂPTĂMÂNAL</div>
                   <div className="text-primary-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2 italic">Frecvență Plecări</div>
                </div>
                <div className="p-6 border-l-2 border-white/10 bg-white/5">
                   <div className="text-3xl font-black text-white italic tracking-tighter">NINGBO</div>
                   <div className="text-white/40 font-bold uppercase tracking-[0.4em] text-[10px] mt-2 italic">Hub Principal Asia</div>
                </div>
             </div>
          </div>
       </div>

       {/* CBM Logic Breakdown */}
       <div className="space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">Logica Calculului Volumetric</h2>
             <p className="text-neutral-500 italic text-sm">Înțelegerea raportului Greutate/Volum pentru optimizarea costurilor.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <SolidCard className="bg-[#0A0C10] border-white/5 p-10 group">
                <h4 className="text-primary-500 font-black italic uppercase text-xs tracking-[0.3em] mb-8">Standardul Maritim</h4>
                <div className="flex items-end gap-1 mb-6">
                   <span className="text-6xl font-black text-white italic tracking-tighter leading-none">1:1000</span>
                </div>
                <p className="text-neutral-600 text-sm leading-relaxed italic mb-8">
                   În transportul maritim LCL, 1 metru cub (CBM) este echivalentul a 1,000 kg. Taxarea se face pe valoarea cea mai mare dintre volumul real și greutatea convertită.
                </p>
                <div className="space-y-4 pt-6 border-t border-white/5">
                   <div className="flex justify-between text-[10px] font-bold uppercase italic tracking-widest">
                      <span className="text-neutral-700">Formula CBM:</span>
                      <span className="text-white">L (m) x l (m) x H (m)</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold uppercase italic tracking-widest">
                      <span className="text-neutral-700">Exemplu:</span>
                      <span className="text-white">1.2m x 0.8m x 1m = 0.96 CBM</span>
                   </div>
                </div>
             </SolidCard>
             <div className="space-y-8 flex flex-col justify-center">
                <div className="space-y-4 pt-8">
                   <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Protocoale de Siguranță LCL</h3>
                   <div className="grid grid-cols-1 gap-4">
                      {[
                        { t: 'Segregare Marfă', d: 'Mărfurile periculoase (DG) sunt strict separate de bunurile generale.' },
                        { t: 'Paletizare Standard', d: 'Toate pachetele individuale sunt fixate pe palete tratate ISPM15.' },
                        { t: 'Audit vizual', d: 'Fiecare unitate este fotografiată la intrarea în hub-ul de consolidare.' }
                      ].map(p => (
                         <div key={p.t} className="p-4 rounded-xl border border-white/5 bg-white/2 hover:border-primary-500/20 transition-all">
                            <h5 className="text-white font-bold italic text-xs tracking-widest uppercase mb-1">{p.t}</h5>
                            <p className="text-neutral-500 text-[10px] italic">{p.d}</p>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* Process Steps */}
       <div className="space-y-16">
          <div className="text-center max-w-2xl mx-auto">
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">Workflow Operațional LCL</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
             {[
               { n: '01', t: 'Consolidare Hub', d: 'Marfa este colectată în Ningbo/Shanghai și stivuită strategic pentru maximă protecție.' },
               { n: '02', t: 'Analiză Vamală', d: 'Verificarea documentelor înainte de plecare pentru a preveni reținerile în portul Constanța.' },
               { n: '03', t: 'Tranzit Maritim', d: 'Monitorizare activă prin satelit pe toată durata celor 35-42 de zile de navigație.' },
               { n: '04', t: 'Deconsolidare', d: 'Sortare rapidă în Chișinău/Constanța și pregătire pentru livrarea la ușă.' }
             ].map((step, i) => (
                <div key={i} className="relative group">
                   <div className="text-6xl font-black text-white/5 mb-6 group-hover:text-primary-500/20 transition-all italic duration-500">{step.n}</div>
                   <h4 className="text-white font-bold italic uppercase tracking-widest mb-4 group-hover:text-primary-500 transition-colors">{step.t}</h4>
                   <p className="text-neutral-600 text-xs leading-relaxed italic">{step.d}</p>
                   {i < 3 && <div className="hidden md:block absolute top-[2.5rem] -right-4 w-8 h-px bg-white/10" />}
                </div>
             ))}
          </div>
       </div>
    </div>
  </PublicLayout>
);

export const ConsultantaChina = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
             <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">Ierarhia Auditului</h2>
             <p className="text-neutral-500 text-lg leading-relaxed italic">
                Riscul în China nu este găsirea unui furnizor, ci găsirea partenerului *sustenabil*. Echipa noastră locală execută un protocol de audit ierarhic, asigurându-vă că investiția este protejată prin contracte blindate sub jurisdicție locală și europeană.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { t: 'Verificare Juridică', d: 'Validăm licența de business (Business License) și dreptul de export (Export License).' },
                  { t: 'Analiză Financiară', d: 'Audităm capitalul social și solvabilitatea furnizorului prin baze de date chineze.' },
                  { t: 'Capacitate Productivă', d: 'Inspecție fizică a utilajelor, numărului de angajați și fluxului de producție.' },
                  { t: 'Sistem de Management', d: 'Verificăm conformitatea cu standardele ISO 9001 și BSCI (Social Compliance).' }
                ].map(item => (
                   <div key={item.t} className="p-6 bg-[#0A0C10] border border-white/5 rounded-2xl hover:border-primary-500/20 transition-colors">
                      <h4 className="text-primary-500 font-bold italic uppercase text-xs tracking-widest mb-2">{item.t}</h4>
                      <p className="text-neutral-600 text-xs italic leading-relaxed">{item.d}</p>
                   </div>
                ))}
             </div>
          </div>
          <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/5 grayscale group">
             <img src="/assets/generated/consultation_futuristic_1773224405458.png" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Sourcing Audit" />
             <div className="absolute inset-0 bg-primary-500/5" />
          </div>
       </div>

       {/* QC & AQL Standards */}
       <div className="space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">Controlul Calității (AQL 2.5)</h2>
             <p className="text-neutral-500 italic text-sm">Standarde statistice riguroase pentru minimizarea defectelor.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { t: 'Initial Check (IPC)', d: 'Verificarea primei unități de producție și a materiilor prime folosite.' },
               { t: 'During Production (DUPRO)', d: 'Inspecție la 30-50% din proces pentru a corecta erorile sistemice.' },
               { t: 'Final Inspection (FRI)', d: 'Verificare finală înainte de încărcarea containerului (Final Random Inspection).' }
             ].map((check, i) => (
                <SolidCard key={i} className="text-center border-white/5 hover:border-primary-500/30 transition-all">
                   <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary-500 font-black italic mx-auto mb-6">0{i+1}</div>
                   <h4 className="text-white font-bold italic uppercase tracking-wider mb-4">{check.t}</h4>
                   <p className="text-neutral-600 text-xs italic leading-relaxed">{check.d}</p>
                </SolidCard>
             ))}
          </div>
       </div>

       {/* Category Expertise */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
             <h3 className="text-2xl font-bold text-white uppercase italic tracking-tight">Expertiză pe Verticale</h3>
             <p className="text-neutral-500 italic text-sm leading-relaxed">
                Nu operăm generic. Avem specialiști dedicați pentru categorii specifice de marfă, cunoscând reglementările CE și cerințele tehnice locale pentru:
             </p>
             <div className="flex flex-wrap gap-3">
                {['Electronică', 'Textile/Fashion', 'Industrial/Utilaje', 'Consumer Goods', 'Auto Parts'].map(cat => (
                   <span key={cat} className="px-6 py-2 border border-white/5 rounded-full text-xs text-neutral-400 font-bold italic uppercase hover:text-white hover:border-primary-500/50 transition-all cursor-default">{cat}</span>
                ))}
             </div>
          </div>
          <SolidCard className="bg-primary-600/5 border-primary-500/10 p-10">
             <div className="text-sm text-primary-500 font-black italic uppercase tracking-[0.3em] mb-4">Statistici 2024</div>
             <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                   <span className="text-neutral-500 text-[10px] uppercase font-bold italic">Furnizori Auditați</span>
                   <span className="text-white font-mono text-lg font-black tracking-tighter">450+</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                   <span className="text-neutral-500 text-[10px] uppercase font-bold italic">Rata de Respingere QC</span>
                   <span className="text-primary-500 font-mono text-lg font-black tracking-tighter">12.5%</span>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-neutral-500 text-[10px] uppercase font-bold italic">Clienti Activi Sourcing</span>
                   <span className="text-white font-mono text-lg font-black tracking-tighter">85+</span>
                </div>
             </div>
          </SolidCard>
       </div>
    </div>
  </PublicLayout>
);

export const Vamuire = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
              <img src="/assets/generated/smart_logistics_dashboard_mockup_1773224135612.png" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" alt="Customs HUD" />
              <div className="absolute inset-0 bg-primary-500/10 pointer-events-none" />
              <div className="absolute top-4 right-4 px-3 py-1 bg-primary-600 rounded text-[8px] text-white font-black italic uppercase tracking-[0.2em]">LIVE COMPLIANCE</div>
          </div>
          <div className="order-1 md:order-2 space-y-8">
             <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">Eficiență Fără Erori</h2>
             <p className="text-neutral-500 text-lg leading-relaxed italic">
                Sistemul nostru digital colectează automat datele din facturile furnizorului și întocmește setul de documente conform legislației UE și RM. Această automatizare reduce riscul erorilor umane în codificarea TARIC cu peste 95%.
             </p>
             <div className="space-y-4">
                {[
                  { t: 'Analiză HS Code', d: 'Determinăm codul tarifar optim pentru a asigura cel mai mic nivel de taxe legale.' },
                  { t: 'Customs Value Audit', d: 'Verificăm valoarea în vamă pentru a asigura conformitatea cu metodele de evaluare OMC.' },
                  { t: 'Regimuri la Amânare', d: 'Soluții pentru plata amânată a TVA prin reprezentare fiscală autorizată.' }
                ].map(item => (
                   <div key={item.t} className="flex gap-4 p-4 border-l-2 border-primary-500 bg-primary-500/5 group hover:bg-primary-500/10 transition-colors">
                      <div>
                         <h4 className="text-white font-bold italic uppercase text-[10px] tracking-widest">{item.t}</h4>
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
             <h3 className="text-2xl font-bold text-white uppercase italic tracking-tight">Ghidul Costurilor Portuare</h3>
             <p className="text-neutral-500 italic text-xs leading-relaxed">
                Dincolo de transport, vamuirea implică taxe locale care trebuie planificate riguros pentru a menține prețul de cost sub control:
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">Taxe Portuare (THC)</h5>
                   <p className="text-neutral-700 text-[10px] leading-relaxed italic">Terminal Handling Charge acoperă manipularea containerului de la navă în stivă.</p>
                   <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">ISPS Security fee</h5>
                   <p className="text-neutral-700 text-[10px] leading-relaxed italic">Taxă de securitate portuară conform normelor internaționale.</p>
                </div>
                <div className="space-y-4">
                   <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">Demurrage & Detention</h5>
                   <p className="text-neutral-700 text-[10px] leading-relaxed italic">Penalități aplicate pentru depășirea timpului liber de utilizare a containerului sau stocare portuară.</p>
                   <h5 className="text-primary-500 font-black italic uppercase text-[10px] tracking-widest">EORI Registration</h5>
                   <p className="text-neutral-700 text-[10px] leading-relaxed italic">Număr unic necesar pentru orice operațiune de import/export în spațiul european.</p>
                </div>
             </div>
          </SolidCard>
          <div className="space-y-8 bg-[#0A0C10] border border-white/5 p-12 rounded-[2rem] flex flex-col justify-center">
             <div className="text-center space-y-4">
                <div className="text-4xl font-black text-white italic tracking-tighter">0</div>
                <div className="text-primary-500 font-bold uppercase tracking-[0.2em] text-[10px]">Blocaje Vamale în 2025</div>
                <p className="text-neutral-600 text-[10px] italic pt-4">Performanța noastră rezultă dintr-un audit prealabil de 100% al setului de documente.</p>
             </div>
             <Button variant="outline" className="w-full border-white/5 text-white font-bold h-12 text-[10px] tracking-widest uppercase italic" onClick={onLoginRedirect}>VERIFICĂ HS CODE</Button>
          </div>
       </div>
    </div>
  </PublicLayout>
);


export const Depozitare = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero 
      subtitle="Infrastructură Alpha"
      title="Hub-uri Logistice & Depozitare"
      description="Puncte strategice de stocare în Constanța și Chișinău. Securitate maximă și gestiune digitalizată a stocurilor prin AI-WMS."
      image="/assets/generated/modern_warehouse_tech_1773224152286.png"
    />
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">
       {/* Section 1: WMS Logic & Flow */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
             <h2 className="text-3xl md:text-5xl font-bold text-white uppercase italic tracking-tight">Ecosistemul WMS</h2>
             <p className="text-neutral-500 text-lg leading-relaxed italic">
                Depozitele Promo-Efect operează sub un Warehouse Management System (WMS) de ultimă generație, permițând vizibilitatea live a inventarului și trasabilitatea fiecărui SKU prin tehnologie scan-and-track.
             </p>
             <div className="space-y-4">
                {[
                  { t: 'Inbound Logic', d: 'Auditarea integrității paletului la recepție și alocarea dinamică a spațiului de stivuire.' },
                  { t: 'Batch & Expiry tracking', d: 'Gestiunea automată a loturilor și termenelor de valabilitate pentru produse sensibile.' },
                  { t: 'Omnichannel Ready', d: 'Integrare API cu platformele de e-commerce pentru fulfillment automatizat.' }
                ].map((item, i) => (
                   <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white/2 border border-white/5 hover:border-primary-500/10 transition-all">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center text-primary-500 font-black italic">0{i+1}</div>
                      <div>
                         <h4 className="text-white font-bold italic uppercase text-xs tracking-widest">{item.t}</h4>
                         <p className="text-neutral-700 text-[10px] mt-1 italic">{item.d}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
          <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/5 grayscale hover:grayscale-0 transition-all duration-1000 group">
             <img src="/assets/generated/modern_warehouse_tech_1773224152286.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="AI Warehouse" />
             <div className="absolute inset-0 bg-primary-500/5 mix-blend-overlay" />
             <div className="absolute top-6 left-6 px-4 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-white font-black italic uppercase tracking-widest">WMS SYSTEM: ACTIVE</div>
          </div>
       </div>

       {/* Environment & Security Specs */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { t: 'Securitate Tier-3', d: 'Supraveghere video 4K, control acces biometric și pază umană 24/7.' },
            { t: 'Control Climatic', d: 'Monitorizare senzorială a umidității și temperaturii pentru mărfuri tech/textile.' },
            { v: '2,500 KG', t: 'Max Floor Load', d: 'Infrastructură capabilă să susțină utilaje grele și stocuri industriale densificate.' }
          ].map((spec, i) => (
             <div key={i} className="p-10 border border-white/5 bg-[#0A0C10] rounded-[2rem] text-center space-y-4 hover:bg-white/2 transition-colors">
                {spec.v && <div className="text-2xl font-black text-white italic tracking-tighter">{spec.v}</div>}
                <h4 className="text-primary-500 font-black italic uppercase text-xs tracking-widest">{spec.t}</h4>
                <p className="text-neutral-700 text-xs italic leading-relaxed">{spec.d}</p>
             </div>
          ))}
       </div>

       {/* Region Mapping */}
       <div className="p-12 md:p-20 border border-white/5 bg-white/2 rounded-[4rem] text-center space-y-12">
          <div className="space-y-4">
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">Noduri Strategice de Distribuție</h2>
             <p className="text-neutral-500 italic max-w-2xl mx-auto text-sm leading-relaxed">Capacitățile noastre sunt divizate strategic pentru a acoperi terminalul maritim și poarta de intrare în Moldova și România Nord.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-6 text-left p-8 bg-[#050608] rounded-3xl border border-white/5">
                <div className="flex justify-between items-start">
                   <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Chișinău Hub</h3>
                   <span className="text-primary-500 font-bold text-[10px] tracking-widest">ZONA LIBERĂ</span>
                </div>
                <div className="space-y-2">
                   {['Full Cross-Docking', 'Audit Tehnic la Receptie', 'Distributie Locală (Last Mile)'].map(f => (
                      <div key={f} className="flex items-center gap-3 text-neutral-600 text-xs italic font-bold">
                         <div className="w-1 h-1 bg-primary-500 rounded-full" /> {f}
                      </div>
                   ))}
                </div>
             </div>
             <div className="space-y-6 text-left p-8 bg-[#050608] rounded-3xl border border-white/5">
                <div className="flex justify-between items-start">
                   <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Constanța Terminal</h3>
                   <span className="text-neutral-500 font-bold text-[10px] tracking-widest uppercase">Regim Vamal</span>
                </div>
                <div className="space-y-2">
                   {['Acces Direct Portual', 'Buffer Storage pt Export', 'Manipulare Agabaritică'].map(f => (
                      <div key={f} className="flex items-center gap-3 text-neutral-600 text-xs italic font-bold">
                         <div className="w-1 h-1 bg-neutral-600 rounded-full" /> {f}
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  </PublicLayout>
);

export const Cariere = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
            { t: 'Stack Tehnologic', d: 'Lucrăm cu instrumente proprietary de tracking și AI pentru a optimiza rutele comerciale.' },
            { t: 'Impact Global', d: 'Coordonezi mișcarea a mii de tone de marfă între cele mai mari hub-uri ale lumii.' },
            { t: 'Evoluție Rapidă', d: 'Promovăm meritocrația. Performanța ta determină direct ascensiunea în ierarhie.' }
          ].map((benefit, i) => (
             <SolidCard key={i} className="bg-white/2 border-white/5 p-8 hover:bg-white/5 transition-colors">
                <h4 className="text-primary-500 font-bold italic uppercase text-xs tracking-widest mb-4">{benefit.t}</h4>
                <p className="text-neutral-500 text-sm italic leading-relaxed">{benefit.d}</p>
             </SolidCard>
          ))}
       </div>

       {/* Hiring Roadmap */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-tight">Roadmap de Aplicare</h2>
             <p className="text-neutral-500 italic leading-relaxed">
                Procesul nostru de selecție este riguros, dar transparent. Căutăm acea combinație rară de precizie tehnică și instict comercial.
             </p>
             <div className="space-y-6">
                {[
                  { s: 'Review CV', d: 'Evaluăm experiența ta în domeniu sau potențialul tech.' },
                  { s: 'Interviu Tehnic', d: 'Discutăm cazuri reale de logistică sau arhitectură software.' },
                  { s: 'Cultural Fit', d: 'Să vedem dacă împărțim aceeași viziune "Solid Premium".' },
                  { s: 'Onboarding Alpha', d: 'Intri direct în nucleul operațional alături de un mentor senior.' }
                ].map((step, i) => (
                   <div key={i} className="flex gap-6 items-start">
                      <div className="text-neutral-800 font-black italic text-3xl">0{i+1}</div>
                      <div>
                         <h5 className="text-white font-bold italic uppercase text-sm tracking-widest">{step.s}</h5>
                         <p className="text-neutral-600 text-xs italic mt-1">{step.d}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
          <div className="space-y-8">
             <h3 className="text-2xl font-bold text-white uppercase italic tracking-widest text-center mb-10">Poziții Deschise</h3>
             <div className="space-y-4">
                {[
                  { title: "Freight Forwarder Senior", type: "Full-time", loc: "Chișinău" },
                  { title: "Specialist Vămuire", type: "Full-time", loc: "Chișinău / Constanța" },
                  { title: "Account Manager Asia", type: "Remote / Shanghai", loc: "Global" }
                ].map((job, i) => (
                   <div key={i} className="p-6 rounded-2xl border border-white/5 bg-[#0A0C10] flex flex-col md:flex-row justify-between items-center group hover:border-primary-500/30 transition-all">
                      <div className="text-center md:text-left">
                         <h4 className="text-white font-bold italic uppercase tracking-widest group-hover:text-primary-500 transition-colors">{job.title}</h4>
                         <div className="flex gap-4 mt-2">
                            <span className="text-[10px] text-neutral-600 font-bold uppercase italic">{job.type}</span>
                            <span className="text-[10px] text-primary-500 font-bold uppercase italic tracking-widest">{job.loc}</span>
                         </div>
                      </div>
                      <Button variant="outline" className="mt-6 md:mt-0 border-white/10 text-white font-bold text-[10px] uppercase tracking-widest italic" onClick={onLoginRedirect}>APLICĂ ACUM</Button>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  </PublicLayout>
);

export const Resurse = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => <GhidImport onLoginRedirect={onLoginRedirect} />;

export const GhidImport = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
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
             <h2 className="text-3xl font-bold text-white uppercase italic tracking-widest">Fluxul Strategic de Import</h2>
             <p className="text-neutral-500 italic text-sm">7 pași fundamentali pentru un Supply Chain rezilient din Asia către Moldova/EU.</p>
          </div>
          <div className="space-y-20">
             {[
               { s: '01', t: 'Identificarea & Vetting-ul Furnizorului', d: 'Nu vă limitați la preț. Verificați istoricul de export, capitalul social și certificările de calitate (ISO 9001, CE). Echipa noastră locală din China poate executa acest audit tehnic direct în fabrică.' },
               { s: '02', t: 'Negocierea Incoterms (2020)', d: 'Alegeți FOB (Free On Board) pentru a păstra controlul asupra logisticii și costurilor locale din Asia. Evitați CIF deja la destinație.' },
               { s: '03', t: 'Analiză TARIC & Vamuire', d: 'Identificați codul HS corect înainte de a plasa comanda. Taxele vamale pot varia între 0% și 15%, influențând critic profitabilitatea.' },
               { s: '04', t: 'Consolidare & Booking (LCL/FCL)', d: 'Vă recomandăm rezervarea spațiului cu minimum 14 zile înainte de data gata a mărfii. Pentru volume mici, folosim Hub-ul din Ningbo pentru consolidare săptămânală.' },
               { s: '05', t: 'Controlul Calității la Încărcare', d: 'Inspecția finală de tip FRI (Final Random Inspection) asigură că ceea ce s-a produs corespunde specificațiilor din contractul inițial.' },
               { s: '06', t: 'Monitorizare Tranzit AIS', d: 'Urmăriți locația exactă a navei prin portalul nostru. Tranzitul mediu este de 35 de zile prin canalul Suez către portul Constanța.' },
               { s: '07', t: 'De-vamuire & Livrare Last-Mile', d: 'După acostare, containerele sunt procesate prioritar. Transportul final din port către depozitul dumneavoastră se face cu camioane monitorizate GPS.' }
             ].map((step, i) => (
                <div key={i} className="flex gap-10 group">
                   <div className="flex-shrink-0">
                      <div className="text-5xl font-black text-white/5 italic group-hover:text-primary-500/20 transition-all duration-700">{step.s}</div>
                   </div>
                   <div className="pt-2">
                      <h4 className="text-white font-bold italic uppercase tracking-wider mb-4 group-hover:text-primary-500 transition-colors">{step.t}</h4>
                      <p className="text-neutral-500 text-sm leading-relaxed italic border-l border-white/5 pl-8">{step.d}</p>
                   </div>
                </div>
             ))}
          </div>
       </div>

       <SolidCard className="bg-primary-600/5 border-primary-500/20 p-16 text-center space-y-8">
          <h3 className="text-3xl font-black text-white italic uppercase tracking-widest">Ești gata pentru primul import?</h3>
          <p className="text-neutral-500 italic max-w-xl mx-auto">Consultanții noștri pot oferi un audit gratuit al primului tău proiect de import, analizând riscurile și oportunitățile fiscale.</p>
          <Button size="lg" className="bg-primary-600 text-white font-bold h-16 px-16 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.2)]" onClick={onLoginRedirect}>SOLICITĂ CONSULTANȚĂ</Button>
       </SolidCard>
    </div>
  </PublicLayout>
);

export const FAQ = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <PageHero 
      subtitle="Knowledge Base"
      title="Suport & Întrebări Frecvente"
      description="Găsește rapid răspunsuri tehnice la cele mai comune provocări din logistica internațională."
      image="/assets/generated/consultation_futuristic_1773224405458.png"
    />
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-8">
       {[
         { q: "Cât durează tranzitul maritim din porturile principale asiatice?", a: "În mod standard, o navă directă face între 32 și 38 de zile din Shanghai/Ningbo până în Constanța. Pentru Chișinău, adăugați 2-3 zile pentru vamuire și transport rutier." },
         { q: "Cum se calculează taxele vamale și TVA la import?", a: "Taxele se calculează la valoarea CIF a mărfii. TVA-ul RM este de 20%, aplicat la valoarea vămuită. Putem simula aceste costuri în portalul de client." },
         { q: "Ce reprezintă numărul EORI și cine are nevoie de el?", a: "EORI este codul unic de înregistrare pentru operațiuni vamale în UE. Orice firmă care importă trebuie să îl obțină de la Direcția Generală a Vămilor." },
         { q: "Care este diferența dintre FOB și EXW pentru un importator?", a: "În FOB furnizorul plătește transportul până în portul de plecare. În EXW, dumneavoastră preluați toate costurile de la ușa fabricii. Recomandăm FOB pentru simplitate." },
         { q: "Este marfa mea asigurată automat în caz de avarie maritimă?", a: "Nu automat. Oferim asigurare de tip Cargo (All-Risks) ca serviciu opțional, dar esențial pentru a acoperi avaria comună pe mare." }
       ].map((item, i) => (
          <SolidCard key={i} className="p-10 hover:border-primary-500/20 transition-all group">
             <div className="flex gap-6">
                <span className="text-primary-500 font-black italic text-2xl">?</span>
                <div className="space-y-4">
                   <h3 className="text-white font-bold italic uppercase tracking-wider text-sm">{item.q}</h3>
                   <p className="text-neutral-600 text-sm leading-relaxed italic">{item.a}</p>
                </div>
             </div>
          </SolidCard>
       ))}
       <div className="pt-20 text-center">
          <p className="text-neutral-700 italic text-xs mb-8">Nu ai găsit răspunsul căutat? Experții noștri sunt online.</p>
          <Button variant="outline" className="border-white/5 text-white font-bold h-14 px-12 rounded-full italic uppercase tracking-widest text-[10px]" onClick={onLoginRedirect}>CONTACTEAZĂ UN EXPERT</Button>
       </div>
    </div>
  </PublicLayout>
);

export const Termeni = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-20">
       <div className="space-y-4">
          <div className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] italic underline underline-offset-8 decoration-primary-500/20">Legal Infrastructure</div>
          <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter">Termeni și Condiții</h1>
       </div>
       <div className="space-y-20 text-neutral-500 italic leading-relaxed text-sm">
          {[
            { 
              t: "1. Natura Juridică și Cadrul de Operare", 
              d: "Promo-Efect Logistics Ltd acționează în calitate de casă de expediție și intermediar logistic. Toate serviciile sunt prestate în conformitate cu Condițiile Generale FIATA, Convenția CMR (pentru transport rutier) și Regulile de la Haga-Visby (pentru transport maritim). Prin plasarea unei comenzi, clientul acceptă aceste norme internaționale ca fiind de ordine publică în relația contractuală." 
            },
            { 
              t: "2. Mandatul de Reprezentare Vamală", 
              d: "Pentru operațiunile de vămuire, clientul acordă Promo-Efect un mandat de reprezentare directă sau indirectă. Clientul rămâne singurul responsabil pentru acuratețea datelor furnizate în Factura Comercială și Packing List. Promo-Efect nu își asumă răspunderea pentru penalitățile rezultate din clasificarea tarifară (HS Code) eronată furnizată de către importator/exportator." 
            },
            { 
              t: "3. Asigurări Cargo și Limitarea Răspunderii", 
              d: "Răspunderea transportatorului este limitată prin convențiile internaționale (ex. 8.33 DST/kg conform CMR). Promo-Efect recomandă cu tărie încheierea unei asigurări suplimentare de tip 'All-Risk' (Cargo Insurance) care să acopere valoarea integrală a mărfii. În absența unei solicitări scrise de asigurare, Promo-Efect nu este responsabilă pentru pierderile care depășesc limitele statutare menționate." 
            },
            { 
              t: "4. Forță Majoră și Evenimente Geopolitice", 
              d: "Promo-Efect este exonerată de orice răspundere în caz de forță majoră, incluzând, dar fără a se limita la: blocaje ale canalelor maritime (ex. Suez), conflicte armate, greve portuare, condiții meteorologice extreme sau decizii guvernamentale ce afectează rutele comerciale globale. Orice costuri adiționale (demurrage/detention) rezultate din astfel de evenimente sunt în sarcina exclusivă a clientului." 
            },
            { 
              t: "5. Condiții de Plată și Dreptul de Gaj", 
              d: "Facturile sunt scadente conform termenilor agreați în contractul-cadru. În cazul neplății, Promo-Efect își rezervă dreptul de gaj asupra mărfurilor aflate în posesia sa sau a partenerilor săi logistici, până la stingerea completă a datoriilor acumulate, inclusiv a costurilor de depozitare forțată." 
            },
            { 
              t: "6. Soluționarea Litigiilor și Arbitraj", 
              d: "Prezentul document este guvernat de legislația Republicii Moldova. Orice litigiu care nu poate fi soluționat pe cale amiabilă va fi trimis spre soluționare Curții de Arbitraj Comercial de pe lângă Camera de Comerț și Industrie a Republicii Moldova, decizia acesteia fiind finală și executorie." 
            }
          ].map((sec, i) => (
             <section key={i} className="space-y-6">
                <h2 className="text-white font-black uppercase italic tracking-widest text-lg">{sec.t}</h2>
                <p className="border-l border-white/5 pl-8 leading-relaxed mb-4">{sec.d}</p>
             </section>
          ))}
          <div className="pt-10 border-t border-white/5 text-[10px] text-neutral-800 uppercase font-bold tracking-[0.3em]">
             Versiunea B2B 2026.2 | Ultima actualizare: 11 Martie 2026 | Chișinău
          </div>
       </div>
    </div>
  </PublicLayout>
);

export const Politica = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-20">
       <div className="space-y-4">
          <div className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] italic">Data Protection Grid</div>
          <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter">Politică de Confidențialitate</h1>
       </div>
       <div className="space-y-20 text-neutral-500 italic leading-relaxed text-sm">
          {[
            { 
              t: "Baza Legală pentru Prelucrare", 
              d: "Promo-Efect procesează datele cu caracter personal pe baza executării contractului de transport (Art. 6 alin. 1 lit. b din GDPR) și a obligațiilor legale de conformitate vamală și fiscală. Identificarea părților în operațiunile de import/export este o cerință obligatorie a autorităților statale." 
            },
            { 
              t: "Transfer Internațional de Date", 
              d: "Datorită naturii globale a logisticii, datele dumneavoastră pot fi transferate către entități din afara Spațiului Economic European (ASEAN, China, SUA), incluzând agenți portuari, linii maritime și autorități vamale străine. Aceste transferuri sunt protejate prin clauze contractuale standard și protocoale securizate de transfer EDI." 
            },
            { 
              t: "Securitate și Integritate Digitală", 
              d: "Implementăm măsuri tehnice avansate: criptare end-to-end pentru documentele stochate, autentificare multi-factor (MFA) pentru portalul clientului și audituri de securitate bi-anuale ale bazelor de date. Toate datele financiare sunt procesate prin gateway-uri certificate PCI-DSS." 
            },
            { 
              t: "Perioada de Retenție a Datelor", 
              d: "În conformitate cu legislația fiscală și vamală, Promo-Efect păstrează documentele aferente tranzacțiilor logistice (facturi, declarații vamale, CMR) pentru o perioadă de minimum 5 ani, după care acestea sunt arhivate securizat sau anonimizate, cu excepția cazurilor în care există litigii în curs." 
            },
            { 
              t: "Drepturile și Accesul Utilizatorului", 
              d: "Aveți dreptul de a solicita accesul la datele dumneavoastră, rectificarea acestora, portabilitatea sau restricționarea prelucrării. Orice solicitare poate fi transmisă către Ofițerul nostru pentru Protecția Datelor (DPO) prin secțiunea de contact a portalului." 
            }
          ].map((sec, i) => (
             <section key={i} className="space-y-6">
                <h2 className="text-white font-black uppercase italic tracking-widest text-lg">{sec.t}</h2>
                <p className="border-l border-white/5 pl-8 leading-relaxed">{sec.d}</p>
             </section>
          ))}
       </div>
    </div>
  </PublicLayout>
);

export const Cookies = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-16 text-center">
       <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">Cookie Policy & Settings</h1>
          <p className="text-neutral-500 italic text-sm max-w-xl mx-auto">Transparență tehnologică totală. Utilizăm cookie-uri pentru a asigura o experiență securizată și optimizată în portalul nostru B2B.</p>
       </div>
       
       <div className="grid grid-cols-1 gap-8 text-left">
          {[
            {
              t: "1. Cookie-uri Esențiale (Strict Necessary)",
              d: "Acestea sunt vitale pentru securitatea sesiunii și integritatea datelor dumneavoastră financiare (ex. token-uri CSRF, ID-uri de sesiune securizată). Portalul nu poate funcționa fără aceste tehnologii.",
              s: "ACTIV PERMANENT"
            },
            {
              t: "2. Cookie-uri de Performanță și Optimizare",
              d: "Folosite pentru a echilibra încărcarea pe serverele noastre globale (Load Balancing) și pentru a asigura livrarea rapidă a documentelor tehnice prin rețeaua noastră de tip CDN.",
              s: "ACTIV - DEFAULT"
            },
            {
              t: "3. Cookie-uri de Preferințe Regionale",
              d: "Stochează parametrii regiunii dumneavoastră pentru a pre-selecta automat porturile de descărcare relevante și moneda de calcul a taxelor vamale în simulator.",
              s: "OPȚIONAL"
            },
            {
              t: "4. Cookie-uri Analitice (Anonymized)",
              d: "Măsurăm anonim interacțiunea cu paginile publice pentru a identifica eventualele blocaje în navigare și a optimiza viteza de încărcare a resurselor vizuale grele.",
              s: "OPȚIONAL"
            }
          ].map((c, i) => (
            <SolidCard key={i} className={`p-8 ${i > 1 ? 'opacity-70 group hover:opacity-100' : 'border-primary-500/20 bg-primary-600/5'}`}>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2 max-w-2xl">
                     <h3 className="text-white font-bold italic uppercase text-sm tracking-widest">{c.t}</h3>
                     <p className="text-neutral-600 text-xs italic leading-relaxed">{c.d}</p>
                  </div>
                  <div className={`flex-shrink-0 text-[10px] font-black italic uppercase tracking-widest px-4 py-2 rounded-full border ${i <= 1 ? 'text-primary-500 border-primary-500/30' : 'text-neutral-700 border-white/5'}`}>
                     {c.s}
                  </div>
               </div>
            </SolidCard>
          ))}
       </div>

       <div className="pt-10 flex flex-col md:flex-row gap-4 justify-center">
          <Button className="bg-primary-600 text-white font-bold h-16 px-12 rounded-full uppercase tracking-widest italic" onClick={() => window.location.reload()}>SALVEAZĂ PREFERINȚELE</Button>
          <Button variant="outline" className="border-white/5 text-neutral-400 font-bold h-16 px-12 rounded-full uppercase tracking-widest italic hover:text-white" onClick={() => window.location.reload()}>DOAR ESENȚIALE</Button>
       </div>
    </div>
  </PublicLayout>
);

export const Contact = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-7xl mx-auto px-6 py-32 space-y-24">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="space-y-12">
             <div className="space-y-4">
                <span className="text-primary-500 font-bold text-[10px] uppercase tracking-widest italic">Global Operations Hub</span>
                <h1 className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter">Contact</h1>
             </div>
             <div className="space-y-8">
                <div className="space-y-2">
                   <div className="text-primary-500 font-bold uppercase tracking-widest text-[10px]">Headquarters</div>
                   <div className="text-white font-bold italic text-xl">Chișinău, Republica Moldova</div>
                   <p className="text-neutral-600 text-sm italic">Str. Mitropolit Varlam, Nr. 65</p>
                </div>
                <div className="space-y-2">
                   <div className="text-primary-500 font-bold uppercase tracking-widest text-[10px]">Digital Reach</div>
                   <div className="text-white font-bold italic text-xl">contact@promo-effect.com</div>
                   <div className="text-white font-bold italic text-xl">+373 (60) 123 456</div>
                </div>
             </div>
          </div>
          <SolidCard className="bg-[#0A0C10] border-white/5 p-12">
             <h3 className="text-2xl font-black text-white italic uppercase mb-10 tracking-widest">Trimite un Mesaj Rapid</h3>
             <form className="space-y-6">
                <input type="text" placeholder="NUME COMPLET" className="w-full bg-white/2 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-800 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none" />
                <input type="email" placeholder="EMAIL CORPORATE" className="w-full bg-white/2 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-800 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none" />
                <textarea placeholder="DETALII PROIECT" rows={4} className="w-full bg-white/2 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-800 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none resize-none" />
                <Button className="w-full bg-primary-600 text-white font-black h-16 rounded-full uppercase tracking-widest italic text-xs shadow-[0_10px_40px_rgba(249,115,22,0.2)]">Expediază</Button>
             </form>
          </SolidCard>
       </div>
    </div>
  </PublicLayout>
);
