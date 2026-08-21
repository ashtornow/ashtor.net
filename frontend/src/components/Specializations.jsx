import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, Boxes, Compass } from 'lucide-react';
import { useLanguage } from '@/i18n';

const ACCENTS = {
  emerald: {
    badge: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/[0.07]',
    hover: 'hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.14)]',
    icon: 'text-emerald-400',
    testid: 'specialization-card-cyber',
  },
  cyan: {
    badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/[0.07]',
    hover: 'hover:border-cyan-500/50 hover:shadow-[0_0_35px_rgba(6,182,212,0.14)]',
    icon: 'text-cyan-400',
    testid: 'specialization-card-dev',
  },
  amber: {
    badge: 'border-amber-500/40 text-amber-400 bg-amber-500/[0.07]',
    hover: 'hover:border-amber-500/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.14)]',
    icon: 'text-amber-400',
    testid: 'specialization-card-leadership',
  },
};

const ICONS = [ShieldCheck, Boxes, Compass];
const CYBER_IMG =
  'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwxfHxjeWJlcnNlY3VyaXR5JTIwZGV2ZWxvcGVyJTIwcmVtb3RlJTIwdGVjaHxlbnwwfHx8fDE3ODczMzc3NDd8MA&ixlib=rb-4.1.0&q=85';

export default function Specializations() {
  const { t } = useLanguage();
  const s = t.specs;

  return (
    <section id="specializations" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#0B0E14]/60" data-testid="specializations-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-14 sm:mb-20 max-w-2xl"
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-emerald-400 mb-4">
            {'// '}{s.eyebrow}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{s.title}</h2>
          <p className="mt-4 text-base text-slate-400">{s.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {s.cards.map((card, i) => {
            const a = ACCENTS[card.accent];
            const Icon = ICONS[i];
            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.12 }}
                className={`group rounded-2xl border border-white/[0.07] bg-[#111620]/70 overflow-hidden transition-all duration-500 ${a.hover}`}
                data-testid={a.testid}
              >
                {i === 0 && (
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={CYBER_IMG}
                      alt={card.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111620] via-[#111620]/40 to-transparent" />
                  </div>
                )}
                <div className="p-7">
                  <div className="flex items-center justify-between mb-5">
                    <span className={`font-mono-tech text-[10px] tracking-[0.25em] uppercase border rounded-full px-3 py-1 ${a.badge}`}>
                      {card.badge}
                    </span>
                    <Icon size={20} className={a.icon} />
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight mb-5">{card.title}</h3>
                  <ul className="space-y-2.5">
                    {card.roles.map((role) => (
                      <li key={role} className="flex items-start gap-2 text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                        <ChevronRight size={14} className={`mt-0.5 shrink-0 ${a.icon}`} />
                        {role}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
