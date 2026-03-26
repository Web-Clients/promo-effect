import React from 'react';
import { PublicLayout } from './_shared';

const Termeni = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-20">
      <div className="space-y-4">
        <div className="text-primary-500 font-bold text-[10px] uppercase tracking-[0.4em] italic underline underline-offset-8 decoration-primary-500/20">
          Legal Infrastructure
        </div>
        <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter">
          Termeni și Condiții
        </h1>
      </div>
      <div className="space-y-20 text-neutral-500 italic leading-relaxed text-sm">
        {[
          {
            t: '1. Natura Juridică și Cadrul de Operare',
            d: 'Promo-Efect Logistics Ltd acționează în calitate de casă de expediție și intermediar logistic. Toate serviciile sunt prestate în conformitate cu Condițiile Generale FIATA, Convenția CMR (pentru transport rutier) și Regulile de la Haga-Visby (pentru transport maritim). Prin plasarea unei comenzi, clientul acceptă aceste norme internaționale ca fiind de ordine publică în relația contractuală.',
          },
          {
            t: '2. Mandatul de Reprezentare Vamală',
            d: 'Pentru operațiunile de vămuire, clientul acordă Promo-Efect un mandat de reprezentare directă sau indirectă. Clientul rămâne singurul responsabil pentru acuratețea datelor furnizate în Factura Comercială și Packing List. Promo-Efect nu își asumă răspunderea pentru penalitățile rezultate din clasificarea tarifară (HS Code) eronată furnizată de către importator/exportator.',
          },
          {
            t: '3. Asigurări Cargo și Limitarea Răspunderii',
            d: "Răspunderea transportatorului este limitată prin convențiile internaționale (ex. 8.33 DST/kg conform CMR). Promo-Efect recomandă cu tărie încheierea unei asigurări suplimentare de tip 'All-Risk' (Cargo Insurance) care să acopere valoarea integrală a mărfii. În absența unei solicitări scrise de asigurare, Promo-Efect nu este responsabilă pentru pierderile care depășesc limitele statutare menționate.",
          },
          {
            t: '4. Forță Majoră și Evenimente Geopolitice',
            d: 'Promo-Efect este exonerată de orice răspundere în caz de forță majoră, incluzând, dar fără a se limita la: blocaje ale canalelor maritime (ex. Suez), conflicte armate, greve portuare, condiții meteorologice extreme sau decizii guvernamentale ce afectează rutele comerciale globale. Orice costuri adiționale (demurrage/detention) rezultate din astfel de evenimente sunt în sarcina exclusivă a clientului.',
          },
          {
            t: '5. Condiții de Plată și Dreptul de Gaj',
            d: 'Facturile sunt scadente conform termenilor agreați în contractul-cadru. În cazul neplății, Promo-Efect își rezervă dreptul de gaj asupra mărfurilor aflate în posesia sa sau a partenerilor săi logistici, până la stingerea completă a datoriilor acumulate, inclusiv a costurilor de depozitare forțată.',
          },
          {
            t: '6. Soluționarea Litigiilor și Arbitraj',
            d: 'Prezentul document este guvernat de legislația Republicii Moldova. Orice litigiu care nu poate fi soluționat pe cale amiabilă va fi trimis spre soluționare Curții de Arbitraj Comercial de pe lângă Camera de Comerț și Industrie a Republicii Moldova, decizia acesteia fiind finală și executorie.',
          },
        ].map((sec, i) => (
          <section key={i} className="space-y-6">
            <h2 className="text-white font-black uppercase italic tracking-widest text-lg">
              {sec.t}
            </h2>
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

export default Termeni;
