import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Send, Loader2, Paperclip, X } from 'lucide-react';
import { useLanguage } from '@/i18n';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CV_EXTS = ['pdf', 'doc', 'docx'];

export default function LeadForm() {
  const { lang, t } = useLanguage();
  const f = t.form;
  const [form, setForm] = useState({ role: 0, full_name: '', email: '', skills_or_needs: '', location: '' });
  const [cvFile, setCvFile] = useState(null);
  const [sending, setSending] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    const handler = (e) => setForm((f) => ({ ...f, skills_or_needs: e.detail.skills }));
    window.addEventListener('ashtor:prefill', handler);
    return () => window.removeEventListener('ashtor:prefill', handler);
  }, []);

  const onPickCv = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!CV_EXTS.includes(ext) || file.size > 8 * 1024 * 1024) {
      toast.error(f.cvBad);
      return;
    }
    setCvFile(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await axios.post(`${API}/leads`, {
        role: f.roles[form.role],
        full_name: form.full_name,
        email: form.email,
        skills_or_needs: form.skills_or_needs,
        location: form.location,
        language: lang,
      });
      if (cvFile) {
        try {
          const fd = new FormData();
          fd.append('file', cvFile);
          await axios.post(`${API}/leads/${r.data.id}/cv`, fd);
        } catch (err) {
          console.error('LeadForm: CV upload failed', err);
          toast.error(f.cvError);
        }
      }
      toast.success(f.success);
      setForm({ role: form.role, full_name: '', email: '', skills_or_needs: '', location: '' });
      setCvFile(null);
    } catch (err) {
      toast.error(f.error);
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:shadow-[0_0_18px_rgba(16,185,129,0.12)] transition-all duration-300';

  return (
    <section id="contact" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8" data-testid="lead-section">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.07),transparent_55%)]" />
      <div className="relative max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <p className="font-mono-tech text-xs tracking-[0.25em] uppercase text-emerald-400 mb-4">
            {'// '}{f.eyebrow}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{f.title}</h2>
          <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto">{f.sub}</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111620]/80 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
          data-testid="lead-capture-form"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3.5 bg-[#0B0E14]/80">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-3 font-mono-tech text-[10px] tracking-[0.2em] text-slate-500">{f.terminal}</span>
          </div>

          <div className="p-6 sm:p-9 space-y-6">
            <div>
              <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-3">
                {f.roleLabel}
              </label>
              <div className="flex flex-wrap gap-2" data-testid="lead-form-role-select">
                {f.roles.map((r, i) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForm({ ...form, role: i })}
                    data-testid={`lead-form-role-${i}`}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 ${
                      form.role === i
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.15)]'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                  {f.name}
                </label>
                <input
                  required
                  value={form.full_name}
                  onChange={set('full_name')}
                  placeholder={f.namePh}
                  className={inputCls}
                  data-testid="lead-form-name-input"
                />
              </div>
              <div>
                <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                  {f.email}
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder={f.emailPh}
                  className={inputCls}
                  data-testid="lead-form-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                {f.skills}
              </label>
              <textarea
                required
                rows={3}
                value={form.skills_or_needs}
                onChange={set('skills_or_needs')}
                placeholder={f.skillsPh}
                className={`${inputCls} resize-none`}
                data-testid="lead-form-skills-input"
              />
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                {f.location}
              </label>
              <input
                required
                value={form.location}
                onChange={set('location')}
                placeholder={f.locationPh}
                className={inputCls}
                data-testid="lead-form-location-input"
              />
            </div>

            <div>
              <label className="block font-mono-tech text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-2">
                {f.cvLabel}
              </label>
              <div className="flex items-center gap-3">
                <label
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0E14] px-4 py-3 text-sm text-slate-300 cursor-pointer hover:border-emerald-500/50 hover:text-emerald-300 transition-all duration-300"
                  data-testid="lead-form-cv-picker"
                >
                  <Paperclip size={14} className="text-emerald-400" />
                  <span className="truncate max-w-[220px]">{cvFile ? cvFile.name : f.cvButton}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={onPickCv}
                    data-testid="lead-form-cv-input"
                  />
                </label>
                {cvFile && (
                  <button
                    type="button"
                    onClick={() => setCvFile(null)}
                    data-testid="lead-form-cv-clear"
                    className="text-slate-500 hover:text-red-300 transition-colors"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">{f.cvHint}</p>
            </div>

            <button
              type="submit"
              disabled={sending}
              data-testid="lead-form-submit-button"
              className="group w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-emerald-500 px-6 py-4 text-sm font-semibold text-[#07090E] hover:bg-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] disabled:opacity-60 transition-all duration-300"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {f.sending}
                </>
              ) : (
                <>
                  {f.submit}
                  <Send size={15} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
