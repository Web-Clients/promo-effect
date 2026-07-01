import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { PublicLayout, SolidCard } from './_shared';

const inputClass =
  'w-full bg-white/5 border-b border-white/10 p-4 text-white font-bold placeholder:text-neutral-500 focus:border-primary-500 transition-colors uppercase italic text-xs outline-none';

const Contact = ({ onLoginRedirect }: { onLoginRedirect: () => void }) => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setStatus('error');
      setErrorMsg('Completează numele și emailul.');
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      // Public endpoint is CSRF-protected; fetch a token first.
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' });
      const { token } = await csrfRes.json();
      const res = await fetch('/api/v1/landing/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setStatus('ok');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
      setErrorMsg('Nu s-a putut trimite. Încearcă din nou sau scrie-ne direct pe email.');
    }
  };

  return (
    <PublicLayout onLoginRedirect={onLoginRedirect}>
      <div className="max-w-7xl mx-auto px-6 py-32 space-y-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="space-y-12">
            <div className="space-y-4">
              <span className="text-primary-500 font-bold text-[10px] uppercase tracking-widest italic">
                Contactează-ne
              </span>
              <h1 className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter">
                Contact
              </h1>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="text-primary-500 font-bold uppercase tracking-widest text-[10px]">
                  Sediu
                </div>
                <div className="text-white font-bold italic text-xl">
                  Chișinău, Republica Moldova
                </div>
                <p className="text-neutral-600 text-sm italic">Str. Mitropolit Varlam, Nr. 65</p>
              </div>
              <div className="space-y-2">
                <div className="text-primary-500 font-bold uppercase tracking-widest text-[10px]">
                  Contact direct
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
            {status === 'ok' ? (
              <div className="text-center py-10">
                <p className="text-2xl font-black text-primary-500 italic uppercase mb-2">
                  Mulțumim!
                </p>
                <p className="text-neutral-400 text-sm">
                  Mesajul a fost trimis. Te contactăm în cel mai scurt timp.
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={submit}>
                <div>
                  <label htmlFor="c-name" className="sr-only">
                    Nume complet
                  </label>
                  <input
                    id="c-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="NUME COMPLET"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="c-email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="EMAIL"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="c-message" className="sr-only">
                    Detalii
                  </label>
                  <textarea
                    id="c-message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="DETALII PROIECT"
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                {status === 'error' && (
                  <p className="text-red-400 text-xs font-bold italic">{errorMsg}</p>
                )}
                <Button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-primary-600 text-white font-black h-16 rounded-full uppercase tracking-widest italic text-xs disabled:opacity-60"
                >
                  {status === 'sending' ? 'Se trimite...' : 'Expediază'}
                </Button>
              </form>
            )}
          </SolidCard>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
