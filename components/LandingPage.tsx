import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from 'framer-motion';
import { Button } from './ui/Button';
import { PromoEffectLogo } from '@/components/PromoEffectLogo';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import {
  MailIcon,
  ShipIcon,
  CalculatorIcon,
  BellIcon,
  LayoutDashboardIcon,
  CheckIcon,
  ClockIcon,
  StarIcon,
  UserCheckIcon,
  XIcon,
  CheckCircleIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  BarChart3Icon,
  ZapIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  SearchIcon,
  PackageIcon,
  TrendingUpIcon,
  AnchorIcon,
  TruckIcon,
  ArrowRightIcon,
  PlusIcon,
  MinusIcon,
  QuoteIcon,
  RouteIcon,
} from './icons';
import { LogisticsMap } from './LogisticsMap';

interface LandingPageProps {
  onLoginRedirect: () => void;
}

const SectionHeading = ({ subtitle, title, description, centered = false }: any) => (
  <div className={`mb-16 ${centered ? 'text-center mx-auto max-w-3xl' : 'text-left'}`}>
    <span className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block">
      {subtitle}
    </span>
    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6 leading-tight uppercase italic">
      {title}
    </h2>
    {description && (
      <p className="text-neutral-500 text-lg font-medium leading-relaxed italic">{description}</p>
    )}
  </div>
);

const SolidCard = ({
  children,
  className = '',
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  key?: any;
}) => (
  <div
    className={`bg-[#0A0C10] border border-white/5 rounded-xl group transition-all duration-300 hover:border-white/10 hover:bg-[#0D0F14] ${noPadding ? '' : 'p-8'} ${className}`}
  >
    {children}
  </div>
);

