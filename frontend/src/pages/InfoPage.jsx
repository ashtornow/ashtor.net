import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { usePageMeta } from '@/lib/seo';
import { LogoBox } from '@/components/Logo';
import { pagesContent } from '@/pages/content';

export default function InfoPage({ slug }) {
  const { lang, setLang } = useLanguage();
  const c = pagesContent[lang][slug];
  const navigate = useNavigate();
  usePageMeta(slug);

  const goContact = () => {
    navigate('/');
    setTimeout(() => {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    }, 450);
  };

  return (
    <div className="min-h-screen bg-grid relative" data-testid={`page-${slug}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090E]/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="page-logo-link">
            <LogoBox />
            <span className="font-display font-extrabold tracking-tight text-lg">
              ashtor<span className="text-emerald-400">.net</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {['es', 'en'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  data-testid={`page-language-toggle-${l}`}
                  className={`px-3 py-1 rounded-full text-xs font-mono-tech uppercase tracking-widest transition-colors duration-300 ${
                    lang === l ? 'bg-emerald-400 text-[#07090E]' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <Link
              to="/"
              data-testid="page-back-link"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300 transition-colors"
            >
              <ArrowLeft size={13} />
              Home
            </Link>
          </div>
        </div>
      </header>

      <article className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-emerald-400 mb-4">
            {'// '}{c.eyebrow}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mb-6">
            {c.title}
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">{c.intro}</p>
        </motion.div>

        <div className="mt-14 space-y-5">
          {c.sections.map((s, i) => (
            <motion.section
              key={s.h}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.08 }}
              className="group rounded-2xl border border-white/[0.07] bg-[#111620]/60 backdrop-blur p-7 sm:p-8 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500"
              data-testid={`page-section-${i}`}
            >
              <div className="flex items-start gap-5">
                <span className="font-mono-tech text-sm text-emerald-400/70 mt-1 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight mb-2.5">{s.h}</h2>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{s.b}</p>
                </div>
              </div>
            </motion.section>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mt-14 flex flex-wrap items-center gap-4"
        >
          <button
            onClick={goContact}
            data-testid="page-cta-button"
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-[#07090E] hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] transition-all duration-300"
          >
            {c.cta}
            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <a
            href="mailto:info@ashtor.net"
            data-testid="page-contact-email"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-300"
          >
            <Mail size={14} />
            info@ashtor.net
          </a>
        </motion.div>

        <p className="mt-20 font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-600">
          © 2026 ashtor.net — Connect. Build. Remote.
        </p>
      </article>
    </div>
  );
}
