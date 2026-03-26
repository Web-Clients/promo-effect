import React from 'react';
import { motion } from 'framer-motion';
import { PublicHeader } from '../../PublicHeader';
import { PublicFooter } from '../../PublicFooter';

export const PublicLayout = ({
  children,
  onLoginRedirect,
}: {
  children: React.ReactNode;
  onLoginRedirect: () => void;
}) => (
  <div className="bg-[#050608] min-h-screen selection:bg-primary-500/30 font-sans antialiased text-neutral-300">
    <PublicHeader onLoginRedirect={onLoginRedirect} />
    <main className="pt-20">{children}</main>
    <PublicFooter />
  </div>
);

export const PageHero = ({ subtitle, title, description, image }: any) => (
  <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/80 via-[#050608]/40 to-[#050608] z-10" />
      <img
        src={image}
        className="w-full h-full object-cover grayscale opacity-40"
        alt={title}
        loading="lazy"
      />
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

export const SolidCard = ({ children, className = '' }: any) => (
  <div
    className={`bg-[#0A0C10] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);
