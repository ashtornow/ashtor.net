import { useEffect, useState } from 'react';
import axios from 'axios';
import { Terminal, LogOut, Users, Linkedin, Github, BadgeCheck, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n';
import { usePageMeta } from '@/lib/seo';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { LeadsTable, ConnectionsTable, VerifiedTable, GithubTable } from '@/pages/admin/AdminTables';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const creds = { withCredentials: true };

export default function Admin() {
  const { t } = useLanguage();
  const a = t.admin;
  usePageMeta('admin');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('leads');
  const [statusFilter, setStatusFilter] = useState('all');
  const [noteOpen, setNoteOpen] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [filesOpen, setFilesOpen] = useState(null);
  const [leadFiles, setLeadFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [digestSending, setDigestSending] = useState(false);
  const [leads, setLeads] = useState([]);
  const [conns, setConns] = useState([]);
  const [verified, setVerified] = useState([]);
  const [gh, setGh] = useState([]);

  const statusLabel = {
    new: a.statusNew,
    contacted: a.statusContacted,
    matched: a.statusMatched,
    hired: a.statusHired,
  };

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
      } catch (err) {
        console.error('Admin: failed to load dashboard data', err);
      }
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
    } catch (err) {
      console.error('Admin: failed to update lead status', err);
      setLeads(prev);
    }
  };

  const toggleNote = (l) => {
    setNoteOpen(noteOpen === l.id ? null : l.id);
    setNoteDraft(l.note || '');
  };

  const fetchLeadFiles = async (leadId) => {
    try {
      const r = await axios.get(`${API}/admin/leads/${leadId}/files`, creds);
      setLeadFiles(r.data);
    } catch (err) {
      console.error('Admin: failed to load lead files', err);
    }
  };

  const toggleFiles = async (l) => {
    if (filesOpen === l.id) {
      setFilesOpen(null);
      return;
    }
    setFilesOpen(l.id);
    setLeadFiles(null);
    await fetchLeadFiles(l.id);
  };

  const uploadAttachment = async (leadId, file) => {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await axios.post(`${API}/admin/leads/${leadId}/attachments`, fd, creds);
      await fetchLeadFiles(leadId);
      toast.success(a.fileUploaded);
    } catch (err) {
      console.error('Admin: attachment upload failed', err);
      toast.error(a.fileError);
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadFile = async (f) => {
    const res = await fetch(`${API}/admin/files/${f.id}/download`, { credentials: 'include' });
    if (!res.ok) {
      console.error('Admin: file download failed', res.status);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = f.original_filename || 'file';
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteFile = async (f) => {
    if (!window.confirm(a.fileDeleteConfirm)) return;
    try {
      await axios.delete(`${API}/admin/files/${f.id}`, creds);
      setLeadFiles((fs) => fs.filter((x) => x.id !== f.id));
      if (f.kind === 'cv') {
        setLeads((ls) => ls.map((l) => (l.id === f.lead_id ? { ...l, cv_file_id: undefined } : l)));
      }
    } catch (err) {
      console.error('Admin: file delete failed', err);
    }
  };

  const saveNote = async (leadId) => {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, note: noteDraft } : l)));
    setNoteOpen(null);
    try {
      await axios.patch(`${API}/admin/leads/${leadId}/note`, { note: noteDraft }, creds);
    } catch (err) {
      console.error('Admin: failed to save lead note', err);
      setLeads(prev);
    }
  };

  const exportCsv = async () => {
    const res = await fetch(`${API}/admin/leads/export`, { credentials: 'include' });
    if (!res.ok) {
      console.error('Admin: CSV export failed', res.status);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ashtor_leads.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendDigest = async () => {
    setDigestSending(true);
    try {
      await axios.post(`${API}/admin/digest/send`, {}, creds);
      toast.success(a.digestOk);
    } catch (err) {
      console.error('Admin: digest send failed', err);
      toast.error(a.digestFail);
    } finally {
      setDigestSending(false);
    }
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
      <AdminLogin
        a={a}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={error}
        loading={loading}
        onSubmit={login}
      />
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
          <div className="flex items-center gap-2.5">
            <button
              onClick={sendDigest}
              disabled={digestSending}
              data-testid="admin-send-digest-button"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/[0.07] px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/[0.15] disabled:opacity-60 transition-all duration-300"
            >
              {digestSending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              {a.digestSend}
            </button>
            <button
              onClick={logout}
              data-testid="admin-logout-button"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-red-400/50 hover:text-red-300 transition-all duration-300"
            >
              <LogOut size={13} />
              {a.logout}
            </button>
          </div>
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
            <LeadsTable
              a={a}
              leads={leads}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              statusLabel={statusLabel}
              patchStatus={patchStatus}
              noteOpen={noteOpen}
              noteDraft={noteDraft}
              setNoteDraft={setNoteDraft}
              toggleNote={toggleNote}
              saveNote={saveNote}
              exportCsv={exportCsv}
              filesOpen={filesOpen}
              toggleFiles={toggleFiles}
              leadFiles={leadFiles}
              uploadingFile={uploadingFile}
              onUploadAttachment={uploadAttachment}
              onDownloadFile={downloadFile}
              onDeleteFile={deleteFile}
              fmt={fmt}
            />
          )}
          {tab === 'linkedin' && <ConnectionsTable a={a} conns={conns} fmt={fmt} />}
          {tab === 'verified' && <VerifiedTable a={a} verified={verified} fmt={fmt} />}
          {tab === 'github' && <GithubTable a={a} gh={gh} fmt={fmt} />}
        </div>
      </div>
    </div>
  );
}
