import React from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, SolidCard } from './_shared';

const Contact = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => (
  <PublicLayout onLoginRedirect={onLoginRedirect}>
    <div className="max-w-7xl mx-auto px-6 py-32 space-y-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <span className="text-primary-500 font-bold text-[10px] uppercase tracking-widest italic">
              Global Operations Hub
            </span>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter">
              Contact
            </h1>
          </div>
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="text-primary-500 font-bold uppercase tracking-widest text-[10px]">
                Headquarters
              </div>
              <div className="text-white font-bold italic text-xl">Chișinău, Republica Moldova</div>
              <p className="text-neutral-600 text-sm italic">Str. Mitropolit Varlam, Nr. 65</p>
            </div>
            <div className="space-y-2">
              <div className="text-primary-500 font-bold uppercase tracking-widest text-[10px]">
                Digital Reach
              </div>
              <div className="text-white font-bold italic text-xl">contact@promo-effect.com</div>
              <div className="text-white font-bold italic text-xl">+373 (60) 123 456</div>
            </div>
          </div>
        </div>
        <SolidCard className="bg-[#0A0C10] border-white/5 p-12">
          <h3 className="text-2xl font-black text-white italic uppercase mb-10 tracking-widest">
            Trimite un Mesaj Rapid
          </h3>
          <form className="space-y-6">
            <input
              type="text"
              placeholder="NUME COMPLET"
              className="w-full bg-white/2 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-800 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none"
            />
            <input
              type="email"
              placeholder="EMAIL CORPORATE"
              className="w-full bg-white/2 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-800 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none"
            />
            <textarea
              placeholder="DETALII PROIECT"
              rows={4}
              className="w-full bg-white/2 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-800 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none resize-none"
            />
            <Button className="w-full bg-primary-600 text-white font-black h-16 rounded-full uppercase tracking-widest italic text-xs shadow-[0_10px_40px_rgba(249,115,22,0.2)]">
              Expediază
            </Button>
          </form>
        </SolidCard>
      </div>
    </div>
  </PublicLayout>
);

export default Contact;
