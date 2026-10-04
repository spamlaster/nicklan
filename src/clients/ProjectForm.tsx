import { useState } from 'react';
import type { FormEvent } from 'react';
import { statuses, slugify } from './api';
import type { ProjectInput } from './api';
const empty: ProjectInput = { clientName: '', projectName: '', slug: '', clientEmail: '', clientPhone: '', previewUrl: '', productionUrl: '', repositoryUrl: '', notes: '', status: 'Planning' };
export default function ProjectForm({ initial, save, cancel, busy }: { initial?: ProjectInput; save: (data: ProjectInput) => Promise<void>; cancel: string; busy: boolean }) {
  const [data, setData] = useState<ProjectInput>(initial || empty);
  const [manualSlug, setManualSlug] = useState(!!initial);
  const [manualPreview, setManualPreview] = useState(!!initial);
  function change(key: keyof ProjectInput, value: string) {
    if (key === 'slug') setManualSlug(true);
    if (key === 'previewUrl') setManualPreview(true);
    setData(current => {
      const next = { ...current, [key]: value };
      let slug = current.slug;
      if ((key === 'clientName' || key === 'projectName') && !manualSlug) slug = slugify(key === 'clientName' ? value || current.projectName : current.clientName || value);
      if (key === 'slug') slug = value;
      next.slug = slug;
      if (!manualPreview) next.previewUrl = slug ? `https://${slug}.nicklan.com` : '';
      if (key === 'previewUrl') next.previewUrl = value;
      return next;
    });
  }
  function submit(event: FormEvent) { event.preventDefault(); void save(data); }
  return <form className="portal-panel portal-form" onSubmit={submit}>
    <div className="portal-grid">
      {([['clientName','Client Name','text',true],['projectName','Project Name','text',true],['slug','Slug','text',true],['previewUrl','Preview URL','url',true],['clientEmail','Client Email','email',false],['clientPhone','Client Phone','tel',false],['productionUrl','Production URL','url',false],['repositoryUrl','GitHub Repository URL','url',false]] as const).map(([key,label,type,required]) => <label key={key}>{label}{!required && <small> Optional</small>}<input name={key} type={type} required={required} value={data[key]} maxLength={key === 'slug' ? 63 : 2000} pattern={key === 'slug' ? '[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?' : undefined} onChange={e => change(key,e.target.value)} /></label>)}
      <label>Status<select value={data.status} onChange={e => change('status', e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
    </div>
    <p className="portal-muted">Saving a preview URL records its address. Deploy the client site and configure DNS and HTTPS on your VPS separately.</p>
    <label>Development Notes <small>Optional</small><textarea rows={6} maxLength={20000} value={data.notes} onChange={e => change('notes',e.target.value)} /></label>
    <div className="portal-actions"><button className="portal-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Project'}</button><a href={cancel}>Cancel</a></div>
  </form>;
}
