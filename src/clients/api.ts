export const statuses = ['Planning', 'Building', 'Client Review', 'Changes Requested', 'Approved', 'Live', 'Archived'] as const;
export const feedbackStatuses = ['New', 'In Progress', 'Resolved'] as const;
export type Project = {
  id: string; clientName: string; projectName: string; slug: string; clientEmail: string;
  clientPhone: string; previewUrl: string; productionUrl: string; repositoryUrl: string;
  notes: string; status: typeof statuses[number]; createdAt: string; updatedAt: string;
};
export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type Detail = Project & {
  feedback: { id: string; name: string; message: string; status: typeof feedbackStatuses[number]; createdAt: string }[];
  activity: { id: string; message: string; createdAt: string }[];
};
export class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`${import.meta.env.VITE_PORTAL_API_BASE || ''}/api${path}`, { method, credentials: 'include', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined }); }
  catch { throw new Error('Cannot reach the portal API. Check that the server is running.'); }
  let result;
  try { result = await response.json(); } catch { throw new Error('The portal API is not configured at this address.'); }
  if (!response.ok) throw new ApiError(result.error || 'Request failed.', response.status);
  return result;
}
export function slugify(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 63); }
export const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
