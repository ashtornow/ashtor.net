import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Linkedin, Github, BadgeCheck, X, Loader2, Check, ShieldCheck, LogOut } from 'lucide-react';
import { useLanguage } from '@/i18n';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LS_KEYS = { linkedin: 'ashtor_linkedin_profile', github: 'ashtor_github_profile' };

const PROVIDERS = {
  linkedin: {
    Icon: Linkedin,
    btnCls: 'bg-[#0A66C2] hover:bg-[#0d76dd] hover:shadow-[0_0_22px_rgba(10,102,194,0.45)]',
    iconBox: 'bg-[#0A66C2]/15 border-[#0A66C2]/40',
    iconCls: 'text-[#4ea3f1]',
    focus: 'focus:border-[#0A66C2]/70',
  },
  github: {
    Icon: Github,
    btnCls: 'bg-[#1f2937] border border-white/20 hover:bg-[#2b3a4e] hover:shadow-[0_0_22px_rgba(148,163,184,0.3)]',
    iconBox: 'bg-white/[0.06] border-white/25',
    iconCls: 'text-slate-200',
    focus: 'focus:border-slate-400/70',
  },
};

function texts(c, provider) {
  if (provider === 'github') {
    return {
      btn: c.github, connected: c.githubConnected, modalTitle: c.githubModalTitle,
      modalSub: c.githubModalSub, urlLabel: c.githubUrlLabel, urlPh: c.githubUrlPh,
      steps: c.githubSteps, success: c.githubSuccess, error: c.githubError,
      connectedAs: c.githubConnectedAs, domain: 'github.com',
    };
  }
  return {
    btn: c.linkedin, connected: c.connected, modalTitle: c.modalTitle,
    modalSub: c.modalSub, urlLabel: c.urlLabel, urlPh: c.urlPh,
    steps: c.steps, success: c.success, error: c.error,
    connectedAs: c.connectedAs, domain: 'linkedin.com',
  };
}

