import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';

export function AdminLogin({ a, email, setEmail, password, setPassword, error, loading, onSubmit }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid" data-testid="admin-login-page">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111620]/90 backdrop-blur-xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        data-testid="admin-login-form"
      >
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
            <ShieldCheck size={16} className="text-emerald-400" />
          </span>
          <h1 className="font-display font-bold text-xl tracking-tight">{a.loginTitle}</h1>
        </div>
        <p className="font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500 mb-7">{a.loginSub}</p>
        <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">{a.email}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60 mb-4 transition-colors"
          data-testid="admin-email-input"
        />
        <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">{a.password}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60 mb-5 transition-colors"
          data-testid="admin-password-input"
        />
        {error && (
          <p className="text-xs text-red-400 mb-4" data-testid="admin-login-error">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="admin-login-button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-[#07090E] hover:bg-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] disabled:opacity-60 transition-all duration-300"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? a.loggingIn : a.login}
        </button>
      </motion.form>
    </div>
  );
}
