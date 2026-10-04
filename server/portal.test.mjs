import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPortal, statuses } from './index.mjs';
const salt = 'a'.repeat(32);
const password = 'test-password-123';
const passwordHash = `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
test('authenticated project lifecycle, validation, feedback, history and persistence', async () => {
  const dir = mkdtempSync(join(tmpdir(),'nicklan-'));
  const database = join(dir,'portal.sqlite');
  let server = createPortal({database,passwordHash});
  async function start() { await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); return `http://127.0.0.1:${server.address().port}`; }
  let base = await start(); let cookie = '';
  async function request(path, method = 'GET', body, origin = 'http://localhost:5173') {
    const res = await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body ? JSON.stringify(body) : undefined});
    return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')};
  }
  try {
    assert.equal((await request('/projects')).status,401);
    assert.equal((await request('/session','POST',{password:'bad'})).status,401);
    assert.equal((await request('/session','POST',{password},'https://evil.example')).status,403);
    const login = await request('/session','POST',{password}); assert.equal(login.status,200); cookie = login.cookie.split(';')[0];
    assert.match(login.cookie,/HttpOnly/); assert.match(login.cookie,/SameSite=Strict/);
    const input = {clientName:"Joe's Plumbing",projectName:'Website Development',slug:'joesplumbing',clientEmail:'',clientPhone:'',previewUrl:'https://joesplumbing.nicklan.com',productionUrl:'',repositoryUrl:'',notes:'Private notes',status:'Planning'};
    assert.equal((await request('/projects','POST',{...input,previewUrl:'javascript:alert(1)'})).status,400);
    const created = await request('/projects','POST',input); assert.equal(created.status,201); const id = created.body.id;
    assert.equal((await request('/projects','POST',input)).status,409);
    for (const status of statuses) assert.equal((await request(`/projects/${id}`,'PUT',{...input,status})).status,200);
    const feedback = await request(`/projects/${id}/feedback`,'POST',{name:'Joe',message:'Please change the heading.'}); assert.equal(feedback.status,201);
    assert.equal((await request(`/projects/${id}/feedback/${feedback.body.id}`,'PUT',{status:'Resolved'})).status,200);
    assert.equal((await request(`/projects/${id}/feedback/${feedback.body.id}`,'PUT',{status:'Invalid'})).status,400);
    const detail = await request(`/projects/${id}`); assert.equal(detail.body.feedback[0].status,'Resolved'); assert.equal(detail.body.activity.length,10);
    await new Promise(resolve => server.close(resolve));
    server = createPortal({database,passwordHash}); base = await start();
    assert.equal((await request(`/projects/${id}`)).body.notes,'Private notes');
    assert.equal((await request('/session','DELETE')).status,200);
    assert.equal((await request(`/projects/${id}`)).status,401);
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir,{recursive:true,force:true}); }
});
test('login throttling and HTTPS cookies', async () => {
  const server = createPortal({passwordHash,origin:'https://nicklan.com',secure:true});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/session`;
  const login = password => fetch(url,{method:'POST',headers:{Origin:'https://nicklan.com','Content-Type':'application/json'},body:JSON.stringify({password})});
  try {
    const success = await login(password); assert.match(success.headers.get('set-cookie'),/; Secure/);
    for (let i=0;i<10;i++) assert.equal((await login('bad')).status,401);
    assert.equal((await login(password)).status,429);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
