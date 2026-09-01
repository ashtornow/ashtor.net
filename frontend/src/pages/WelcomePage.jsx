import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { BadgeCheck, ArrowRight, Loader2, ShieldAlert, Sparkles, Pencil, Copy, QrCode } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { usePageMeta } from '@/lib/seo';
import { LogoBox } from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ProfileRow({ label, value, testid }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="font-mono-tech text-[9px] tracking-[0.2em] uppercase text-slate-500 pt-0.5 shrink-0">{label}</span>
      <span className="text-xs text-slate-200 text-right break-all" data-testid={testid}>{value}</span>
    </div>
  );
}

export default function WelcomePage() {
  const { token } = useParams();
  const { t, setLang } = useLanguage();
  const w = t.welcome;
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState('loading');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ skills_or_needs: '', location: '' });
  const [saving, setSaving] = useState(false);
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

  const startEdit = () => {
    setDraft({ skills_or_needs: info.skills_or_needs || '', location: info.location || '' });
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/welcome/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setInfo(data);
      setEditing(false);
      toast.success(w.saved);
    } catch (err) {
      console.error('Welcome: profile update failed', err);
      toast.error(w.saveError);
    } finally {
      setSaving(false);
    }
  };

  const apiUrl = `${API}/profile/${token}`;
  const copyApi = async () => {
    await navigator.clipboard.writeText(apiUrl);
    toast.success(w.copied);
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

          <div className="rounded-xl border border-white/[0.07] bg-[#0B0E14]/70 p-5 mb-6" data-testid="welcome-profile-card">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono-tech text-[10px] tracking-[0.3em] uppercase text-slate-500">{w.profileTitle}</p>
              {!editing && (
                <button
                  onClick={startEdit}
                  data-testid="welcome-edit-button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-all duration-200"
                >
                  <Pencil size={11} />
                  {w.edit}
                </button>
              )}
            </div>
            <ProfileRow label={w.fMember} value={info.member_id} testid="welcome-member-id" />
            <ProfileRow label={w.fEmail} value={info.email} testid="welcome-profile-email" />
            <ProfileRow label={w.fRole} value={info.role} testid="welcome-profile-role" />
            {editing ? (
              <div className="py-3 space-y-3">
                <div>
                  <label className="block font-mono-tech text-[9px] tracking-[0.2em] uppercase text-slate-500 mb-1.5">{w.fStack}</label>
                  <textarea
                    rows={2}
                    value={draft.skills_or_needs}
                    onChange={(e) => setDraft({ ...draft, skills_or_needs: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500/60 transition-colors resize-none"
                    data-testid="welcome-edit-stack"
                  />
                </div>
                <div>
                  <label className="block font-mono-tech text-[9px] tracking-[0.2em] uppercase text-slate-500 mb-1.5">{w.fLocation}</label>
                  <input
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500/60 transition-colors"
                    data-testid="welcome-edit-location"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    data-testid="welcome-save-button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-[#07090E] hover:bg-emerald-400 disabled:opacity-60 transition-all duration-200"
                  >
                    {saving && <Loader2 size={11} className="animate-spin" />}
                    {w.save}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    data-testid="welcome-cancel-button"
                    className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors duration-200"
                  >
                    {w.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <ProfileRow label={w.fStack} value={info.skills_or_needs} testid="welcome-profile-stack" />
                <ProfileRow label={w.fLocation} value={info.location} testid="welcome-profile-location" />
              </>
            )}
            <ProfileRow label={w.fCv} value={info.has_cv ? w.yes : w.no} testid="welcome-profile-cv" />
            {info.approved_at && (
              <ProfileRow label={w.fSince} value={new Date(info.approved_at).toLocaleDateString()} testid="welcome-profile-since" />
            )}
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-[#0B0E14]/70 p-5 mb-8" data-testid="welcome-sync-card">
            <p className="font-mono-tech text-[10px] tracking-[0.3em] uppercase text-cyan-300 mb-2 flex items-center gap-2">
              <QrCode size={12} /> {w.syncTitle}
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="shrink-0 rounded-lg bg-white p-2.5" data-testid="welcome-qr">
                <QRCodeSVG value={window.location.href} size={104} fgColor="#07090E" bgColor="#FFFFFF" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{w.syncSub}</p>
                <p className="font-mono-tech text-[10px] text-slate-500 break-all mb-3" data-testid="welcome-api-url">{apiUrl}</p>
                <button
                  onClick={copyApi}
                  data-testid="welcome-copy-api-button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/[0.07] px-4 py-2 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/[0.15] transition-all duration-200"
                >
                  <Copy size={12} />
                  {w.copyApi}
                </button>
              </div>
            </div>
          </div>

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
