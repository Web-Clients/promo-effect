import React from 'react';
import { PublicLayout } from './_shared';

const Politica = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-20">
      <div className="space-y-4">
        <div className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] italic">
          Data Protection Grid
        </div>
        <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter">
          Politică de Confidențialitate
        </h1>
      </div>
      <div className="space-y-20 text-neutral-500 italic leading-relaxed text-sm">
        {[
          {
            t: 'Baza Legală pentru Prelucrare',
            d: 'Promo-Efect procesează datele cu caracter personal pe baza executării contractului de transport (Art. 6 alin. 1 lit. b din GDPR) și a obligațiilor legale de conformitate vamală și fiscală. Identificarea părților în operațiunile de import/export este o cerință obligatorie a autorităților statale.',
          },
          {
            t: 'Transfer Internațional de Date',
            d: 'Datorită naturii globale a logisticii, datele dumneavoastră pot fi transferate către entități din afara Spațiului Economic European (ASEAN, China, SUA), incluzând agenți portuari, linii maritime și autorități vamale străine. Aceste transferuri sunt protejate prin clauze contractuale standard și protocoale securizate de transfer EDI.',
          },
          {
            t: 'Securitate și Integritate Digitală',
            d: 'Implementăm măsuri tehnice avansate: criptare end-to-end pentru documentele stochate, autentificare multi-factor (MFA) pentru portalul clientului și audituri de securitate bi-anuale ale bazelor de date. Toate datele financiare sunt procesate prin gateway-uri certificate PCI-DSS.',
          },
          {
            t: 'Perioada de Retenție a Datelor',
            d: 'În conformitate cu legislația fiscală și vamală, Promo-Efect păstrează documentele aferente tranzacțiilor logistice (facturi, declarații vamale, CMR) pentru o perioadă de minimum 5 ani, după care acestea sunt arhivate securizat sau anonimizate, cu excepția cazurilor în care există litigii în curs.',
          },
          {
            t: 'Drepturile și Accesul Utilizatorului',
            d: 'Aveți dreptul de a solicita accesul la datele dumneavoastră, rectificarea acestora, portabilitatea sau restricționarea prelucrării. Orice solicitare poate fi transmisă către Ofițerul nostru pentru Protecția Datelor (DPO) prin secțiunea de contact a portalului.',
          },
        ].map((sec, i) => (
          <section key={i} className="space-y-6">
            <h2 className="text-white font-black uppercase italic tracking-widest text-lg">
              {sec.t}
            </h2>
            <p className="border-l border-white/5 pl-8 leading-relaxed">{sec.d}</p>
          </section>
        ))}
      </div>
    </div>
  </PublicLayout>
);

export default Politica;
