import { Fragment } from 'react';
import { BadgeCheck, StickyNote, Download, Reply } from 'lucide-react';

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

function LeadRow({ a, lead, statusLabel, patchStatus, toggleNote, noteOpen, noteDraft, setNoteDraft, saveNote, fmt }) {
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
