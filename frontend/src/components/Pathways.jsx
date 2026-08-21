import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRound, Building2 } from 'lucide-react';
import { useLanguage } from '@/i18n';

const SIDE_IMG = 'https://images.pexels.com/photos/5483071/pexels-photo-5483071.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';

export default function Pathways() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('talent');
  const p = t.pathways;
  const active = p[tab];

  return (
    <section id="pathways" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8" data-testid="pathways-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-12"
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-emerald-400 mb-4">
            {'// '}{p.eyebrow}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{p.title}</h2>
        </motion.div>

        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 mb-12 relative">
          {[
            { key: 'talent', label: p.tabs.talent, Icon: UserRound },
            { key: 'company', label: p.tabs.company, Icon: Building2 },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              data-testid={`workflow-tab-${key}`}
              className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                tab === key ? 'text-[#07090E]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              {label}
              {tab === key && (
                <motion.span
                  layoutId="pathway-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-emerald-400"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight mb-8">{active.title}</h3>
                <div className="space-y-0">
                  {active.steps.map((s, i) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.12 }}
                      className="relative flex gap-6 pb-10 last:pb-0"
                      data-testid={`pathway-step-${tab}-${s.step}`}
                    >
                      {i < active.steps.length - 1 && (
                        <span className="absolute left-[21px] top-12 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 to-white/5" />
                      )}
                      <span className="shrink-0 w-11 h-11 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.07] flex items-center justify-center font-mono-tech text-sm text-emerald-400">
                        {s.step}
                      </span>
                      <div className="pt-1">
                        <h4 className="font-display text-lg font-medium tracking-tight mb-1.5">{s.title}</h4>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-lg">{s.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/[0.07] min-h-[320px] group"
          >
            <img
              src={SIDE_IMG}
              alt="Remote engineer at work"
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-[1200ms]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
              <span className="font-mono-tech text-[10px] tracking-[0.25em] uppercase text-emerald-400">
                NODE_STATUS: ONLINE
              </span>
              <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
