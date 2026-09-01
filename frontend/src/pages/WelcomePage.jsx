import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, ArrowRight, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { usePageMeta } from '@/lib/seo';
import { LogoBox } from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WelcomePage() {
  const { token } = useParams();
  const { t, setLang } = useLanguage();
  const w = t.welcome;
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState('loading');
  usePageMeta('welcome');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/welcome/${token}`);
        if (!res.ok) {
          setState('invalid');
          return;
        }
        const data = await res.json();
        setInfo(data);
        if (data.language) setLang(data.language);
        setState('ok');
      } catch (err) {
        console.error('Welcome: access check failed', err);
        setState('invalid');
      }
    })();
  }, [token, setLang]);

  const goMatch = () => {
    navigate('/');
    setTimeout(() => document.getElementById('ai-match')?.scrollIntoView({ behavior: 'smooth' }), 450);
  };

  return (
    <div className="min-h-screen bg-grid relative flex items-center justify-center px-4 py-16" data-testid="welcome-page">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_55%)] pointer-events-none" />

      {state === 'loading' && <Loader2 size={26} className="animate-spin text-emerald-400" />}

      {state === 'invalid' && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111620]/90 backdrop-blur-xl p-9 text-center"
          data-testid="welcome-invalid"
        >
          <span className="mx-auto w-14 h-14 rounded-full bg-red-400/10 border border-red-400/40 flex items-center justify-center mb-5">
            <ShieldAlert size={24} className="text-red-300" />
          </span>
          <h1 className="font-display text-xl font-bold tracking-tight mb-2">{w.invalidTitle}</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{w.invalidSub}</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-all duration-300" data-testid="welcome-home-link">
            ashtor.net <ArrowRight size={13} />
          </Link>
        </motion.div>
      )}

      {state === 'ok' && info && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-2xl border border-emerald-500/25 bg-[#111620]/90 backdrop-blur-xl p-8 sm:p-10 shadow-[0_0_60px_rgba(16,185,129,0.1)]"
          data-testid="welcome-card"
        >
          <div className="flex items-center gap-2.5 mb-8">
            <LogoBox />
            <span className="font-display font-extrabold tracking-tight text-lg">
              ashtor<span className="text-emerald-400">.net</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 mb-6" data-testid="welcome-approved-badge">
            <BadgeCheck size={14} className="text-emerald-400" />
            <span className="font-mono-tech text-[10px] tracking-[0.3em] uppercase text-emerald-300">{w.badge}</span>
          </span>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            {w.title} <span className="text-emerald-400">{info.full_name}</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">{w.sub}</p>

          <p className="font-mono-tech text-[10px] tracking-[0.3em] uppercase text-slate-500 mb-4">{w.stepsTitle}</p>
          <ol className="space-y-4 mb-9">
            {w.steps.map((step, i) => (
              <motion.li
                key={step.t}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                className="flex gap-4"
                data-testid={`welcome-step-${i}`}
              >
                <span className="shrink-0 w-7 h-7 rounded-full border border-emerald-500/40 bg-emerald-500/[0.07] flex items-center justify-center font-mono-tech text-[11px] text-emerald-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{step.t}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{step.d}</p>
                </div>
              </motion.li>
            ))}
          </ol>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={goMatch}
              data-testid="welcome-cta-match"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#07090E] hover:bg-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-300"
            >
              <Sparkles size={15} />
              {w.ctaMatch}
            </button>
            <Link
              to="/"
              data-testid="welcome-cta-home"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-all duration-300"
            >
              {w.ctaHome}
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
