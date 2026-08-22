import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ShieldCheck, Boxes, Compass, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/i18n';

const ACCENTS = {
  emerald: {
    badge: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/[0.07]',
    hover: 'hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.14)]',
    icon: 'text-emerald-400',
    metric: 'text-emerald-400',
    tag: 'border-emerald-500/25 text-emerald-300/90 bg-emerald-500/[0.08]',
    popupBorder: 'border-emerald-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(16,185,129,0.12)]',
    itemHover: 'hover:bg-emerald-500/[0.06] hover:text-emerald-200',
    testid: 'specialization-card-cyber',
  },
  cyan: {
    badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/[0.07]',
    hover: 'hover:border-cyan-500/50 hover:shadow-[0_0_35px_rgba(6,182,212,0.14)]',
    icon: 'text-cyan-400',
    metric: 'text-cyan-400',
    tag: 'border-cyan-500/25 text-cyan-300/90 bg-cyan-500/[0.08]',
    popupBorder: 'border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(6,182,212,0.12)]',
    itemHover: 'hover:bg-cyan-500/[0.06] hover:text-cyan-200',
    testid: 'specialization-card-dev',
  },
  amber: {
    badge: 'border-amber-500/40 text-amber-400 bg-amber-500/[0.07]',
    hover: 'hover:border-amber-500/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.14)]',
    icon: 'text-amber-400',
    metric: 'text-amber-400',
    tag: 'border-amber-500/25 text-amber-300/90 bg-amber-500/[0.08]',
    popupBorder: 'border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(245,158,11,0.12)]',
    itemHover: 'hover:bg-amber-500/[0.06] hover:text-amber-200',
    testid: 'specialization-card-leadership',
  },
};

const ICONS = [ShieldCheck, Boxes, Compass];
const CYBER_IMG =
  'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwxfHxjeWJlcnNlY3VyaXR5JTIwZGV2ZWxvcGVyJTIwcmVtb3RlJTIwdGVjaHxlbnwwfHx8fDE3ODczMzc3NDd8MA&ixlib=rb-4.1.0&q=85';

function SkillCasePopup({ role, accent, caseLabel, caseCta }) {
  const requestProfile = () => {
    window.dispatchEvent(new CustomEvent('ashtor:prefill', { detail: { skills: `${role.name} — ${role.project}` } }));
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{ x: '-50%' }}
      className={`absolute bottom-full left-1/2 mb-3 w-[290px] sm:w-[320px] z-50 rounded-xl border ${accent.popupBorder} bg-[#0B0E14]/95 backdrop-blur-xl p-5`}
      data-testid={`skill-case-popup-${role.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <ArrowUpRight size={12} className={accent.icon} />
        <span className={`font-mono-tech text-[9px] tracking-[0.3em] uppercase ${accent.icon}`}>{caseLabel}</span>
      </div>
      <h4 className="font-display text-sm font-semibold tracking-tight text-slate-100 mb-2">{role.project}</h4>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">{role.desc}</p>
      <div className="flex items-end gap-2 mb-4">
        <span className={`font-display text-3xl font-extrabold tracking-tight leading-none ${accent.metric}`}>{role.metric}</span>
        <span className="text-[11px] text-slate-500 leading-tight pb-0.5">{role.metricLabel}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {role.stack.map((tech) => (
          <span key={tech} className={`font-mono-tech text-[9px] tracking-wider uppercase border rounded-full px-2 py-0.5 ${accent.tag}`}>
            {tech}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={requestProfile}
        data-testid={`skill-case-cta-${role.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg border ${accent.popupBorder.split(' ')[0]} bg-white/[0.03] px-3 py-2 font-mono-tech text-[10px] tracking-[0.15em] uppercase ${accent.icon} hover:bg-white/[0.08] transition-colors duration-200`}
      >
        {caseCta}
        <ArrowUpRight size={11} />
      </button>
      <div className={`absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#0B0E14] border-b border-r ${accent.popupBorder.split(' ')[0]}`} />
    </motion.div>
  );
}

function SkillItem({ role, accent, caseLabel, caseCta }) {
  const [open, setOpen] = useState(false);
  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-start gap-2 text-left text-sm text-slate-400 rounded-lg px-2 py-1.5 -mx-2 cursor-pointer transition-colors duration-300 ${accent.itemHover}`}
        data-testid={`skill-item-${role.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
      >
        <ChevronRight size={14} className={`mt-0.5 shrink-0 ${accent.icon}`} />
        <span className="border-b border-dashed border-white/15">{role.name}</span>
      </button>
      <AnimatePresence>
        {open && <SkillCasePopup role={role} accent={accent} caseLabel={caseLabel} caseCta={caseCta} />}
      </AnimatePresence>
    </li>
  );
}

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
                className={`group rounded-2xl border border-white/[0.07] bg-[#111620]/70 transition-all duration-500 ${a.hover}`}
                data-testid={a.testid}
              >
                {i === 0 && (
                  <div className="relative h-40 overflow-hidden rounded-t-2xl">
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
                  <ul className="space-y-1.5">
                    {card.roles.map((role) => (
                      <SkillItem key={role.name} role={role} accent={a} caseLabel={s.caseLabel} caseCta={s.caseCta} />
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