function ProviderRow({ provider, c, real, demo, onConnect, onDisconnect }) {
  const p = PROVIDERS[provider];
  const tx = texts(c, provider);
  const connected = real || demo;
  const avatar = real?.picture || real?.avatar_url;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4" data-testid={`connect-row-${provider}`}>
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {avatar ? (
          <img src={avatar} alt="" className="shrink-0 w-10 h-10 rounded-lg border border-emerald-500/40 object-cover" />
        ) : (
          <span className={`shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${p.iconBox}`}>
            <p.Icon size={17} className={p.iconCls} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">
            {real ? real.name || real.username || tx.btn : provider === 'github' ? c.ghSub : c.sub}
          </p>
          <p className="text-xs text-slate-500 leading-snug mt-0.5 truncate">
            {real
              ? real.email || (real.username ? `@${real.username}` : tx.connectedAs)
              : demo?.name || demo?.url || tx.connectedAs.replace(/^.*$/, '')}
            {!real && !demo && ''}
          </p>
        </div>
      </div>
      {connected ? (
        <span className="shrink-0 inline-flex items-center gap-2" data-testid={`connect-verified-badge-${provider}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
            <BadgeCheck size={14} />
            {tx.connected}
          </span>
          {real && (
            <button
              onClick={() => onDisconnect(provider)}
              data-testid={`connect-disconnect-button-${provider}`}
              className="text-slate-500 hover:text-red-300 transition-colors"
              title={c.disconnect}
            >
              <LogOut size={15} />
            </button>
          )}
        </span>
      ) : (
        <button
          onClick={() => onConnect(provider)}
          data-testid={`connect-${provider}-button`}
          className={`shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white transition-all duration-300 ${p.btnCls}`}
        >
          <p.Icon size={14} />
          {tx.btn}
        </button>
      )}
    </div>
  );
}

export default function ConnectSocial() {
  const { t } = useLanguage();
  const c = t.connect;
  const [modalProvider, setModalProvider] = useState(null);
  const [oauthOn, setOauthOn] = useState({ linkedin: false, github: false });
  const [real, setReal] = useState({ linkedin: null, github: null });
  const [demo, setDemo] = useState({ linkedin: null, github: null });
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('form');
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    ['linkedin', 'github'].forEach((prov) => {
      axios.get(`${API}/auth/${prov}/status`).then((r) =>
        setOauthOn((o) => ({ ...o, [prov]: r.data.configured }))
      ).catch(() => {});
      fetch(`${API}/auth/${prov}/me`, { credentials: 'include' })
        .then(async (r) => {
          if (r.ok) {
            const profile = await r.json();
            setReal((s) => ({ ...s, [prov]: profile }));
          }
        })
        .catch(() => {});
      const saved = localStorage.getItem(LS_KEYS[prov]);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDemo((s) => ({ ...s, [prov]: parsed }));
        } catch {}
      }
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'connected') {
      toast.success(c.success);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('github') === 'connected') {
      toast.success(c.githubSuccess);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [c.success, c.githubSuccess]);

  const tx = modalProvider ? texts(c, modalProvider) : null;

  const startVerify = (e) => {
    e.preventDefault();
    if (!url.includes(tx.domain)) {
      toast.error(tx.error);
      return;
    }
    setPhase('verifying');
    setStepIdx(0);
  };

  useEffect(() => {
    if (phase !== 'verifying' || !modalProvider) return;
    const steps = texts(c, modalProvider).steps;
    if (stepIdx >= steps.length) {
      const finish = async () => {
        const data = { url, name };
        try {
          await axios.post(`${API}/social-connect`, {
            provider: modalProvider,
            profile_url: url,
            full_name: name,
          });
        } catch {}
        localStorage.setItem(LS_KEYS[modalProvider], JSON.stringify(data));
        setDemo((s) => ({ ...s, [modalProvider]: data }));
        setPhase('done');
      };
      finish();
      return;
    }
    const tmr = setTimeout(() => setStepIdx((s) => s + 1), 750);
    return () => clearTimeout(tmr);
  }, [phase, stepIdx, modalProvider, c, url, name]);

  const close = () => {
    setModalProvider(null);
    setTimeout(() => {
      setPhase('form');
      setStepIdx(0);
      setUrl('');
      setName('');
    }, 300);
  };

  const connect = (provider) => {
    if (oauthOn[provider]) {
      window.location.assign(`${API}/auth/${provider}/start`);
    } else {
      setModalProvider(provider);
    }
  };

  const disconnect = async (provider) => {
    try {
      await fetch(`${API}/auth/${provider}/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    setReal((s) => ({ ...s, [provider]: null }));
  };

  const P = modalProvider ? PROVIDERS[modalProvider] : null;

  return (
    <>
      <div
        className="rounded-xl border border-white/[0.08] bg-[#111620]/70 backdrop-blur max-w-xl"
        data-testid="connect-social-card"
      >
        <div className="px-5 pt-4">
          <p className="font-mono-tech text-[9px] tracking-[0.25em] uppercase text-cyan-400/80">{c.kicker}</p>
          <p className="text-sm font-semibold text-slate-100 mt-0.5">{c.title}</p>
        </div>
        <div className="divide-y divide-white/[0.06]">
          <ProviderRow provider="linkedin" c={c} real={real.linkedin} demo={demo.linkedin} onConnect={connect} onDisconnect={disconnect} />
          <ProviderRow provider="github" c={c} real={real.github} demo={demo.github} onConnect={connect} onDisconnect={disconnect} />
        </div>
      </div>

      <AnimatePresence>
        {modalProvider && (
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
                  <P.Icon size={16} className={P.iconCls} />
                  <span className="font-display font-semibold text-sm">{tx.modalTitle}</span>
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
                    <p className="text-xs text-slate-400 leading-relaxed">{tx.modalSub}</p>
                    <div>
                      <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                        {c.nameLabel}
                      </label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={c.namePh}
                        className={`w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors ${P.focus}`}
                        data-testid="connect-name-input"
                      />
                    </div>
                    <div>
                      <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                        {tx.urlLabel}
                      </label>
                      <input
                        required
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={tx.urlPh}
                        className={`w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors ${P.focus}`}
                        data-testid="connect-url-input"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="connect-verify-button"
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold text-white transition-all duration-300 ${P.btnCls}`}
                    >
                      <ShieldCheck size={15} />
                      {c.verify}
                    </button>
                  </form>
                )}

                {phase === 'verifying' && (
                  <div className="py-4 space-y-4" data-testid="connect-verification-steps">
                    {tx.steps.map((s, i) => (
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
                    <p className="font-display font-semibold text-lg mb-2">{tx.connected}</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">{tx.success}</p>
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
