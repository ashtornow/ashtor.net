import { motion } from 'framer-motion';
import { LogoBox } from '@/components/Logo';
import { useLanguage } from '@/i18n';

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer className="relative border-t border-white/[0.07] bg-[#0B0E14] overflow-hidden" data-testid="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4 group w-fit">
              <LogoBox />
              <span className="font-display font-extrabold tracking-tight text-lg">
                ashtor<span className="text-emerald-400">.net</span>
              </span>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-1.5"
              data-testid="footer-status-badge"
            >
              <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono-tech text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
                {f.status}
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {f.links.map((link) => (
              <a
                key={link}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-slate-500 hover:text-emerald-300 transition-colors duration-300"
                data-testid={`footer-link-${link.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-14 pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-600">{f.rights}</p>
          <p className="font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-600">{f.note}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        aria-hidden
        className="pointer-events-none select-none text-center font-display font-black leading-none text-outline text-[18vw] -mb-[6vw]"
      >
        ASHTOR.NET
      </motion.div>
    </footer>
  );
}