const FAQItem = ({ question, answer }: { question: string; answer: string; key?: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/5 py-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span
          className={`text-lg font-bold transition-colors ${isOpen ? 'text-primary-500' : 'text-white hover:text-neutral-300'}`}
        >
          {question}
        </span>
        {isOpen ? (
          <MinusIcon className="h-5 w-5 text-primary-500" />
        ) : (
          <PlusIcon className="h-5 w-5 text-neutral-600 group-hover:text-white" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-4 text-neutral-500 leading-relaxed italic pr-12">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Redacted internal LogisticsMap

const LandingPage = ({ onLoginRedirect }: LandingPageProps) => {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.05]);

  return (
    <div className="bg-[#050608] min-h-screen text-neutral-300 selection:bg-primary-500/30 font-sans antialiased">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `,
        }}
      />

      {/* Navbar Evolution */}
      <PublicHeader onLoginRedirect={onLoginRedirect} />

      {/* Hero Section */}
      <main className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/50 via-[#050608] to-[#050608] z-10" />
          <img
            src="/assets/generated/hero_cargo_ship_night_1773224120207.png"
            className="w-full h-full object-cover brightness-[0.3]"
            alt="Cargo vessel"
            loading="lazy"
          />
        </motion.div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-primary-500 text-[10px] font-bold uppercase tracking-widest">
                Inovație Logistică v2.0
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-9xl font-bold text-white tracking-tightest mb-8 leading-[0.9] uppercase italic">
              CONECTĂM <br className="hidden md:block" />{' '}
              <span className="text-primary-500">CONTINENTE.</span>
            </h1>

            <p className="max-w-2xl mx-auto text-neutral-400 text-lg md:text-xl font-medium leading-relaxed mb-12 italic">
              Excelență operațională și tehnologie de calcul în timp real pentru importurile tale
              strategice din Asia către Europa de Sud-Est.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary-600 text-white hover:bg-primary-500 text-sm font-bold tracking-wide transition-all h-16 px-12 group rounded-xl"
                onClick={onLoginRedirect}
              >
                ÎNCEPE CALCULUL{' '}
                <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/10 text-white hover:bg-white/5 text-sm font-bold h-16 px-12 rounded-xl"
                onClick={onLoginRedirect}
              >
                SERVICII & CAPABILITĂȚI
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Sector Expertise Section */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeading subtitle="Expertiză Verticală" title="Soluții Adaptate Industriei Tale." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Retail & E-commerce',
              desc: 'Consolidare rapidă și livrare direct la depozit pentru lanțuri de aprovizionare agile.',
            },
            {
              title: 'Industrial & Auto',
              desc: 'Logisitcă pentru componente grele, cu monitorizare strictă a termenelor de livrare JIT.',
            },
            {
              title: 'Tech & Electronics',
              desc: 'Manipulare securizată pentru mărfuri de mare valoare cu asigurare premium inclusă.',
            },
          ].map((sector, i) => (
            <SolidCard key={i}>
              <h4 className="text-xl font-bold text-white mb-4 uppercase italic tracking-tight">
                {sector.title}
              </h4>
              <p className="text-neutral-500 font-medium italic leading-relaxed">{sector.desc}</p>
            </SolidCard>
          ))}
        </div>
      </section>

      {/* Interactive Logistics Map */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <LogisticsMap />
      </section>

      {/* Digital Intelligence Section */}
      <section className="py-20 bg-[#07090b]/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block">
                Digital Core
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight uppercase italic mb-8">
                Decizii Bazate pe Date.
              </h2>
              <p className="text-neutral-500 text-lg font-medium italic leading-relaxed mb-10">
                Sistemul nostru proprietar elimină eroarea umană. De la cotații automate la
                monitorizarea satelitară a fiecărui container, tehnologia noastră este partenerul
                tău invizibil.
              </p>
              <div className="space-y-6">
                {[
                  {
                    t: 'Live Tracking API',
                    d: 'Integrare directă în ERP-ul tău pentru vizibilitate totală.',
                  },
                  {
                    t: 'Neural Route Optimizer',
                    d: 'Algoritmi care selectează rutele cele mai rapide în funcție de trafic și vreme.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_#2563eb]" />
                    <div>
                      <h5 className="text-white font-bold uppercase italic tracking-tight text-sm mb-1">
                        {item.t}
                      </h5>
                      <p className="text-neutral-600 text-sm font-medium italic">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/5">
              <img
                src="/assets/generated/smart_logistics_dashboard_mockup_1773224135612.png"
                className="w-full h-full object-cover grayscale opacity-40"
                alt="Tech Dashboard"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Capability Matrix Section */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeading
          subtitle="Conectivitate Globală"
          title="Matricea Capacității Operaționale."
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  Rută Strategică
                </th>
                <th className="text-left py-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  Tip Transit
                </th>
                <th className="text-left py-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  Lead Time
                </th>
                <th className="text-left py-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  Capacitate Săptămânală
                </th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-white tracking-tight italic">
              {[
                {
                  route: 'Shanghai - Constanța',
                  type: 'Maritime Direct',
                  time: '32-35 Zile',
                  cap: '450 TEU',
                },
                {
                  route: 'Ningbo - București',
                  type: 'Maritime & Road',
                  time: '38 Zile',
                  cap: '200 TEU',
                },
                {
                  route: 'Shenzhen - Giurgiu',
                  type: 'Combined Rail',
                  time: '22 Zile',
                  cap: '120 TEU',
                },
                {
                  route: 'Qingdao - Galați',
                  type: 'Maritime Feed',
                  time: '42 Zile',
                  cap: '80 TEU',
                },
              ].map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-6 uppercase">{row.route}</td>
                  <td className="py-6 text-neutral-500">{row.type}</td>
                  <td className="py-6 text-primary-500">{row.time}</td>
                  <td className="py-6 text-neutral-300">{row.cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Operational Infrastructure (Hubs) */}
      <section className="py-20 bg-[#0A0C10]/40">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading subtitle="Infrastructură" title="Hub-uri de Consolidare." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { city: 'SHANGHAI', role: 'Consolidare LCL', cap: '5000+ m2' },
              { city: 'SHENZHEN', role: 'Cross-docking Tech', cap: '2500+ m2' },
              { city: 'CONSTANȚA', role: 'Vămuire & Tranzit', cap: 'Terminal Dedicat' },
              { city: 'BUCUREȘTI', role: 'Distribuție Finală', cap: 'Last-mile Hub' },
            ].map((hub, i) => (
              <div
                key={i}
                className="p-8 border border-white/5 rounded-2xl bg-black/60 shadow-inner group hover:border-primary-500/30 transition-colors"
              >
                <h4 className="text-lg font-black text-white mb-2 italic">{hub.city}</h4>
                <p className="text-primary-500 text-[9px] font-black uppercase tracking-widest mb-4">
                  {hub.role}
                </p>
                <p className="text-neutral-600 text-xs font-medium italic">{hub.cap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-white/5 bg-[#07090b] py-16 overflow-hidden">
        <div className="flex whitespace-nowrap gap-20 animate-marquee opacity-20 grayscale hover:opacity-100 transition-all duration-700">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-20 items-center">
              {[
                'Maersk',
                'MSC',
                'Cosco',
                'Evergreen',
                'Hapag-Lloyd',
                'ONE',
                'Yang Ming',
                'CMA CGM',
              ].map((logo) => (
                <span
                  key={logo}
                  className="text-3xl font-black text-white tracking-widest uppercase italic"
                >
                  {logo}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeading
          subtitle="Tehnologie și Infrastructură"
          title="Digitalizăm Logistica Tradițională."
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px]">
          <SolidCard className="md:col-span-8 md:row-span-2 flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10 max-w-md">
              <div className="h-12 w-12 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mb-8 text-primary-500">
                <LayoutDashboardIcon className="h-6 w-6" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-6 uppercase italic tracking-tight">
                PLATFORMĂ DE TRACKING <br /> INTELLIGENTĂ
              </h3>
              <p className="text-neutral-500 font-medium leading-relaxed italic">
                Urmăriți fiecare container în timp real cu o precizie de 99.8%. Primiți alerte
                instantanee pentru documentație, status vamal și locație GPS.
              </p>
            </div>
            <img
              src="/assets/generated/smart_logistics_dashboard_mockup_1773224135612.png"
              className="absolute -right-20 -bottom-20 w-[60%] opacity-20 grayscale"
              alt="Dashboard"
              loading="lazy"
            />
          </SolidCard>

          <SolidCard className="md:col-span-4 flex flex-col justify-center">
            <ZapIcon className="h-10 w-10 text-yellow-500 mb-6" />
            <h4 className="text-xl font-bold text-white mb-4 uppercase italic tracking-tight">
              Cotații Instantanee
            </h4>
            <p className="text-neutral-500 text-sm font-medium leading-relaxed italic">
              Obțineți tarife contractuale garantate în mai puțin de 30 de secunde, direct din
              portal.
            </p>
          </SolidCard>

          <SolidCard className="md:col-span-4 flex flex-col justify-center">
            <ShieldCheckIcon className="h-10 w-10 text-emerald-500 mb-6" />
            <h4 className="text-xl font-bold text-white mb-4 uppercase italic tracking-tight">
              Securitate Maximă
            </h4>
            <p className="text-neutral-500 text-sm font-medium leading-relaxed italic">
              Asigurare Cargo inclusă și sigilii digitale monitorizate pentru integritate totală.
            </p>
          </SolidCard>

          <SolidCard className="md:col-span-12 flex items-center justify-between overflow-hidden">
            <div className="flex gap-20">
              <div>
                <div className="text-6xl font-black text-white leading-none">99.2%</div>
                <p className="text-primary-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                  Succes Vămuire
                </p>
              </div>
              <div>
                <div className="text-6xl font-black text-white leading-none">5k+</div>
                <p className="text-primary-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                  Containere/An
                </p>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-neutral-600 italic text-sm max-w-sm">
                "Promo-Efect este centrul nostru nervos pentru importurile din Asia. Digitalizarea
                procesului ne-a salvat mii de euro lunar."
              </p>
            </div>
          </SolidCard>
        </div>
      </section>

      {/* NEW: FAQ Section */}
      <section className="py-20 bg-[#07090b] border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading subtitle="Suport Clienți" title="Întrebări Frecvente." centered />
          <div className="space-y-4">
            {[
              {
                q: 'Cât durează un transport maritim din Shanghai în Constanța?',
                a: 'În mod obișnuit, timpul de tranzit este între 38 și 42 de zile, depinzând de linia maritimă aleasă și de condițiile din porturi.',
              },
              {
                q: 'Se pot importa și volume mai mici decât un container întreg?',
                a: 'Da, oferim servicii de grupaj (LCL - Less than Container Load), unde plătiți doar pentru volumul real ocupat de marfa dvs.',
              },
              {
                q: 'Cum funcționează reprezentarea fiscală pentru companii?',
                a: 'Promo-Efect poate acționa ca reprezentant fiscal, facilitând plata TVA-ului și a taxelor vamale într-un mod optimizat, conform legislației UE.',
              },
              {
                q: 'Oferiți asigurare pentru mărfurile transportate?',
                a: "Toate transporturile operate prin platforma noastră beneficiază de asigurare Cargo de tip 'All Risks', garantând recuperarea valorii integrale în caz de incident.",
              },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories / Testimonials */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeading subtitle="Parteneriate Solidari" title="Rezultate Care Vorbesc." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Andrei Popescu',
              role: 'CEO, TechLogistics Group',
              text: 'Eficiența administrativă este la un alt nivel. Nu am mai văzut o platformă atât de precisă în prognozele de transport.',
              stat: '-12 zile lead time',
            },
            {
              name: 'Elena Ionescu',
              role: 'Director Import, RetailGlobal',
              text: 'Transparența costurilor a eliminat surprizele din facturile portuare. O colaborare bazată pe date și profesionalism.',
              stat: '+20% eficiență cost',
            },
            {
              name: 'Mihai Vasilescu',
              role: 'Manager Operațiuni, EuroFabrix',
              text: 'Sistemul lor de tracking ne-a permis să optimizăm stocurile mult mai bine. Un partener tehnologic esențial.',
              stat: '0 erori vamale',
            },
          ].map((test, i) => (
            <SolidCard key={i} className="flex flex-col justify-between">
              <div>
                <QuoteIcon className="h-8 w-8 text-primary-500/20 mb-8" />
                <p className="text-lg text-white font-medium italic mb-8 leading-relaxed">
                  "{test.text}"
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-8">
                <div>
                  <span className="block text-white font-bold text-sm tracking-tight">
                    {test.name}
                  </span>
                  <span className="block text-neutral-600 text-[10px] font-bold uppercase tracking-widest">
                    {test.role}
                  </span>
                </div>
                <div className="bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-lg text-[10px] font-black text-primary-500 uppercase">
                  {test.stat}
                </div>
              </div>
            </SolidCard>
          ))}
        </div>
      </section>

      {/* Resources & Insights Preview */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeading
          subtitle="Cunoaștere și Expertiză"
          title="Navigați Complexitatea Importurilor."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {[
            {
              title: 'Ghid Complet Import Containere 2026',
              desc: 'Tot ce trebuie să știi despre taxe, documentație și logistică din Asia către România.',
              tag: 'Ghid Tehnic',
              img: '/assets/generated/modern_warehouse_tech_1773224152286.png',
              href: '/ghidimportcontainere',
            },
            {
              title: 'Optimizarea lanțului de aprovizionare',
              desc: 'Analiză detaliată despre cum să reduci lead-time-ul cu 15% prin consolidare LCL.',
              tag: 'Case Study',
              img: '/assets/generated/trade_routes_neon_1773224386483.png',
              href: '/resurse',
            },
          ].map((item, i) => (
            <Link key={i} to={item.href} className="group cursor-none">
              <div className="relative aspect-[16/9] rounded-[2rem] overflow-hidden mb-8 border border-white/5">
                <img
                  src={item.img}
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                  alt={item.title}
                  loading="lazy"
                />
                <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                  {item.tag}
                </div>
              </div>
              <h4 className="text-2xl font-bold text-white mb-4 group-hover:text-primary-500 transition-colors uppercase italic tracking-tight">
                {item.title}
              </h4>
              <p className="text-neutral-500 font-medium italic leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Final CTA Downsized */}
      <section id="pricing" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-12 md:p-16 bg-[#0A0C10] border border-primary-500/20 rounded-[2rem] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-20" />
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-6 italic tracking-tight uppercase">
              Sunteți gata să <br />{' '}
              <span className="text-primary-500">OPTIMIZAȚI IMPORTURILE?</span>
            </h2>
            <p className="text-neutral-600 text-sm mb-10 max-w-lg mx-auto italic font-medium leading-relaxed">
              Obțineți prima cotație gratuită în 30 de secunde și descoperiți puterea calculului
              strategic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary-600 text-white hover:bg-primary-500 font-black h-12 px-8 rounded-xl tracking-widest uppercase text-[10px]"
                onClick={onLoginRedirect}
              >
                CALCULEAZĂ ACUM &rarr;
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/10 text-white hover:bg-white/5 font-black h-12 px-8 rounded-xl tracking-widest uppercase text-[10px]"
                onClick={onLoginRedirect}
              >
                VREAU O CONSULTANȚĂ
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Restored and Refined */}
      <PublicFooter />
    </div>
  );
};

export default LandingPage;
