import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, date, statuses, feedbackStatuses } from './api';
import type { Project, ProjectInput, Detail } from './api';
import ProjectForm from './ProjectForm';
import './clients.css';
const base = '#/clients';
function Link({ url }: { url: string }) { return url ? <a href={url} target="_blank" rel="noopener noreferrer">{url} ↗</a> : <span className="portal-muted">Not configured</span>; }
export default function ClientPortal({ route }: { route: string }) {
  const [auth, setAuth] = useState<'loading'|'in'|'out'|'unavailable'>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Active');
  const parts = route.replace(/^#\/clients\/?/, '').split('/');
  const id = parts[0] && parts[0] !== 'new' ? parts[0] : '';
  const editing = parts[0] === 'new' || parts[1] === 'edit';
  const handleError = useCallback((err: unknown) => { setError(err instanceof Error ? err.message : 'Request failed.'); if (err instanceof ApiError && err.status === 401) { setAuth('out'); setDetail(null); setProjects([]); } }, []);
  const load = useCallback(async () => {
    setLoading(true); setDetail(null);
    try { if (id) setDetail(await api<Detail>(`/projects/${id}`)); else setProjects(await api<Project[]>('/projects')); }
    catch (err) { handleError(err); }
    finally { setLoading(false); }
  }, [id, handleError]);
  const checkSession = useCallback(async () => {
    setAuth('loading'); setError('');
    try { await api('/session'); setAuth('in'); } catch (err) { if (err instanceof ApiError && err.status === 401) setAuth('out'); else { handleError(err); setAuth('unavailable'); } }
  }, [handleError]);
  useEffect(() => {
    let active = true;
    api('/session').then(() => { if (active) setAuth('in'); }).catch(err => {
      if (!active) return;
      if (err instanceof ApiError && err.status === 401) setAuth('out');
      else { handleError(err); setAuth('unavailable'); }
    });
    return () => { active = false; };
  }, [handleError]);
  useEffect(() => {
    if (auth !== 'in') return;
    let active = true;
    const request = id ? api<Detail>(`/projects/${id}`) : api<Project[]>('/projects');
    request.then(result => { if (active) { if (id) setDetail(result as Detail); else setProjects(result as Project[]); } }).catch(err => { if (active) handleError(err); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth, id, handleError]);
  useEffect(() => { document.title = 'Client Projects | Nick Lancaster'; }, []);
  async function mutate(action: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await action(); } catch (err) { handleError(err); } finally { setBusy(false); } }
  async function save(data: ProjectInput) { await mutate(async () => { const saved = await api<Project>(id ? `/projects/${id}` : '/projects', id ? 'PUT' : 'POST', data); window.location.hash = `/clients/${saved.id}`; }); }
  async function updateStatus(project: Project, status: string) { await mutate(async () => { await api(`/projects/${project.id}`, 'PUT', { ...project, status }); await load(); setNotice('Project status updated.'); }); }
  async function copy(url: string) { try { await navigator.clipboard.writeText(url); setNotice('Preview URL copied.'); } catch { setError('Could not copy automatically. Select and copy the preview URL shown on this page.'); } }
  const filtered = projects.filter(p => (filter === 'All' || (filter === 'Active' ? p.status !== 'Archived' : p.status === filter)) && `${p.clientName} ${p.projectName} ${p.slug}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="client-portal">
    <div className="portal-topline"><a href="#/">← Nick’s World</a>{auth === 'in' && <button disabled={busy} onClick={() => void mutate(async () => { await api('/session','DELETE'); setProjects([]); setDetail(null); setAuth('out'); })}>Sign out</button>}</div>
    <p className="destination-eyebrow">NICKLAN · CLIENT WORKSPACE</p>
    <div className="portal-heading"><div><h1>{auth !== 'in' ? 'Client Portal' : editing ? id ? 'Edit Project' : 'New Client Project' : id ? detail?.clientName || 'Project' : 'Client Projects'}</h1><p className="portal-muted">{auth !== 'in' ? 'Sign in to manage website projects and client previews.' : id && detail ? detail.projectName : 'From the first idea to the final launch.'}</p></div>{auth === 'in' && !id && !editing && <a className="portal-primary" href={`${base}/new`}>+ New Client Project</a>}</div>
    {error && <p className="portal-error" role="alert">{error}</p>}{notice && <p className="portal-notice" role="status">{notice}</p>}
    {auth === 'loading' && <p role="status">Checking session…</p>}
    {auth === 'unavailable' && <div className="portal-panel"><p>The portal needs a running API server to sign in and save projects.</p><button onClick={() => void checkSession()}>Retry connection</button></div>}
    {auth === 'out' && <form className="portal-panel portal-login" onSubmit={e => { e.preventDefault(); const password = String(new FormData(e.currentTarget).get('password')); void mutate(async () => { await api('/session','POST',{password}); setAuth('in'); }); }}><label>Admin password<input type="password" name="password" required autoComplete="current-password" maxLength={1024} /></label><button className="portal-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>}
    {auth === 'in' && <>
      {(id || editing) && <a className="portal-back" href={base}>← All projects</a>}
      {loading && <p role="status">Loading projects…</p>}
      {!loading && editing && (!id || detail) && <ProjectForm key={route} initial={detail || undefined} busy={busy} save={save} cancel={id ? `${base}/${id}` : base} />}
      {!loading && !editing && !id && <>
        <div className="portal-stats">{[['Active Projects',projects.filter(p => p.status !== 'Archived').length],['Awaiting Review',projects.filter(p => p.status === 'Client Review').length],['Live Websites',projects.filter(p => p.status === 'Live').length]].map(([label,count]) => <div className="portal-panel" key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
        <div className="portal-toolbar"><label>Search projects<input type="search" placeholder="Client, project or slug…" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Status<select value={filter} onChange={e => setFilter(e.target.value)}>{['Active','All',...statuses].map(s => <option key={s}>{s}</option>)}</select></label></div>
        <div className="portal-projects">{filtered.map(p => <article className="portal-panel" key={p.id}><div className="portal-card-title"><h2><a href={`${base}/${p.id}`}>{p.clientName}</a></h2><span className="portal-badge">{p.status}</span></div><p>{p.projectName}</p><dl><dt>Preview</dt><dd><Link url={p.previewUrl} /></dd><dt>Production</dt><dd><Link url={p.productionUrl} /></dd><dt>Last updated</dt><dd>{date(p.updatedAt)}</dd>{(p.clientEmail || p.clientPhone) && <><dt>Contact</dt><dd>{[p.clientEmail,p.clientPhone].filter(Boolean).join(' · ')}</dd></>}</dl><div className="portal-actions"><a href={`${base}/${p.id}`}>View Project</a><a href={p.previewUrl} target="_blank" rel="noopener noreferrer">Open Preview ↗</a><button onClick={() => void copy(p.previewUrl)}>Copy URL</button><a href={`${base}/${p.id}/edit`}>Edit</a>{p.status !== 'Archived' && <button disabled={busy} onClick={() => void updateStatus(p,'Archived')}>Archive</button>}</div></article>)}</div>
        {filtered.length === 0 && <div className="portal-panel portal-empty"><h2>{projects.length ? 'No matching projects' : 'Your next project starts here'}</h2><p>{projects.length ? 'Try another search or status filter.' : 'Create a client project to keep previews, feedback and development notes together.'}</p>{!projects.length && <a href={`${base}/new`}>Create your first project →</a>}</div>}
      </>}
      {!loading && !editing && detail && <>
        <div className="portal-actions portal-detail-actions"><a className="portal-primary" href={detail.previewUrl} target="_blank" rel="noopener noreferrer">Open Preview ↗</a><button onClick={() => void copy(detail.previewUrl)}>Copy Preview Link</button><a href={`${base}/${id}/edit`}>Edit Project</a><label>Change Status<select disabled={busy} value={detail.status} onChange={e => void updateStatus(detail,e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label></div>
        <div className="portal-grid"><section className="portal-panel"><h2>Project Information</h2><dl><dt>Client</dt><dd>{detail.clientName}</dd><dt>Project</dt><dd>{detail.projectName}</dd><dt>Status</dt><dd><span className="portal-badge">{detail.status}</span></dd><dt>Contact</dt><dd>{[detail.clientEmail,detail.clientPhone].filter(Boolean).join(' · ') || 'Not provided'}</dd><dt>Last updated</dt><dd>{date(detail.updatedAt)}</dd></dl></section><section className="portal-panel"><h2>Preview Environment</h2><Link url={detail.previewUrl} /><p className="portal-muted">Slug: {detail.slug}</p><p className="portal-muted">Independently deployed client website. DNS, hosting and HTTPS are managed on your VPS.</p></section><section className="portal-panel"><h2>Production Environment</h2><Link url={detail.productionUrl} /><h3>Repository</h3><Link url={detail.repositoryUrl} /></section><section className="portal-panel"><h2>Development Notes</h2><p className="portal-prewrap">{detail.notes || 'No development notes yet.'}</p></section></div>
        <section className="portal-panel"><h2>Client Feedback</h2><p className="portal-muted">Record feedback received from your client.</p><form className="portal-form" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); void mutate(async () => { await api(`/projects/${id}/feedback`,'POST',{name:data.get('name'),message:data.get('message')}); form.reset(); await load(); setNotice('Feedback added.'); }); }}><label>Name<input name="name" required maxLength={200} /></label><label>Message<textarea name="message" required maxLength={10000} rows={3} /></label><button className="portal-primary" disabled={busy}>Add Feedback</button></form>{detail.feedback.map(item => <article className="portal-feedback" key={item.id}><div className="portal-card-title"><strong>{item.name}</strong><label>Feedback status<select disabled={busy} value={item.status} onChange={e => void mutate(async () => { await api(`/projects/${id}/feedback/${item.id}`,'PUT',{status:e.target.value}); await load(); })}>{feedbackStatuses.map(s => <option key={s}>{s}</option>)}</select></label></div><p className="portal-prewrap">{item.message}</p><small className="portal-muted">{date(item.createdAt)}</small></article>)}{!detail.feedback.length && <p className="portal-muted">No feedback yet.</p>}</section>
        <section className="portal-panel"><h2>Activity / Status History</h2><ol className="portal-history">{detail.activity.map(item => <li key={item.id}><span>{item.message}</span><time dateTime={item.createdAt}>{date(item.createdAt)}</time></li>)}</ol></section>
      </>}
    </>}
  </div>;
}
