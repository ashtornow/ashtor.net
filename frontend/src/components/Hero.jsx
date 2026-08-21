import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/i18n';
import GlobeCanvas from '@/components/GlobeCanvas';

const EASE = [0.16, 1, 0.3, 1];

const MaskedLine = ({ children, delay }) => (
  <span className="block overflow-hidden pb-1">
    <motion.span
      className="block"
      initial={{ y: '115%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.85, ease: EASE, delay }}
    >
      {children}
    </motion.span>
  </span>
);

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export default function Hero() {
  const { lang, t } = useLanguage();
  const h = t.hero;

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-grid" data-testid="hero-section">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.06),transparent_50%)]" />
      <div className="absolute inset-y-0 right-0 w-full lg:w-[58%] opacity-90">
        <GlobeCanvas />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/75 to-transparent lg:via-[#07090E]/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-28 pb-16" key={lang}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-1.5 mb-8"
          data-testid="hero-badge"
        >
          <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono-tech text-[10px] sm:text-xs tracking-[0.25em] text-emerald-400 uppercase">
            {h.badge}
          </span>
        </motion.div>

        <h1
          className="font-display font-extrabold tracking-tight leading-[1.02] text-4xl sm:text-5xl lg:text-6xl max-w-3xl"
          data-testid="hero-headline"
        >
          <MaskedLine delay={0.3}>{h.lines[0]}</MaskedLine>
          <MaskedLine delay={0.45}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {h.lines[1]}
            </span>
          </MaskedLine>
          <MaskedLine delay={0.6}>{h.lines[2]}</MaskedLine>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.85 }}
          className="mt-7 max-w-xl text-base sm:text-lg text-slate-400 leading-relaxed"
          data-testid="hero-subheadline"
        >
          {h.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 1 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <button
            onClick={() => scrollTo('contact')}
            data-testid="hero-find-job-cta"
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-[#07090E] hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] transition-all duration-300"
          >
            {h.ctaPrimary}
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => scrollTo('contact')}
            data-testid="hero-hire-talent-cta"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] transition-all duration-300"
          >
            {h.ctaSecondary}
            <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden max-w-3xl"
          data-testid="hero-metrics"
        >
          {h.metrics.map((m) => (
            <div key={m.label} className="bg-[#0B0E14]/90 backdrop-blur px-4 py-4">
              <div className="font-display text-xl sm:text-2xl font-bold text-slate-100">{m.value}</div>
              <div className="mt-1 text-[11px] text-slate-500 leading-tight">{m.label}</div>
              <div className="mt-1.5 font-mono-tech text-[9px] tracking-[0.15em] text-emerald-400/80 uppercase">{m.note}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
