import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/i18n';

const PICKS = [
  [0, 0], [1, 0], [2, 0], [0, 4], [1, 1], [2, 2], [0, 3], [1, 2],
];

const ACCENT = {
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500/25', tag: 'border-emerald-500/25 text-emerald-300/90 bg-emerald-500/[0.08]' },
  cyan: { text: 'text-cyan-400', border: 'border-cyan-500/25', tag: 'border-cyan-500/25 text-cyan-300/90 bg-cyan-500/[0.08]' },
  amber: { text: 'text-amber-400', border: 'border-amber-500/25', tag: 'border-amber-500/25 text-amber-300/90 bg-amber-500/[0.08]' },
};

export default function SuccessStories() {
  const { t } = useLanguage();
  const s = t.stories;
  const cards = t.specs.cards;
  const stories = PICKS.map(([ci, ri]) => ({ ...cards[ci].roles[ri], accent: cards[ci].accent }));
  const loop = [...stories, ...stories];

  return (
    <section id="stories" className="relative py-20 sm:py-24 overflow-hidden" data-testid="success-stories-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-emerald-400 mb-4">
            {'// '}{s.eyebrow}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{s.title}</h2>
          <p className="mt-4 text-base text-slate-400">{s.sub}</p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[#07090E] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[#07090E] to-transparent" />
        <div className="animate-marquee flex w-max items-stretch gap-5" data-testid="stories-marquee">
          {loop.map((story, i) => {
            const a = ACCENT[story.accent];
            return (
              <article
                key={`${story.project}-${i}`}
                className={`w-[300px] sm:w-[330px] shrink-0 rounded-xl border ${a.border} bg-[#111620]/80 backdrop-blur p-5 flex flex-col`}
                data-testid={i < stories.length ? `story-card-${i}` : undefined}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight size={12} className={a.text} />
                  <span className={`font-mono-tech text-[9px] tracking-[0.3em] uppercase ${a.text}`}>{t.specs.caseLabel}</span>
                </div>
                <h3 className="font-display text-sm font-semibold tracking-tight text-slate-100 mb-1.5">{story.project}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">{story.desc}</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className={`font-display text-2xl font-extrabold tracking-tight leading-none ${a.text}`}>{story.metric}</span>
                  <span className="text-[10px] text-slate-500 leading-tight pb-0.5">{story.metricLabel}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {story.stack.map((tech) => (
                    <span key={tech} className={`font-mono-tech text-[9px] tracking-wider uppercase border rounded-full px-2 py-0.5 ${a.tag}`}>
                      {tech}
                    </span>
                  ))}
                </div>
                <p className="mt-3 pt-3 border-t border-white/[0.06] font-mono-tech text-[9px] tracking-[0.15em] uppercase text-slate-500">
                  {story.name}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
