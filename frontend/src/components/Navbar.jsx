import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n';
import { LogoBox } from '@/components/Logo';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();

  const links = [
    { label: t.nav.manifesto, id: 'manifesto' },
    { label: t.nav.talent, id: 'specializations' },
    { label: t.nav.companies, id: 'pathways' },
    { label: t.nav.contact, id: 'contact' },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#07090E]/80 border-b border-white/10"
      data-testid="main-navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 group"
          data-testid="nav-logo"
        >
          <LogoBox />
          <span className="font-display font-extrabold tracking-tight text-lg">
            ashtor<span className="text-emerald-400">.net</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-1.5 font-mono-tech text-[10px] tracking-[0.2em] text-emerald-400">
          <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
          24MS {t.nav.live}
        </div>

        <nav className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="text-sm text-slate-400 hover:text-slate-100 transition-colors duration-300"
              data-testid={`nav-link-${l.id}`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 relative">
            {['es', 'en'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                data-testid={`language-toggle-${l}`}
                className={`relative z-10 px-3 py-1 text-xs font-mono-tech uppercase tracking-widest transition-colors duration-300 ${
                  lang === l ? 'text-[#07090E]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l}
                {lang === l && (
                  <motion.span
                    layoutId="lang-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-emerald-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollTo('contact')}
            data-testid="nav-cta-button"
            className="hidden sm:block px-4 py-2 rounded-full text-xs font-semibold bg-emerald-500 text-[#07090E] hover:shadow-[0_0_22px_rgba(16,185,129,0.45)] hover:bg-emerald-400 transition-all duration-300"
          >
            {t.nav.cta}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
