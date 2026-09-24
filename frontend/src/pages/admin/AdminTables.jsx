import { Fragment } from 'react';
import { toast } from 'sonner';
import { BadgeCheck, StickyNote, Download, Reply, Paperclip, Upload, FileText, Trash2, Loader2, Check, X, Copy, ExternalLink, Clock, Mail, MapPin } from 'lucide-react';

export const STATUSES = ['new', 'contacted', 'matched', 'hired'];

const REPLY_TEMPLATES = {
  en: {
    subject: 'Ashtor.net — following up on your intake',
    body: (l) => `Hi ${l.full_name},

Thanks for reaching out to Ashtor.net. I reviewed your intake (${l.role}) and would love to schedule a quick call to discuss next steps.

Best,
Ashtor.net Team
info@ashtor.net`,
  },
  es: {
    subject: 'Ashtor.net — seguimiento de tu registro',
    body: (l) => `Hola ${l.full_name},

Gracias por escribirnos en Ashtor.net. Revisé tu registro (${l.role}) y me encantaría agendar una llamada breve para conversar los siguientes pasos.

Saludos,
Equipo Ashtor.net
info@ashtor.net`,
  },
};

const mailtoFor = (l) => {
  const tpl = REPLY_TEMPLATES[l.language === 'es' ? 'es' : 'en'];
  return `mailto:${l.email}?subject=${encodeURIComponent(tpl.subject)}&body=${encodeURIComponent(tpl.body(l))}`;
};

export const STATUS_STYLE = {
  new: 'border-slate-400/40 text-slate-200 bg-white/[0.06]',
  contacted: 'border-cyan-400/50 text-cyan-300 bg-cyan-400/[0.08]',
  matched: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/[0.08]',
  hired: 'border-amber-400/50 text-amber-300 bg-amber-400/[0.08]',
};

const th = 'text-left px-5 py-3.5';
const headRow = 'border-b border-white/[0.07] font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500';
const bodyRow = 'border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors';

const EmptyRow = ({ span, text }) => (
  <tr><td colSpan={span} className="px-5 py-10 text-center text-slate-600 text-xs">{text}</td></tr>
);

function LeadFilterBar({ a, leads, statusFilter, setStatusFilter, statusLabel, exportCsv }) {
  return (
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
          {s === 'all' ? a.filterAll : statusLabel[s]}
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
  );
}

