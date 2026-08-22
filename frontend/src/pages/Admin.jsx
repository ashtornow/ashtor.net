import { useEffect, useState, Fragment } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Terminal, ShieldCheck, LogOut, Users, Linkedin, Github, BadgeCheck, Loader2, StickyNote, Download } from 'lucide-react';
import { useLanguage } from '@/i18n';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const creds = { withCredentials: true };

const STATUSES = ['new', 'contacted', 'matched', 'hired'];
const STATUS_STYLE = {
  new: 'border-slate-400/40 text-slate-200 bg-white/[0.06]',
  contacted: 'border-cyan-400/50 text-cyan-300 bg-cyan-400/[0.08]',
  matched: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/[0.08]',
  hired: 'border-amber-400/50 text-amber-300 bg-amber-400/[0.08]',
};

export default function Admin() {
  const { t } = useLanguage();
  const a = t.admin;
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('leads');
  const [statusFilter, setStatusFilter] = useState('all');
  const [noteOpen, setNoteOpen] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [leads, setLeads] = useState([]);
  const [conns, setConns] = useState([]);
  const [verified, setVerified] = useState([]);
  const [gh, setGh] = useState([]);

  const STATUS_LABEL = {
    new: a.statusNew,
    contacted: a.statusContacted,
    matched: a.statusMatched,
    hired: a.statusHired,
  };

  const filteredLeads =
    statusFilter === 'all' ? leads : leads.filter((l) => (l.status || 'new') === statusFilter);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/auth/me`, creds);
        setUser(r.data);
      } catch {
        setUser(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [l, c, v, g] = await Promise.all([
          axios.get(`${API}/admin/leads`, creds),
          axios.get(`${API}/admin/social-connections`, creds),
          axios.get(`${API}/admin/linkedin-profiles`, creds),
          axios.get(`${API}/admin/github-profiles`, creds),
        ]);
        setLeads(l.data);
        setConns(c.data);
        setVerified(v.data);
        setGh(g.data);
      } catch {}
    })();
  }, [user]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await axios.post(`${API}/auth/login`, { email, password }, creds);
      setUser(r.data);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : a.loginError);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, creds);
    setUser(false);
  };

  const patchStatus = async (leadId, status) => {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, status } : l)));
    try {
      await axios.patch(`${API}/admin/leads/${leadId}/status`, { status }, creds);
    } catch {
      setLeads(prev);
    }
  };

  const toggleNote = (l) => {
    setNoteOpen(noteOpen === l.id ? null : l.id);
    setNoteDraft(l.note || '');
  };

  const saveNote = async (leadId) => {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, note: noteDraft } : l)));
    setNoteOpen(null);
    try {
      await axios.patch(`${API}/admin/leads/${leadId}/note`, { note: noteDraft }, creds);
    } catch {
      setLeads(prev);
    }
  };

  const exportCsv = async () => {
    const res = await fetch(`${API}/admin/leads/export`, { credentials: 'include' });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ashtor_leads.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (d) => {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (user === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-grid" data-testid="admin-login-page">
        <motion.form
          onSubmit={login}
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

  const tabs = [
    { key: 'leads', label: a.tabLeads, Icon: Users, count: leads.length },
    { key: 'linkedin', label: a.tabLinkedin, Icon: Linkedin, count: conns.length },
    { key: 'verified', label: a.tabVerified, Icon: BadgeCheck, count: verified.length },
    { key: 'github', label: a.tabGithub, Icon: Github, count: gh.length },
  ];

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10" data-testid="admin-dashboard">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <Terminal size={17} className="text-emerald-400" />
            </span>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight">{a.title}</h1>
              <p className="font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500">{a.subtitle}</p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="admin-logout-button"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-red-400/50 hover:text-red-300 transition-all duration-300"
          >
            <LogOut size={13} />
            {a.logout}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tabs.map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              data-testid={`admin-tab-${key}`}
              className={`rounded-xl border p-5 text-left transition-all duration-300 ${
                tab === key
                  ? 'border-emerald-500/50 bg-emerald-500/[0.07] shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                  : 'border-white/[0.07] bg-[#111620]/70 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon size={17} className={tab === key ? 'text-emerald-400' : 'text-slate-500'} />
                <span className="font-display text-2xl font-bold">{count}</span>
              </div>
              <p className="font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-400">{label}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#111620]/70 overflow-hidden">
          {tab === 'leads' && (
            <div className="overflow-x-auto" data-testid="admin-leads-table">
              <div className="flex flex-wrap items-center gap-1.5 px-5 py-3.5 border-b border-white/[0.07]" data-testid="lead-filter-bar">
                {['all', ...STATUSES].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    data-testid={`lead-filter-${s}`}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-all duration-200 ${
                      statusFilter === s
                        ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/[0.08]'
                        : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {s === 'all' ? a.filterAll : STATUS_LABEL[s]}
                    <span className="ml-1.5 opacity-60">
                      {s === 'all' ? leads.length : leads.filter((l) => (l.status || 'new') === s).length}
                    </span>
                  </button>
                ))}
                <button
                  onClick={exportCsv}
                  data-testid="admin-export-csv-button"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/[0.07] px-3.5 py-1.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/[0.15] transition-all duration-200"
                >
                  <Download size={11} />
                  {a.exportCsv}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500">
                    <th className="text-left px-5 py-3.5">{a.colName}</th>
                    <th className="text-left px-5 py-3.5">{a.colEmail}</th>
                    <th className="text-left px-5 py-3.5">{a.colRole}</th>
                    <th className="text-left px-5 py-3.5">{a.colLocation}</th>
                    <th className="text-left px-5 py-3.5">{a.colDate}</th>
                    <th className="text-left px-5 py-3.5">{a.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-600 text-xs">{a.empty}</td></tr>
                  )}
                  {filteredLeads.map((l) => (
                    <Fragment key={l.id}>
                      <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-slate-200">{l.full_name}</td>
                      <td className="px-5 py-3.5 text-slate-400">{l.email}</td>
                      <td className="px-5 py-3.5 text-slate-400">{l.role}</td>
                      <td className="px-5 py-3.5 text-slate-400">{l.location}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{fmt(l.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5" data-testid={`lead-pipeline-${l.id}`}>
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              onClick={() => patchStatus(l.id, s)}
                              data-testid={`lead-status-${s}-${l.id}`}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 ${
                                (l.status || 'new') === s
                                  ? STATUS_STYLE[s]
                                  : 'border-white/[0.08] text-slate-600 hover:text-slate-300 hover:border-white/25'
                              }`}
                            >
                              {STATUS_LABEL[s]}
                            </button>
                          ))}
                          <button
                            onClick={() => toggleNote(l)}
                            data-testid={`lead-note-toggle-${l.id}`}
                            title={a.noteAdd}
                            className={`rounded-full border p-1.5 transition-all duration-200 ${
                              l.note
                                ? 'border-amber-400/50 text-amber-300 bg-amber-400/[0.08]'
                                : 'border-white/[0.08] text-slate-600 hover:text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <StickyNote size={12} />
                          </button>
                        </div>
                      </td>
                      </tr>
                      {noteOpen === l.id && (
                        <tr className="border-b border-white/[0.04] bg-[#0B0E14]/60">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-start gap-3 max-w-2xl">
                              <textarea
                                rows={2}
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder={a.notePh}
                                className="flex-1 rounded-lg border border-white/10 bg-[#07090E] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-400/60 transition-colors resize-none"
                                data-testid={`lead-note-input-${l.id}`}
                              />
                              <button
                                onClick={() => saveNote(l.id)}
                                data-testid={`lead-note-save-${l.id}`}
                                className="shrink-0 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-[#07090E] hover:bg-amber-300 transition-colors duration-200"
                              >
                                {a.noteSave}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'linkedin' && (
            <div className="overflow-x-auto" data-testid="admin-linkedin-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500">
                    <th className="text-left px-5 py-3.5">{a.colName}</th>
                    <th className="text-left px-5 py-3.5">{a.colProvider}</th>
                    <th className="text-left px-5 py-3.5">{a.colUrl}</th>
                    <th className="text-left px-5 py-3.5">{a.colStatus}</th>
                    <th className="text-left px-5 py-3.5">{a.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {conns.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-600 text-xs">{a.empty}</td></tr>
                  )}
                  {conns.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-slate-200">{c.full_name || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400 capitalize">{c.provider}</td>
                      <td className="px-5 py-3.5 text-cyan-400 text-xs max-w-[220px] truncate">{c.profile_url}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <BadgeCheck size={12} /> {a.verified}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{fmt(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'verified' && (
            <div className="overflow-x-auto" data-testid="admin-verified-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500">
                    <th className="text-left px-5 py-3.5">{a.colName}</th>
                    <th className="text-left px-5 py-3.5">{a.colEmail}</th>
                    <th className="text-left px-5 py-3.5">{a.colStatus}</th>
                    <th className="text-left px-5 py-3.5">{a.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {verified.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-600 text-xs">{a.empty}</td></tr>
                  )}
                  {verified.map((v) => (
                    <tr key={v.sub} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-slate-200 flex items-center gap-2.5">
                        {v.picture && <img src={v.picture} alt="" className="w-6 h-6 rounded-full" />}
                        {v.name || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{v.email || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <BadgeCheck size={12} /> OIDC
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{fmt(v.verified_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'github' && (
            <div className="overflow-x-auto" data-testid="admin-github-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500">
                    <th className="text-left px-5 py-3.5">{a.colName}</th>
                    <th className="text-left px-5 py-3.5">{a.colUsername}</th>
                    <th className="text-left px-5 py-3.5">{a.colRepos}</th>
                    <th className="text-left px-5 py-3.5">{a.colStatus}</th>
                    <th className="text-left px-5 py-3.5">{a.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {gh.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-600 text-xs">{a.empty}</td></tr>
                  )}
                  {gh.map((g) => (
                    <tr key={g.github_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-slate-200 flex items-center gap-2.5">
                        {g.avatar_url && <img src={g.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
                        {g.name || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-cyan-400 text-xs">
                        <a href={g.profile_url} target="_blank" rel="noreferrer" className="hover:underline">@{g.username}</a>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{g.public_repos}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <BadgeCheck size={12} /> OAuth
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{fmt(g.verified_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
