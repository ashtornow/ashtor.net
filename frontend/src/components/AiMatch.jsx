import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkles, Target, DollarSign, TrendingUp, ArrowRight, ScanSearch } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { streamPost } from '@/lib/sse';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AiMatch() {
  const { lang, t } = useLanguage();
  const a = t.ai;
  const [track, setTrack] = useState('talent');
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('idle');
  const [feed, setFeed] = useState('');
  const [result, setResult] = useState(null);
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  const analyze = async () => {
    if (!text.trim() || phase === 'running') return;
    setPhase('running');
    setFeed('');
    setResult(null);
    let finalResult = null;
    let failed = false;
    try {
      await streamPost(
        `${API}/ai-match/stream`,
        { profile_text: text, track, language: lang },
        (ev) => {
          if (ev.type === 'token') setFeed((f) => f + ev.content);
          else if (ev.type === 'done') finalResult = ev.result;
          else if (ev.type === 'error') failed = true;
        }
      );
    } catch {
      failed = true;
    }
    if (failed || !finalResult) {
      setPhase('error');
      toast.error(a.error);
    } else {
      setResult(finalResult);
      setPhase('done');
    }
  };

  const circ = 2 * Math.PI * 44;

  return (
    <section id="ai-match" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#0B0E14]/60" data-testid="ai-match-section">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.05),transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-12 max-w-2xl"
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-cyan-400 mb-4 flex items-center gap-2">
            <Sparkles size={13} />
            {'// '}{a.eyebrow}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{a.title}</h2>
          <p className="mt-4 text-base text-slate-400">{a.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="rounded-2xl border border-white/[0.08] bg-[#111620]/80 backdrop-blur overflow-hidden flex flex-col"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3.5 bg-[#0B0E14]/80">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 font-mono-tech text-[10px] tracking-[0.2em] text-slate-500">ashtor_ai_match — gpt-5.4</span>
            </div>

            <div className="p-6 sm:p-8 flex flex-col gap-6 flex-1">
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 self-start relative">
                {[
                  { key: 'talent', label: a.trackTalent },
                  { key: 'company', label: a.trackCompany },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTrack(key)}
                    data-testid={`ai-track-${key}`}
                    className={`relative z-10 rounded-full px-5 py-2 text-xs font-semibold transition-colors duration-300 ${
                      track === key ? 'text-[#07090E]' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                    {track === key && (
                      <motion.span
                        layoutId="ai-track-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-cyan-400"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                  {a.inputLabel}
                </label>
                <textarea
                  rows={5}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={track === 'talent' ? a.inputPhTalent : a.inputPhCompany}
                  className="w-full flex-1 rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/60 focus:shadow-[0_0_18px_rgba(6,182,212,0.12)] transition-all duration-300 resize-none"
                  data-testid="ai-profile-input"
                />
              </div>

              <button
                onClick={analyze}
                disabled={phase === 'running' || !text.trim()}
                data-testid="ai-analyze-button"
                className="group w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-cyan-500 px-6 py-4 text-sm font-semibold text-[#07090E] hover:bg-cyan-400 hover:shadow-[0_0_35px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all duration-300"
              >
                <ScanSearch size={16} />
                {phase === 'running' ? a.analyzing : a.analyze}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111620]/60 backdrop-blur min-h-[420px] flex flex-col overflow-hidden"
            data-testid="ai-results"
          >
            <AnimatePresence mode="wait">
              {phase === 'idle' || phase === 'error' ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8"
                >
                  <span className="w-14 h-14 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.06] flex items-center justify-center">
                    <Sparkles size={22} className="text-cyan-400" />
                  </span>
                  <p className="font-mono-tech text-xs tracking-[0.2em] uppercase text-slate-500 max-w-xs leading-relaxed">
                    {a.idle}
                  </p>
                </motion.div>
              ) : phase === 'running' ? (
                <motion.div
                  key="running"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                  data-testid="ai-live-feed"
                >
                  <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3 bg-[#0B0E14]/80">
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="font-mono-tech text-[10px] tracking-[0.25em] uppercase text-cyan-400">
                      {a.liveFeed}
                    </span>
                  </div>
                  <div ref={feedRef} className="flex-1 overflow-y-auto p-5 max-h-[420px]">
                    <pre className="font-mono-tech text-xs leading-relaxed text-emerald-300/90 whitespace-pre-wrap break-words">
                      {feed}
                      <span className="inline-block w-2 h-3.5 ml-0.5 bg-cyan-400 animate-pulse align-middle" />
                    </pre>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1 flex flex-col gap-6 p-6 sm:p-8"
                >
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="#06B6D4"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={circ}
                          initial={{ strokeDashoffset: circ }}
                          animate={{ strokeDashoffset: circ * (1 - result.fit_score / 100) }}
                          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-3xl font-extrabold" data-testid="ai-fit-score">
                          {result.fit_score}
                        </span>
                        <span className="font-mono-tech text-[8px] tracking-[0.2em] uppercase text-slate-500">{a.fitScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-mono-tech text-[10px] tracking-[0.25em] uppercase text-cyan-400 mb-1.5">{a.resultsTitle}</p>
                      <h3 className="font-display text-xl font-semibold tracking-tight">{result.headline}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed">{result.summary}</p>

                  <div>
                    <p className="font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2.5 flex items-center gap-1.5">
                      <Target size={12} className="text-emerald-400" /> {a.roles}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.suggested_roles.map((r, i) => (
                        <motion.span
                          key={r}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] px-3.5 py-1.5 text-xs text-emerald-300"
                        >
                          {r}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.07] bg-[#0B0E14] p-4">
                      <p className="font-mono-tech text-[9px] tracking-[0.25em] uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <DollarSign size={11} className="text-amber-400" /> {a.salary}
                      </p>
                      <p className="font-display text-lg font-bold text-amber-300" data-testid="ai-salary-range">
                        {result.salary_range_usd}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-[#0B0E14] p-4">
                      <p className="font-mono-tech text-[9px] tracking-[0.25em] uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <TrendingUp size={11} className="text-cyan-400" /> {a.gaps}
                      </p>
                      <ul className="space-y-1">
                        {result.skills_gap.map((g) => (
                          <li key={g} className="text-xs text-slate-400 flex items-start gap-1.5">
                            <span className="text-cyan-400 mt-0.5">▸</span> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 flex items-start gap-3">
                    <ArrowRight size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-mono-tech text-[9px] tracking-[0.25em] uppercase text-emerald-400 mb-1">{a.nextStep}</p>
                      <p className="text-sm text-slate-300">{result.next_step}</p>
                    </div>
                  </div>

                  <p className="font-mono-tech text-[9px] tracking-[0.15em] uppercase text-slate-600 text-center">{a.disclaimer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