function LeadRow({ a, lead, statusLabel, patchStatus, setApproval, toggleNote, noteOpen, noteDraft, setNoteDraft, saveNote, fmt, filesOpen, toggleFiles, leadFiles, uploadingFile, onUploadAttachment, onDownloadFile, onDeleteFile }) {
  return (
    <Fragment>
      <tr className={bodyRow}>
        <td className="px-5 py-3.5 text-slate-200">{lead.full_name}</td>
        <td className="px-5 py-3.5 text-slate-400">{lead.email}</td>
        <td className="px-5 py-3.5 text-slate-400">{lead.role}</td>
        <td className="px-5 py-3.5 text-slate-400">{lead.location}</td>
        <td className="px-5 py-3.5 text-slate-500 text-xs">{fmt(lead.created_at)}</td>
        <td className="px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-1.5" data-testid={`lead-pipeline-${lead.id}`}>
            {(lead.approval || 'pending') === 'pending' ? (
              <span className="inline-flex items-center gap-1 mr-1.5 pr-2 border-r border-white/[0.08]">
                <button
                  onClick={() => setApproval(lead.id, 'approve')}
                  data-testid={`lead-approve-${lead.id}`}
                  title={a.approveBtn}
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/[0.08] p-1.5 text-emerald-300 hover:bg-emerald-500/[0.2] transition-all duration-200"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => setApproval(lead.id, 'reject')}
                  data-testid={`lead-reject-${lead.id}`}
                  title={a.rejectBtn}
                  className="rounded-full border border-red-400/40 bg-red-400/[0.05] p-1.5 text-red-300 hover:bg-red-400/[0.15] transition-all duration-200"
                >
                  <X size={12} />
                </button>
              </span>
            ) : (
              <span
                data-testid={`lead-approval-badge-${lead.id}`}
                className={`mr-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  lead.approval === 'approved'
                    ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/[0.08]'
                    : 'border-red-400/50 text-red-300 bg-red-400/[0.08]'
                }`}
              >
                {lead.approval === 'approved' ? a.approvalApproved : a.approvalRejected}
              </span>
            )}
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => patchStatus(lead.id, s)}
                data-testid={`lead-status-${s}-${lead.id}`}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 ${
                  (lead.status || 'new') === s
                    ? STATUS_STYLE[s]
                    : 'border-white/[0.08] text-slate-600 hover:text-slate-300 hover:border-white/25'
                }`}
              >
                {statusLabel[s]}
              </button>
            ))}
            <button
              onClick={() => toggleNote(lead)}
              data-testid={`lead-note-toggle-${lead.id}`}
              title={a.noteAdd}
              className={`rounded-full border p-1.5 transition-all duration-200 ${
                lead.note
                  ? 'border-amber-400/50 text-amber-300 bg-amber-400/[0.08]'
                  : 'border-white/[0.08] text-slate-600 hover:text-slate-300 hover:border-white/25'
              }`}
            >
              <StickyNote size={12} />
            </button>
            <a
              href={mailtoFor(lead)}
              data-testid={`lead-reply-${lead.id}`}
              title={a.replyTitle}
              className="rounded-full border border-white/[0.08] p-1.5 text-slate-600 hover:text-cyan-300 hover:border-cyan-400/50 transition-all duration-200"
            >
              <Reply size={12} />
            </a>
            <button
              onClick={() => toggleFiles(lead)}
              data-testid={`lead-files-toggle-${lead.id}`}
              title={a.filesTitle}
              className={`rounded-full border p-1.5 transition-all duration-200 ${
                lead.cv_file_id || filesOpen === lead.id
                  ? 'border-cyan-400/50 text-cyan-300 bg-cyan-400/[0.08]'
                  : 'border-white/[0.08] text-slate-600 hover:text-slate-300 hover:border-white/25'
              }`}
            >
              <Paperclip size={12} />
            </button>
          </div>
        </td>
      </tr>
      {noteOpen === lead.id && (
        <tr className="border-b border-white/[0.04] bg-[#0B0E14]/60">
          <td colSpan={6} className="px-5 py-4">
            <div className="flex items-start gap-3 max-w-2xl">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={a.notePh}
                className="flex-1 rounded-lg border border-white/10 bg-[#07090E] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-400/60 transition-colors resize-none"
                data-testid={`lead-note-input-${lead.id}`}
              />
              <button
                onClick={() => saveNote(lead.id)}
                data-testid={`lead-note-save-${lead.id}`}
                className="shrink-0 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-[#07090E] hover:bg-amber-300 transition-colors duration-200"
              >
                {a.noteSave}
              </button>
            </div>
          </td>
        </tr>
      )}
      {filesOpen === lead.id && (
        <tr className="border-b border-white/[0.04] bg-[#0B0E14]/60">
          <td colSpan={6} className="px-5 py-4" data-testid={`lead-files-panel-${lead.id}`}>
            <div className="max-w-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-mono-tech text-[10px] tracking-[0.2em] uppercase text-slate-500">{a.filesTitle}</p>
                <label
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/[0.07] px-3 py-1.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-400/[0.15] cursor-pointer transition-all duration-200"
                  data-testid={`lead-file-upload-${lead.id}`}
                >
                  {uploadingFile ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {a.fileUpload}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv"
                    onChange={(e) => e.target.files[0] && onUploadAttachment(lead.id, e.target.files[0])}
                    data-testid={`lead-file-input-${lead.id}`}
                  />
                </label>
              </div>
              {leadFiles === null ? (
                <div className="flex items-center gap-2 text-xs text-slate-600"><Loader2 size={12} className="animate-spin" /></div>
              ) : leadFiles.length === 0 ? (
                <p className="text-xs text-slate-600" data-testid={`lead-files-empty-${lead.id}`}>{a.fileEmpty}</p>
              ) : (
                leadFiles.map((fl) => (
                  <div key={fl.id} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[#07090E] px-3.5 py-2.5" data-testid={`file-row-${fl.id}`}>
                    <FileText size={13} className="text-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-300 truncate flex-1">{fl.original_filename}</span>
                    {fl.kind === 'cv' && (
                      <span className="font-mono-tech text-[8px] tracking-[0.2em] uppercase rounded-full border border-emerald-500/40 text-emerald-300 px-2 py-0.5">{a.fileCv}</span>
                    )}
                    <span className="text-[10px] text-slate-600">{Math.max(1, Math.round(fl.size / 1024))} KB</span>
                    <button
                      onClick={() => onDownloadFile(fl)}
                      data-testid={`file-download-${fl.id}`}
                      className="text-slate-500 hover:text-cyan-300 transition-colors"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteFile(fl)}
                      data-testid={`file-delete-${fl.id}`}
                      title={a.fileDelete}
                      className="text-slate-500 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function LeadsTable(props) {
  const { a, leads, statusFilter, fmt } = props;
  const filtered = statusFilter === 'all' ? leads : leads.filter((l) => (l.status || 'new') === statusFilter);
  return (
    <div className="overflow-x-auto" data-testid="admin-leads-table">
      <LeadFilterBar {...props} />
      <table className="w-full text-sm">
        <thead>
          <tr className={headRow}>
            <th className={th}>{a.colName}</th>
            <th className={th}>{a.colEmail}</th>
            <th className={th}>{a.colRole}</th>
            <th className={th}>{a.colLocation}</th>
            <th className={th}>{a.colDate}</th>
            <th className={th}>{a.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <EmptyRow span={6} text={a.empty} />}
          {filtered.map((l) => (
            <LeadRow key={l.id} lead={l} {...props} fmt={fmt} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConnectionsTable({ a, conns, fmt }) {
  return (
    <div className="overflow-x-auto" data-testid="admin-linkedin-table">
      <table className="w-full text-sm">
        <thead>
          <tr className={headRow}>
            <th className={th}>{a.colName}</th>
            <th className={th}>{a.colProvider}</th>
            <th className={th}>{a.colUrl}</th>
            <th className={th}>{a.colStatus}</th>
            <th className={th}>{a.colDate}</th>
          </tr>
        </thead>
        <tbody>
          {conns.length === 0 && <EmptyRow span={5} text={a.empty} />}
          {conns.map((c) => (
            <tr key={c.id} className={bodyRow}>
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
  );
}

export function VerifiedTable({ a, verified, fmt }) {
  return (
    <div className="overflow-x-auto" data-testid="admin-verified-table">
      <table className="w-full text-sm">
        <thead>
          <tr className={headRow}>
            <th className={th}>{a.colName}</th>
            <th className={th}>{a.colEmail}</th>
            <th className={th}>{a.colStatus}</th>
            <th className={th}>{a.colDate}</th>
          </tr>
        </thead>
        <tbody>
          {verified.length === 0 && <EmptyRow span={4} text={a.empty} />}
          {verified.map((v) => (
            <tr key={v.sub} className={bodyRow}>
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
  );
}

async function copyToClipboard(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMsg);
    return;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast.success(okMsg);
    } catch (err) {
      console.error('Approvals: clipboard copy failed', err);
    }
    document.body.removeChild(ta);
  }
}

function AccessLinkRow({ a, url }) {
  return (
    <div className="mt-3">
      <p className="font-mono-tech text-[9px] tracking-[0.25em] uppercase text-slate-500 mb-1.5">{a.apAccessLink}</p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          data-testid="approval-access-link"
          className="flex-1 rounded-lg border border-white/10 bg-[#07090E] px-3 py-2 text-xs text-cyan-300 outline-none focus:border-cyan-400/60 truncate"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(url, a.apCopied)}
            data-testid="approval-copy-link"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/[0.08] px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/[0.18] transition-all duration-200"
          >
            <Copy size={13} /> {a.apCopy}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
          >
            <ExternalLink size={13} /> {a.apOpen}
          </a>
        </div>
      </div>
    </div>
  );
}

export function ApprovalsPanel({ a, leads, setApproval, fmt }) {
  const pending = leads.filter((l) => (l.approval || 'pending') === 'pending');
  const approved = leads.filter((l) => l.approval === 'approved');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="p-5 sm:p-6 space-y-8" data-testid="admin-approvals-panel">
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <Clock size={15} className="text-amber-300" />
          <h3 className="font-display font-semibold text-sm">{a.apPendingTitle}</h3>
          <span className="rounded-full border border-amber-400/40 bg-amber-400/[0.08] px-2 py-0.5 text-[10px] font-semibold text-amber-300">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-slate-600 py-6 text-center" data-testid="approvals-no-pending">{a.apNoPending}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pending.map((l) => (
              <div
                key={l.id}
                data-testid={`approval-card-${l.id}`}
                className="rounded-xl border border-white/[0.08] bg-[#0B0E14]/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{l.full_name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 truncate"><Mail size={11} /> {l.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold text-slate-300 capitalize">{l.role}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                  {l.location && <span className="flex items-center gap-1"><MapPin size={10} /> {l.location}</span>}
                  <span>{fmt(l.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setApproval(l.id, 'approve')}
                    data-testid={`approval-approve-${l.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-[#07090E] hover:bg-emerald-400 transition-colors duration-200"
                  >
                    <Check size={13} /> {a.apApprove}
                  </button>
                  <button
                    onClick={() => setApproval(l.id, 'reject')}
                    data-testid={`approval-reject-${l.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-400/[0.05] px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/[0.15] transition-colors duration-200"
                  >
                    <X size={13} /> {a.apReject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <BadgeCheck size={15} className="text-emerald-400" />
          <h3 className="font-display font-semibold text-sm">{a.apApprovedTitle}</h3>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{approved.length}</span>
        </div>
        {approved.length === 0 ? (
          <p className="text-xs text-slate-600 py-6 text-center" data-testid="approvals-no-approved">{a.apNoApproved}</p>
        ) : (
          <div className="space-y-3">
            {approved.map((l) => (
              <div
                key={l.id}
                data-testid={`approved-card-${l.id}`}
                className="rounded-xl border border-emerald-500/20 bg-[#0B0E14]/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{l.full_name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 truncate"><Mail size={11} /> {l.email}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-500">{a.apApprovedOn} · {fmt(l.approved_at || l.created_at)}</span>
                </div>
                {l.access_token ? (
                  <AccessLinkRow a={a} url={`${origin}/welcome/${l.access_token}`} />
                ) : (
                  <p className="mt-3 text-[11px] text-slate-600">{a.apLinkPending}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function GithubTable({ a, gh, fmt }) {
  return (
    <div className="overflow-x-auto" data-testid="admin-github-table">
      <table className="w-full text-sm">
        <thead>
          <tr className={headRow}>
            <th className={th}>{a.colName}</th>
            <th className={th}>{a.colUsername}</th>
            <th className={th}>{a.colRepos}</th>
            <th className={th}>{a.colStatus}</th>
            <th className={th}>{a.colDate}</th>
          </tr>
        </thead>
        <tbody>
          {gh.length === 0 && <EmptyRow span={5} text={a.empty} />}
          {gh.map((g) => (
            <tr key={g.github_id} className={bodyRow}>
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
  );
}
