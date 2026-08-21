import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n';

const layouts = ['md:col-span-7', 'md:col-span-5 md:mt-20', 'md:col-span-6 md:col-start-4'];

export default function Manifesto() {
  const { t } = useLanguage();
  const m = t.manifesto;

  return (
    <section id="manifesto" className="relative py-24 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8" data-testid="manifesto-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-16 sm:mb-24"
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-emerald-400 mb-4">
            {'// '}{m.eyebrow}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-2xl">
            {m.title}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          {m.chapters.map((c, i) => (
            <motion.article
              key={c.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.12 }}
              className={`group relative rounded-2xl border border-white/[0.07] bg-[#111620]/60 p-8 sm:p-10 backdrop-blur hover:border-emerald-500/40 hover:shadow-[0_0_35px_rgba(16,185,129,0.12)] transition-all duration-500 ${layouts[i]}`}
              data-testid={`manifesto-chapter-${c.num}`}
            >
              <span className="font-display text-6xl sm:text-7xl font-black text-outline absolute -top-3 right-6 select-none group-hover:[-webkit-text-stroke:1px_rgba(16,185,129,0.45)] transition-all duration-500">
                {c.num}
              </span>
              <p className="font-mono-tech text-[10px] tracking-[0.3em] uppercase text-cyan-400/80 mb-5">
                {c.tag}
              </p>
              <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight mb-4 pr-16">
                {c.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{c.body}</p>
              <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
