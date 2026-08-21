import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Linkedin, BadgeCheck, X, Loader2, Check, ShieldCheck, LogOut } from 'lucide-react';
import { useLanguage } from '@/i18n';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LS_KEY = 'ashtor_linkedin_profile';

export default function ConnectSocial() {
  const { t } = useLanguage();
  const c = t.connect;
  const [open, setOpen] = useState(false);
  const [oauthOn, setOauthOn] = useState(false);
  const [realProfile, setRealProfile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('form');
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    axios.get(`${API}/auth/linkedin/status`).then((r) => setOauthOn(r.data.configured)).catch(() => {});
    fetch(`${API}/auth/linkedin/me`, { credentials: 'include' })
      .then(async (r) => {
        if (r.ok) setRealProfile(await r.json());
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'connected') {
      toast.success(c.success);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {}
    }
  }, [c.success]);

  const startVerify = (e) => {
    e.preventDefault();
    if (!url.includes('linkedin.com')) {
      toast.error(c.error);
      return;
    }
    setPhase('verifying');
    setStepIdx(0);
  };

  useEffect(() => {
    if (phase !== 'verifying') return;
    if (stepIdx >= c.steps.length) {
      const finish = async () => {
        const data = { url, name };
        try {
          await axios.post(`${API}/social-connect`, {
            provider: 'linkedin',
            profile_url: url,
            full_name: name,
          });
        } catch {}
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        setProfile(data);
        setPhase('done');
      };
      finish();
      return;
    }
    const tmr = setTimeout(() => setStepIdx((s) => s + 1), 750);
    return () => clearTimeout(tmr);
  }, [phase, stepIdx, c.steps.length, url, name]);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setPhase('form');
      setStepIdx(0);
    }, 300);
  };

  const connect = () => {
    if (oauthOn) {
      window.location.assign(`${API}/auth/linkedin/start`);
    } else {
      setOpen(true);
    }
  };

  const disconnectReal = async () => {
    try {
      await fetch(`${API}/auth/linkedin/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    setRealProfile(null);
  };

  const connected = realProfile || profile;

  return (
    <>
      <div
        className="rounded-xl border border-white/[0.08] bg-[#111620]/70 backdrop-blur px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 max-w-xl"
        data-testid="connect-social-card"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {realProfile?.picture ? (
            <img src={realProfile.picture} alt="" className="shrink-0 w-10 h-10 rounded-lg border border-emerald-500/40 object-cover" />
          ) : (
            <span className="shrink-0 w-10 h-10 rounded-lg bg-[#0A66C2]/15 border border-[#0A66C2]/40 flex items-center justify-center">
              <Linkedin size={17} className="text-[#4ea3f1]" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-mono-tech text-[9px] tracking-[0.25em] uppercase text-cyan-400/80 mb-0.5">
              {c.kicker}
            </p>
            <p className="text-sm font-semibold text-slate-100 truncate">
              {realProfile ? realProfile.name || c.title : c.title}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-0.5">
              {realProfile ? realProfile.email || c.connectedAs : c.sub}
            </p>
          </div>
        </div>
        {connected ? (
          <span className="shrink-0 inline-flex items-center gap-2" data-testid="connect-verified-badge">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
              <BadgeCheck size={14} />
              {c.connected}
            </span>
            {realProfile && (
              <button
                onClick={disconnectReal}
                data-testid="connect-disconnect-button"
                className="text-slate-500 hover:text-red-300 transition-colors"
                title={c.disconnect}
              >
                <LogOut size={15} />
              </button>
            )}
          </span>
        ) : (
          <button
            onClick={connect}
            data-testid="connect-linkedin-button"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0d76dd] hover:shadow-[0_0_22px_rgba(10,102,194,0.45)] transition-all duration-300"
          >
            <Linkedin size={14} />
            {c.linkedin}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={close}
            data-testid="connect-modal"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111620] shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <Linkedin size={16} className="text-[#4ea3f1]" />
                  <span className="font-display font-semibold text-sm">{c.modalTitle}</span>
                </div>
                <button
                  onClick={close}
                  className="text-slate-500 hover:text-slate-200 transition-colors"
                  data-testid="connect-modal-close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {phase === 'form' && (
                  <form onSubmit={startVerify} className="space-y-5">
                    <p className="text-xs text-slate-400 leading-relaxed">{c.modalSub}</p>
                    <div>
                      <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                        {c.nameLabel}
                      </label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={c.namePh}
                        className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#0A66C2]/70 transition-colors"
                        data-testid="connect-name-input"
                      />
                    </div>
                    <div>
                      <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                        {c.urlLabel}
                      </label>
                      <input
                        required
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={c.urlPh}
                        className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#0A66C2]/70 transition-colors"
                        data-testid="connect-url-input"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="connect-verify-button"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#0d76dd] hover:shadow-[0_0_25px_rgba(10,102,194,0.4)] transition-all duration-300"
                    >
                      <ShieldCheck size={15} />
                      {c.verify}
                    </button>
                  </form>
                )}

                {phase === 'verifying' && (
                  <div className="py-4 space-y-4" data-testid="connect-verification-steps">
                    {c.steps.map((s, i) => (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: i <= stepIdx ? 1 : 0.3, x: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        className="flex items-center gap-3 font-mono-tech text-xs"
                      >
                        {i < stepIdx ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center">
                            <Check size={11} className="text-emerald-400" />
                          </span>
                        ) : i === stepIdx ? (
                          <Loader2 size={16} className="animate-spin text-cyan-400" />
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-white/10" />
                        )}
                        <span className={i < stepIdx ? 'text-emerald-300' : i === stepIdx ? 'text-slate-200' : 'text-slate-600'}>
                          {s}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {phase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="py-6 text-center"
                    data-testid="connect-success"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                      className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/50 flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(16,185,129,0.3)]"
                    >
                      <BadgeCheck size={30} className="text-emerald-400" />
                    </motion.div>
                    <p className="font-display font-semibold text-lg mb-2">{c.connected}</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">{c.success}</p>
                    <button
                      onClick={close}
                      data-testid="connect-done-button"
                      className="rounded-full bg-emerald-500 px-8 py-2.5 text-xs font-semibold text-[#07090E] hover:bg-emerald-400 transition-colors duration-300"
                    >
                      OK
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
