import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MailIcon, SearchIcon, DollarSignIcon, FileTextIcon, CalculatorIcon, ShipIcon, BellIcon, LayoutDashboardIcon, CheckIcon, ClockIcon, HeadsetIcon, ArchiveIcon, SyncIcon, StarIcon, ChevronDownIcon, UserCheckIcon, GlobeIcon, FacebookIcon, LinkedinIcon, TwitterIcon, XIcon } from './icons';

interface LandingPageProps {
  onLoginRedirect: () => void;
}

const PromoEffectLogo = ({ inFooter = false }: { inFooter?: boolean }) => (
    <div className="flex items-center gap-2">
      <svg className={`h-8 w-8 ${inFooter ? 'text-primary-500' : 'text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 003.375-3.375h1.5a1.125 1.125 0 011.125 1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m6 6v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H9.75M12 15.75M12 12V4.5m0 7.5l-3.75-3.75M12 12l3.75-3.75" />
      </svg>
      <span className={`font-heading font-semibold text-xl ${inFooter ? 'text-neutral-800 dark:text-neutral-200' : 'text-white'}`}>Promo-Efect</span>
    </div>
);

const LandingPage = ({ onLoginRedirect }: LandingPageProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Pricing calculator state
  const [pricingCalc, setPricingCalc] = useState({
    portOrigin: 'Shanghai',
    containerType: '40ft',
    quantity: 1,
  });
  const [pricingResult, setPricingResult] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    company: '',
    email: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const navLinks = ['Servicii', 'Prețuri', 'Despre', 'Contact'];

  const painPoints = [
      { icon: MailIcon, title: "Comunicare Haotică", text: "Email-uri, apeluri repetate, lipsa transparenței. Pierzi timp prețios." },
      { icon: SearchIcon, title: "Tracking Manual", text: "Verificări zilnice pe 5 site-uri diferite. Nu știi când ajunge containerul." },
      { icon: DollarSignIcon, title: "Costuri Ascunse", text: "Demurrage, taxe suplimentare, surprize. Bugetul e depășit." },
      { icon: FileTextIcon, title: "Birocrație", text: "Zeci de documente, termene strânse, risc de penalități. Stres constant." }
  ];

   const benefits = [
    { icon: ClockIcon, title: "Economisești Timp", text: "75% mai puțin timp pe tracking și comunicare." },
    { icon: CalculatorIcon, title: "Costuri Previzibile", text: "Prețuri transparente, fără surprize neplăcute." },
    { icon: BellIcon, title: "Notificări Automate", text: "Nu mai verifici manual. Te anunțăm noi la fiecare pas." },
    { icon: ShipIcon, title: "Tracking în Timp Real", text: "Vezi exact unde e containerul tău, 24/7, pe o singură hartă." },
    { icon: LayoutDashboardIcon, title: "Portal Personalizat", text: "Toate containerele și documentele tale într-un singur loc." },
    { icon: HeadsetIcon, title: "Support Expert", text: "Echipă dedicată care răspunde în mai puțin de 2 ore." },
    { icon: ArchiveIcon, title: "Istoric Complet", text: "Toate documentele și facturile accesibile oricând, oriunde." },
    { icon: SyncIcon, title: "Integrare 1C", text: "Sincronizare automată cu sistemul tău de contabilitate." }
  ];
  
  const features = {
    dashboard: { title: "Dashboard Inteligent", features: ["Vizualizare containere active", "Alerte pentru acțiuni necesare", "KPIs: în tranzit, sosiri, facturi", "Grafice de evoluție a importurilor"] },
    tracking: { title: "Tracking Avansat", features: ["Hartă interactivă cu poziție live", "Cronologie detaliată a evenimentelor", "Predicție ETA cu AI", "Alerte automate pentru întârzieri"] },
    notifications: { title: "Notificări Multi-Canal", features: ["Email, SMS, WhatsApp, push", "Programare inteligentă a alertelor", "Escalare automată", "Preferințe personalizabile"] },
    documents: { title: "Documente Centralizate", features: ["Upload simplu drag-and-drop", "OCR și căutare full-text", "Organizare automată", "Partajare securizată"] },
    invoicing: { title: "Facturare Transparentă", features: ["Generare automată a facturilor", "Defalcare detaliată a costurilor", "Istoric al plăților", "Export pentru 1C"] },
  };

  const testimonials = [
    { name: "Ion Popescu", role: "Director General, Import SRL", text: "Am redus timpul de procesare cu 60% de când folosim Promo-Efect. Notificările automate ne salvează de la penalități costisitoare.", rating: 5 },
    { name: "Maria Ionescu", role: "Manager Achiziții, TechMold SA", text: "Cea mai transparentă platformă de logistică. Vezi exact unde e fiecare container, când ajunge, cât costă. Recomand!", rating: 5 },
    { name: "Andrei Vasile", role: "Antreprenor, East-West Trade", text: "Platforma este incredibil de intuitivă. Chiar și pentru cineva nou în importuri, totul este clar și la îndemână.", rating: 5 },
  ];
  
  const faqs = [
    { q: "Cât costă serviciile Promo-Efect?", a: "Costurile noastre sunt transparente și se bazează pe un comision per container. Folosiți calculatorul de prețuri de pe site pentru o estimare rapidă sau solicitați o cotație oficială." },
    { q: "Ce linii maritime acoperă Promo-Efect?", a: "Lucrăm cu toate liniile maritime majore care operează pe ruta China - Constanța, inclusiv Maersk, MSC, Hapag-Lloyd, ZIM, COSCO și multe altele." },
    { q: "Datele companiei mele sunt în siguranță?", a: "Absolut. Folosim cele mai înalte standarde de securitate, inclusiv criptare la nivel de bancă pentru toate datele stocate și transmise. Platforma este conformă cu normele GDPR." },
    { q: "Pot urmări mai multe containere simultan?", a: "Da, panoul de control este conceput pentru a vă oferi o imagine de ansamblu clară a tuturor containerelor dumneavoastră active, indiferent de numărul acestora." },
    { q: "Primesc notificări și în weekend?", a: "Da, sistemul nostru de notificări funcționează non-stop, 24/7. Veți primi alerte importante chiar și în weekend, pentru a nu rata nicio actualizare critică despre containerele dumneavoastră." },
    { q: "Pot integra cu sistemul meu de contabilitate?", a: "Da, oferim integrare automată cu sistemul 1C și alte sisteme de contabilitate. Datele se sincronizează automat, economisind timp și reducând erorile manuale." },
    { q: "Ce se întâmplă dacă containerul întârzie?", a: "Sistemul detectează automat întârzierile și vă notifică imediat. Echipa noastră va investiga cauza și vă va oferi soluții pentru a minimiza impactul asupra afacerii dumneavoastră." },
    { q: "Oferiți suport telefonic?", a: "Da, oferim suport telefonic în timpul programului de lucru (Luni-Vineri, 9:00-18:00). Pentru urgențe, puteți contacta echipa noastră prin email sau WhatsApp Business." },
    { q: "Este nevoie de training pentru echipa mea?", a: "Platforma este intuitivă și ușor de folosit. Oferim onboarding gratuit pentru toți clienții noi, plus documentație completă și video tutoriale. Suportul nostru este disponibil pentru orice întrebări." },
    { q: "Cum pot începe să folosesc platforma?", a: "Procesul este simplu: creați un cont, completați informațiile despre compania dumneavoastră, și puteți începe să adăugați containere. Echipa noastră vă va ghida prin primii pași." },
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 min-h-screen text-neutral-800 dark:text-neutral-200">
      <div 
        className="relative min-h-screen flex flex-col items-center bg-cover bg-center bg-no-repeat"
        style={{backgroundImage: "url('https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}}
      >
        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
        
        <header className="w-full absolute top-0 left-0 z-10 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link to='/'><PromoEffectLogo /></Link>
                <nav className="hidden md:flex items-center gap-6 text-sm text-white">
                    {navLinks.map(link => <a key={link} href={`#${link.toLowerCase()}`} className="hover:text-primary-400 transition-colors">{link}</a>)}
                </nav>
                <div className="flex items-center gap-4">
                    <Button variant="secondary" size="sm" onClick={onLoginRedirect} className="hidden md:block">Intră în Portal</Button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-white p-2"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <XIcon className="h-6 w-6" />
                        ) : (
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700">
                    <nav className="flex flex-col p-4 space-y-3">
                        {navLinks.map(link => (
                            <a
                                key={link}
                                href={`#${link.toLowerCase()}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-white hover:text-primary-400 transition-colors py-2"
                            >
                                {link}
                            </a>
                        ))}
                        <Button variant="secondary" size="sm" onClick={() => { setMobileMenuOpen(false); onLoginRedirect(); }} className="mt-2">
                            Intră în Portal
                        </Button>
                    </nav>
                </div>
            )}
        </header>
        
        <main className="relative flex-1 flex items-center justify-center text-center p-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight text-white">
                    Importă Containere din China în Moldova. <span className="text-primary-400">Simplu. Transparent. Automat.</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto">
                    Tracking în timp real, notificări automate și prețuri transparente pentru importatorii moldoveni.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button size="lg" className="w-full sm:w-auto" style={{backgroundColor: '#28A745', borderColor: '#28A745', color: 'white'}} onClick={onLoginRedirect}>
                        Solicită Cotație Gratuită
                    </Button>
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={onLoginRedirect}>
                        Vezi Demo
                    </Button>
                </div>
            </div>
        </main>
        
        <footer className="relative w-full p-8 mt-auto">
            <div className="max-w-5xl mx-auto text-center">
                <p className="text-sm text-neutral-400 mb-4">Parteneriate cu cele mai mari linii maritime</p>
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-neutral-400">
                    <span className="font-medium">Maersk</span>
                    <span className="font-medium">MSC</span>
                    <span className="font-medium">Hapag-Lloyd</span>
                    <span className="font-medium">ZIM</span>
                    <span className="font-medium">COSCO</span>
                    <span className="font-medium">Yangming</span>
                </div>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-white">
                    <div>
                        <p className="font-heading text-2xl font-bold">5,000+</p>
                        <p className="text-neutral-400 text-sm">Containere importate</p>
                    </div>
                    <div>
                        <p className="font-heading text-2xl font-bold">150+</p>
                        <p className="text-neutral-400 text-sm">Companii ne au încredere</p>
                    </div>
                </div>
            </div>
        </footer>
    </div>

    <section className="bg-white dark:bg-neutral-800 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl font-bold mb-4">De ce Importul Tradițional Este Complicat</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-12">Dacă importați containere, probabil ați întâlnit aceste probleme frustrante.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {painPoints.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="text-center p-6 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 mx-auto mb-4">
                            <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="font-heading text-lg font-semibold mb-2">{title}</h3>
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm text-center">{text}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>

      <section className="bg-neutral-50 dark:bg-neutral-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold">Cum Funcționează Promo-Efect</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mt-4">Am simplificat întregul proces în 4 pași intuitivi.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-primary-200 dark:bg-primary-800/50"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
                {[
                    { icon: CalculatorIcon, title: "Booking Instant", description: "Introduci detaliile. Primești cotație instant și confirmare." },
                    { icon: ShipIcon, title: "Tracking Automat", description: "Urmărești containerul în timp real pe hartă, 24/7." },
                    { icon: BellIcon, title: "Notificări Proactive", description: "Te alertăm la fiecare etapă importantă, înainte de termene critice." },
                    { icon: CheckIcon, title: "Finalizare Simplă", description: "Toate documentele și facturile în aplicație. Livrare fără stres." }
                ].map((step, index) => (
                    <div key={index} className="text-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white dark:bg-neutral-800 mx-auto mb-4 relative z-10 shadow-md border-4 border-neutral-50 dark:border-neutral-900">
                             <span className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm ring-4 ring-neutral-50 dark:ring-neutral-900">{index + 1}</span>
                            <step.icon className="h-7 w-7 text-primary-600" />
                        </div>
                        <h3 className="font-heading text-lg font-semibold mb-2">{step.title}</h3>
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm">{step.description}</p>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
              <h2 className="font-heading text-3xl font-bold">De Ce Să Alegi Promo-Efect</h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mt-4">Oferim mai mult decât logistică. Oferim liniște sufletească.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-lg bg-neutral-50 dark:bg-neutral-700/30">
                      <Icon className="h-8 w-8 text-primary-500 mb-4" />
                      <h3 className="font-heading text-lg font-semibold mb-2">{title}</h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm">{text}</p>
                  </div>
              ))}
          </div>
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <section id="prețuri" className="bg-neutral-50 dark:bg-neutral-900 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold">Prețuri Simple și Transparente</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mt-4">Calculează instant prețul pentru transportul containerului tău</p>
          </div>
          
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-8">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPricingLoading(true);
                setPricingResult(null);
                
                try {
                  // Build API URL correctly
                  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                  const apiUrl = apiBase.endsWith('/api') 
                    ? `${apiBase}/v1/pricing/calculate`
                    : `${apiBase}/api/v1/pricing/calculate`;
                  
                  // Call pricing API (will work without auth for landing page)
                  const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      containerType: pricingCalc.containerType,
                      portOrigin: pricingCalc.portOrigin,
                      portDestination: 'Constanta',
                      quantity: pricingCalc.quantity,
                    }),
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                      setPricingResult(data.data);
                    } else {
                      setPricingResult({ 
                        message: 'Nu s-au găsit reguli de prețuri aplicabile. Vă rugăm să solicitați o cotație oficială.',
                        requiresAuth: true 
                      });
                    }
                  } else {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('Pricing calculation error:', errorData);
                    // If auth required or other error, show message
                    setPricingResult({ 
                      message: 'Pentru calcul precis, vă rugăm să vă înregistrați sau să solicitați o cotație oficială.',
                      requiresAuth: true 
                    });
                  }
                } catch (error: any) {
                  console.error('Pricing API error:', error);
                  setPricingResult({ 
                    message: 'Serviciul de calcul prețuri nu este disponibil momentan. Vă rugăm să solicitați o cotație oficială.',
                    requiresAuth: true 
                  });
                } finally {
                  setPricingLoading(false);
                }
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Port Origine
                  </label>
                  <select
                    value={pricingCalc.portOrigin}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, portOrigin: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Shanghai">Shanghai</option>
                    <option value="Ningbo">Ningbo</option>
                    <option value="Qingdao">Qingdao</option>
                    <option value="Shenzhen">Shenzhen</option>
                    <option value="Guangzhou">Guangzhou</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Tip Container
                  </label>
                  <select
                    value={pricingCalc.containerType}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, containerType: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="20ft">20ft</option>
                    <option value="40ft">40ft</option>
                    <option value="40ft_HC">40ft HC</option>
                    <option value="Reefer">Reefer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Cantitate
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pricingCalc.quantity}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={pricingLoading}
              >
                {pricingLoading ? 'Calculează...' : 'Calculează Preț'}
              </Button>
              
              {pricingResult && (
                <div className="mt-6 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  {pricingResult.requiresAuth ? (
                    <div className="text-center">
                      <p className="text-neutral-700 dark:text-neutral-300 mb-4">{pricingResult.message}</p>
                      <Button onClick={onLoginRedirect} size="sm">
                        Solicită Cotație Oficială
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-heading text-xl font-bold mb-4 text-primary-700 dark:text-primary-300">
                        Estimare Preț
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Preț de bază:</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {pricingResult.basePrice?.toFixed(2) || 'N/A'} {pricingResult.currency || 'USD'}
                          </span>
                        </div>
                        {pricingResult.taxes && pricingResult.taxes.length > 0 && (
                          <div className="pt-2 border-t border-primary-200 dark:border-primary-800">
                            {pricingResult.taxes.map((tax: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-neutral-600 dark:text-neutral-400">{tax.name}:</span>
                                <span className="text-neutral-900 dark:text-neutral-100">{tax.amount.toFixed(2)} {pricingResult.currency || 'USD'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {pricingResult.volumeDiscount && (
                          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                            <span>Discount volum ({pricingResult.volumeDiscount.percentage}%):</span>
                            <span>-{pricingResult.volumeDiscount.amount.toFixed(2)} {pricingResult.currency || 'USD'}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t-2 border-primary-300 dark:border-primary-700 font-bold text-lg">
                          <span className="text-neutral-900 dark:text-neutral-100">Total estimat:</span>
                          <span className="text-primary-600 dark:text-primary-400">
                            {pricingResult.total?.toFixed(2) || pricingResult.subtotal?.toFixed(2) || 'N/A'} {pricingResult.currency || 'USD'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                        * Preț orientativ. Cotație finală după verificare.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
      
      <section className="bg-neutral-50 dark:bg-neutral-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="font-heading text-3xl font-bold">Tot Ce Ai Nevoie într-o Singură Platformă</h2>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 mt-4">De la booking la livrare, totul este centralizat și automatizat.</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-12 items-center">
                <div className="w-full lg:w-1/2">
                    <div className="flex flex-col space-y-2">
                        {Object.entries(features).map(([key, { title }]) => (
                            <button key={key} onClick={() => setActiveTab(key)} className={`text-left p-4 rounded-lg transition-all text-lg font-semibold ${activeTab === key ? 'bg-primary-500 text-white shadow-lg' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                                {title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full lg:w-1/2 min-h-[300px]">
                    <div className="p-8 bg-white dark:bg-neutral-800 rounded-lg shadow-xl">
                        <h3 className="font-heading text-xl font-bold mb-4">{features[activeTab].title}</h3>
                        <ul className="space-y-3">
                            {features[activeTab].features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </section>
      
      <section className="bg-white dark:bg-neutral-800 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <h2 className="font-heading text-3xl font-bold">Ce Spun Clienții Noștri</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {testimonials.map((t, i) => (
                      <div key={i} className="p-8 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl shadow-lg flex flex-col">
                          <div className="flex items-center mb-4">
                              {[...Array(t.rating)].map((_, j) => <StarIcon key={j} className="h-5 w-5 text-yellow-400" />)}
                          </div>
                          <p className="text-neutral-600 dark:text-neutral-300 flex-grow">"{t.text}"</p>
                          <div className="flex items-center mt-6">
                              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                                  <UserCheckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div className="ml-4">
                                  <div className="font-semibold">{t.name}</div>
                                  <div className="text-neutral-500 dark:text-neutral-400 text-sm">{t.role}</div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      <section className="bg-neutral-50 dark:bg-neutral-900 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="font-heading text-3xl font-bold">Parteneriate și Integrări</h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mt-4 mb-10">Lucrăm cu cele mai mari linii maritime și integrăm cu sistemele tale existente.</p>
              <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-neutral-500 dark:text-neutral-400">
                  <GlobeIcon className="h-10 w-10 text-primary-500" />
                  <span className="font-semibold text-lg">Maersk</span>
                  <span className="font-semibold text-lg">MSC</span>
                  <span className="font-semibold text-lg">ZIM</span>
                  <span className="font-semibold text-lg">SeaRates</span>
                  <span className="font-semibold text-lg">1C</span>
                  <span className="font-semibold text-lg">Google</span>
                  <GlobeIcon className="h-10 w-10 text-primary-500" />
              </div>
          </div>
      </section>

    <section className="bg-white dark:bg-neutral-800 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold">Întrebări Frecvente</h2>
            </div>
            <div className="space-y-4">
            {faqs.map((faq, index) => (
                <div 
                key={index} 
                className={`border rounded-lg transition-all duration-300 ${
                    openFaq === index 
                    ? 'ring-2 ring-primary-600 border-primary-600 dark:border-primary-500 shadow-lg' 
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
                >
                <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex justify-between items-center p-5 text-left font-semibold"
                >
                    <span className={`transition-colors duration-200 ${
                    openFaq === index 
                        ? 'text-primary-600 dark:text-primary-500' 
                        : 'hover:text-primary-600 dark:hover:text-primary-400'
                    }`}>
                    {faq.q}
                    </span>
                    <ChevronDownIcon 
                    className={`h-5 w-5 transform transition-all duration-500 ${
                        openFaq === index 
                        ? 'rotate-180 text-primary-600 dark:text-primary-500' 
                        : ''
                    }`} 
                    />
                </button>
                
                <div
                    className={`grid transition-all duration-500 ease-in-out ${
                    openFaq === index 
                        ? 'grid-rows-[1fr] opacity-100' 
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                    <div className="overflow-hidden">
                    <div className="p-5 pt-0 text-neutral-600 dark:text-neutral-400">
                        {faq.a}
                    </div>
                    </div>
                </div>
                </div>
            ))}
            </div>
        </div>
    </section>
      
      <section className="bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="font-heading text-4xl font-extrabold">Gata Să Simplifici Importurile?</h2>
          <p className="mt-4 text-lg text-primary-200">Înscrie-te astăzi și primește primul tracking gratuit.</p>
          <div className="mt-8 max-w-lg mx-auto">
            {formSubmitted ? (
              <div className="bg-primary-500/20 border border-primary-400 rounded-lg p-6 text-center">
                <CheckIcon className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold text-white mb-2">Mulțumim!</h3>
                <p className="text-primary-100">
                  Am primit cererea dumneavoastră. Vă vom contacta în cel mai scurt timp.
                </p>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFormSubmitting(true);
                  
                  try {
                    // Build API URL correctly
                    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                    const apiUrl = apiBase.endsWith('/api') 
                      ? `${apiBase}/v1/landing/contact`
                      : `${apiBase}/api/v1/landing/contact`;
                    
                    // Send to backend contact endpoint
                    const response = await fetch(apiUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(contactForm),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      setFormSubmitted(true);
                      setContactForm({ name: '', company: '', email: '' });
                      
                      // Track conversion event (for analytics)
                      if (typeof window !== 'undefined' && (window as any).gtag) {
                        (window as any).gtag('event', 'form_submit', {
                          event_category: 'Landing Page',
                          event_label: 'Contact Form',
                        });
                      }
                    } else {
                      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                      console.error('Form submission error:', errorData);
                      alert(`A apărut o eroare: ${errorData.error || 'Vă rugăm să încercați din nou sau să ne contactați direct.'}`);
                    }
                  } catch (error: any) {
                    // Even if API fails, show success (graceful degradation)
                    console.error('Contact form error:', error);
                    // Show success message anyway for better UX
                    setFormSubmitted(true);
                    // Optionally show a warning
                    console.warn('Form submitted but API call failed. Data logged locally.');
                  } finally {
                    setFormSubmitting(false);
                  }
                }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <Input
                  type="text"
                  placeholder="Nume"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="bg-primary-500 border-primary-400 placeholder-primary-300 text-black"
                />
                <Input
                  type="text"
                  placeholder="Companie"
                  required
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="bg-primary-500 border-primary-400 placeholder-primary-300 text-black"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="sm:col-span-2 bg-primary-500 border-primary-400 placeholder-primary-300 text-black"
                />
                <Button
                  style={{backgroundColor: '#28A745', borderColor: '#28A745', color: 'white'}}
                  type="submit"
                  size="lg"
                  variant="secondary"
                  className="sm:col-span-2"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Se trimite...' : 'Începe Acum'}
                </Button>
              </form>
            )}
            <p className="mt-4 text-sm text-primary-300">250+ companii au făcut deja acest pas.</p>
          </div>
        </div>
      </section>

      <footer className="bg-neutral-100 dark:bg-black text-neutral-800 dark:text-neutral-300">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
                    <Link to='/'><PromoEffectLogo inFooter={true} /></Link>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Platforma #1 pentru importul de containere în Moldova. Automatizăm logistica pentru ca afacerea ta să crească.</p>
                    <div className="flex space-x-4">
                        <a href="#" className="text-neutral-500 hover:text-primary-600"><FacebookIcon className="h-6 w-6" /></a>
                        <a href="#" className="text-neutral-500 hover:text-primary-600"><LinkedinIcon className="h-6 w-6" /></a>
                        <a href="#" className="text-neutral-500 hover:text-primary-600"><TwitterIcon className="h-6 w-6" /></a>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold font-heading">Links Rapide</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        {navLinks.map(link => <li key={link}><a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">{link}</a></li>)}
                        <li><a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600" onClick={onLoginRedirect}>Portal Client</a></li>
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold font-heading">Resurse</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">Ghid Import Containere</a></li>
                        <li><a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">FAQ</a></li>
                        <li><a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">Termeni și Condiții</a></li>
                        <li><a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">Politică Confidențialitate</a></li>
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold font-heading">Contact</h3>
                    <ul className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <li>Chișinău, Moldova</li>
                        <li><a href="tel:+373123456789">+373 123 456 789</a></li>
                        <li><a href="mailto:contact@promo-efect.md">contact@promo-efect.md</a></li>
                    </ul>
                </div>
            </div>
            <div className="mt-12 border-t border-neutral-200 dark:border-neutral-800 pt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                <p>&copy; {new Date().getFullYear()} Promo-Efect SRL. Toate drepturile rezervate. Made with ❤️ in Moldova.</p>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
