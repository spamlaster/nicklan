import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const statuses = ['Planning', 'Building', 'Client Review', 'Changes Requested', 'Approved', 'Live', 'Archived'];
const feedbackStatuses = ['New', 'In Progress', 'Resolved'];
const fields = ['clientName','projectName','slug','clientEmail','clientPhone','previewUrl','productionUrl','repositoryUrl','notes','status'];
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export function createPortal({ database = ':memory:', passwordHash, origin = 'http://localhost:5173', secure = false } = {}) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash || '')) throw new Error('Set ADMIN_PASSWORD_HASH using npm run password:hash.');
  const db = new DatabaseSync(database);
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const attempts = new Map();
  const stamp = () => new Date().toISOString();
  const activity = (id, message) => db.prepare('INSERT INTO activity VALUES (?,?,?,?)').run(randomUUID(), id, message, stamp());
  const project = id => db.prepare('SELECT * FROM projects WHERE id=?').get(id) || fail(404, 'Project not found.');
  const transaction = fn => { db.exec('BEGIN'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  function validate(data) {
    const out = {};
    for (const key of fields) {
      if (typeof data[key] !== 'string') fail(400, `Invalid ${key}.`);
      out[key] = data[key].trim();
      if (out[key].length > (key === 'notes' ? 20000 : 2000)) fail(400, `${key} is too long.`);
    }
    if (!out.clientName || !out.projectName) fail(400, 'Client and project names are required.');
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(out.slug)) fail(400, 'Use a slug of 1–63 lowercase letters, numbers or internal hyphens.');
    if (!statuses.includes(out.status)) fail(400, 'Invalid project status.');
    if (out.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.clientEmail)) fail(400, 'Invalid client email.');
    for (const key of ['previewUrl','productionUrl','repositoryUrl']) {
      if (!out[key] && key !== 'previewUrl') continue;
      try { const url = new URL(out[key]); if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error(); } catch { fail(400, `Use a valid HTTP(S) ${key}.`); }
    }
    return out;
  }
  const server = createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    try {
      if (req.headers.origin && req.headers.origin !== origin) fail(403, 'Origin not allowed.');
      if (req.headers.origin === origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE'); res.writeHead(204); return res.end(); }
      if (req.method !== 'GET' && req.headers.origin !== origin) fail(403, 'A matching Origin header is required.');
      const path = new URL(req.url, 'http://localhost').pathname;
      const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('nl_session='))?.slice(11);
      const authenticated = cookie && db.prepare('SELECT * FROM sessions WHERE tokenHash=? AND expiresAt>?').get(hash(cookie), Date.now());
      async function body() {
        if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'JSON required.');
        let input = ''; for await (const chunk of req) { input += chunk; if (Buffer.byteLength(input) > 65536) fail(413, 'Request too large.'); }
        try { const parsed = JSON.parse(input); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed; } catch { fail(400, 'Invalid JSON.'); }
      }
      const setCookie = (value, age) => res.setHeader('Set-Cookie', `nl_session=${value}; HttpOnly; Path=/api; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`);
      if (path === '/api/session' && req.method === 'POST') {
        const key = req.socket.remoteAddress;
        const now = Date.now();
        for (const [ip, entry] of attempts) if (entry.until < now) attempts.delete(ip);
        const attempt = attempts.get(key) || { count: 0, until: now + 900000 };
        if (attempt.count >= 10) fail(429, 'Too many attempts. Try again in 15 minutes.');
        attempts.set(key, { ...attempt, count: attempt.count + 1 });
        const input = await body();
        if (typeof input.password !== 'string' || input.password.length > 1024) fail(400, 'Invalid password.');
        const [salt, expected] = passwordHash.split(':');
        if (!timingSafeEqual(scryptSync(input.password, salt, 64), Buffer.from(expected, 'hex'))) fail(401, 'Incorrect password.');
        attempts.delete(key);
        db.prepare('DELETE FROM sessions WHERE expiresAt<=?').run(now);
        const token = randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash(token), now + 28800000);
        setCookie(token, 28800); return send(200, { authenticated: true });
      }
      if (!authenticated) fail(401, 'Sign in to access the client portal.');
      if (path === '/api/session' && req.method === 'GET') return send(200, { authenticated: true });
      if (path === '/api/session' && req.method === 'DELETE') { db.prepare('DELETE FROM sessions WHERE tokenHash=?').run(hash(cookie)); setCookie('', 0); return send(200, { authenticated: false }); }
      if (path === '/api/projects' && req.method === 'GET') return send(200, db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC, id').all());
      if (path === '/api/projects' && req.method === 'POST') {
        const data = validate(await body()); const id = randomUUID(); const now = stamp();
        transaction(() => { db.prepare(`INSERT INTO projects VALUES (${Array(13).fill('?').join(',')})`).run(id, ...fields.map(key => data[key]), now, now); activity(id, `Project created · ${data.status}`); });
        return send(201, project(id));
      }
      const match = path.match(/^\/api\/projects\/([^/]+)(?:\/(feedback|activity)(?:\/([^/]+))?)?$/);
      if (!match) fail(404, 'Endpoint not found.');
      const [, id, section, feedbackId] = match; const existing = project(id);
      if (!section && req.method === 'GET') return send(200, { ...existing, feedback: db.prepare('SELECT * FROM feedback WHERE projectId=? ORDER BY createdAt DESC, id').all(id), activity: db.prepare('SELECT * FROM activity WHERE projectId=? ORDER BY createdAt DESC, rowid DESC').all(id) });
      if (!section && req.method === 'PUT') {
        const data = validate(await body());
        transaction(() => { db.prepare(`UPDATE projects SET ${fields.map(key => `${key}=?`).join(',')},updatedAt=? WHERE id=?`).run(...fields.map(key => data[key]), stamp(), id); activity(id, existing.status === data.status ? 'Project information updated' : `Status changed: ${existing.status} → ${data.status}`); });
        return send(200, project(id));
      }
      if (section === 'feedback' && !feedbackId && req.method === 'POST') {
        const data = await body();
        if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 200 || typeof data.message !== 'string' || !data.message.trim() || data.message.length > 10000) fail(400, 'Feedback needs a name and message within the allowed length.');
        const fid = randomUUID(); const now = stamp();
        transaction(() => { db.prepare('INSERT INTO feedback VALUES (?,?,?,?,?,?,?)').run(fid,id,data.name.trim(),data.message.trim(),'New',now,now); db.prepare('UPDATE projects SET updatedAt=? WHERE id=?').run(now,id); activity(id, `Feedback added by ${data.name.trim()}`); });
        return send(201, { id: fid });
      }
      if (section === 'feedback' && feedbackId && req.method === 'PUT') {
        const data = await body(); if (!feedbackStatuses.includes(data.status)) fail(400, 'Invalid feedback status.');
        const item = db.prepare('SELECT * FROM feedback WHERE id=? AND projectId=?').get(feedbackId,id); if (!item) fail(404, 'Feedback not found.');
        transaction(() => { const now = stamp(); db.prepare('UPDATE feedback SET status=?,updatedAt=? WHERE id=?').run(data.status,now,feedbackId); db.prepare('UPDATE projects SET updatedAt=? WHERE id=?').run(now,id); activity(id, `Feedback status: ${item.status} → ${data.status}`); });
        return send(200, { status: data.status });
      }
      fail(405, 'Method not allowed.');
    } catch (error) {
      if (error.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE') || error.message?.includes('UNIQUE constraint failed')) return send(409, { error: 'That slug is already in use.' });
      if (!error.status) console.error(error);
      send(error.status || 500, { error: error.status ? error.message : 'The server could not complete the request.' });
    }
  });
  server.on('close', () => db.close());
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const database = process.env.DATABASE_PATH || './server/data/portal.sqlite'; mkdirSync(dirname(database), { recursive: true });
  const origin = process.env.PORTAL_ORIGIN || 'http://localhost:5173';
  createPortal({ database, passwordHash: process.env.ADMIN_PASSWORD_HASH, origin, secure: origin.startsWith('https:') }).listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('Client portal API listening on loopback.'));
}
