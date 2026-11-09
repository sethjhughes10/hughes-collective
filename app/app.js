// Hughes Collective workspace — private, invite-only.
import { sb, esc, safeUrl, safeColor, toast } from '../assets/common.js';

const CHANNELS = [['collective', '#collective'], ['website', '#website'], ['training', '#training'], ['business-setup', '#business-setup']];
const STATUSES = ['Planning', 'In progress', 'In review', 'On hold', 'Done'];
const S = { session: null, me: null, isAdmin: false, people: [], channel: 'collective', chatSub: null, recovering: false };
const $app = document.getElementById('app');
const appUrl = () => location.origin + location.pathname;

// ---------- icons (decorative)
const I = {
  today: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  projects: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="10" rx="1.5"/>',
  messages: '<path d="M4 5h16v11H9l-5 4z"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.3 0 4 1.5 4.5 4"/>',
  meetings: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  files: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>',
  admin: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const icon = (k, s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

// ---------- helpers
const person = (slug) => S.people.find((p) => p.slug === slug);
const firstName = (slug) => person(slug)?.first_name || 'Someone';
const avatar = (slug, cls = '') => { const p = person(slug); return `<span class="avatar ${cls}" style="background:${safeColor(p?.color)}" aria-hidden="true">${esc(p?.initials || '?')}</span>`; };
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
const fmtWhen = (ts) => new Date(ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtTime = (ts) => { const d = new Date(ts); const today = new Date().toDateString() === d.toDateString(); return today ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
const peopleOptions = (sel = '', blank = true) => (blank ? '<option value="">No one yet</option>' : '') + S.people.map((p) => `<option value="${esc(p.slug)}" ${p.slug === sel ? 'selected' : ''}>${esc(p.first_name)}</option>`).join('');
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
function fail(error, what = 'That didn’t save') { console.error(error); toast(`${what}. ${error?.message || 'Please try again.'}`, 5000); }

// ---------- auth screens
function renderAuth(mode = 'signin', note = '') {
  stopChat();
  const titles = { signin: 'Sign in', signup: 'Create your account', forgot: 'Reset your password', recover: 'Choose a new password' };
  $app.innerHTML = `<main class="auth"><div class="card">
    <a class="brand" href="../"><span class="brand-mark" aria-hidden="true">HC</span><span class="brand-name">Hughes Collective</span></a>
    <h1 class="display" style="font-size:28px">${titles[mode]}</h1>
    ${mode === 'signup' ? '<p class="muted">The workspace is invite-only. Use the email address you were invited with.</p>' : ''}
    ${note}
    <form id="auth-form" class="stack" novalidate>
      ${mode !== 'recover' ? '<label class="field">Email<input name="email" type="email" autocomplete="email" required></label>' : ''}
      ${mode !== 'forgot' ? `<label class="field">${mode === 'signin' ? 'Password' : 'New password'}<input name="password" type="password" minlength="8" autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" required>${mode !== 'signin' ? '<span class="hint">At least 8 characters.</span>' : ''}</label>` : ''}
      <div id="auth-msg" role="status"></div>
      <button class="btn btn-primary" type="submit">${{ signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', recover: 'Save new password' }[mode]}</button>
    </form>
    <div class="stack" style="gap:4px; font-size:15px">
      ${mode === 'signin' ? '<a href="#" data-mode="signup">First time here? Create your account</a><a href="#" data-mode="forgot">Forgot your password?</a>' : ''}
      ${mode === 'signup' || mode === 'forgot' ? '<a href="#" data-mode="signin">Back to sign in</a>' : ''}
      <a href="../">Back to the public website</a>
    </div>
  </div></main>`;
  $app.querySelectorAll('[data-mode]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); renderAuth(a.dataset.mode); }));
  const form = document.getElementById('auth-form');
  const msg = document.getElementById('auth-msg');
  const say = (t, kind = 'err') => { msg.innerHTML = `<div class="notice ${kind}">${esc(t)}</div>`; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = String(form.email?.value || '').trim().toLowerCase();
    const password = String(form.password?.value || '');
    const btn = form.querySelector('button'); btn.disabled = true;
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) say(error.message.includes('Email not confirmed') ? 'Please confirm your email first. Check your inbox for the link.' : 'That email and password didn’t match.');
      } else if (mode === 'signup') {
        if (password.length < 8) { say('Please use at least 8 characters.'); return; }
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
        if (error) say(/invited|Database error/i.test(error.message) ? 'That email isn’t on the invite list yet. Ask the workspace admin to add it, then try again.' : error.message);
        else if (!data.session) renderAuth('signin', '<div class="notice ok">Almost done. Check your email for a confirmation link, then sign in.</div>');
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
        if (error) say(error.message); else say('If that email has an account, a reset link is on its way.', 'ok');
      } else if (mode === 'recover') {
        if (password.length < 8) { say('Please use at least 8 characters.'); return; }
        const { error } = await sb.auth.updateUser({ password });
        if (error) say(error.message); else { S.recovering = false; toast('Password updated.'); enter(); }
      }
    } finally { btn.disabled = false; }
  });
}

// ---------- session
async function enter() {
  const { data: { session } } = await sb.auth.getSession();
  S.session = session;
  if (!session) return renderAuth('signin');
  const [{ data: people, error: pe }, { data: invite }] = await Promise.all([
    sb.from('profiles').select('*').order('sort'),
    sb.from('allowlist').select('profile_slug, is_admin').eq('email', (session.user.email || '').toLowerCase()).maybeSingle(),
  ]);
  if (pe) { fail(pe, 'Couldn’t load the workspace'); }
  S.people = people || [];
  S.me = S.people.find((p) => p.user_id === session.user.id) || null;
  S.isAdmin = !!invite?.is_admin;
  if (!S.me) {
    $app.innerHTML = `<main class="auth"><div class="card stack">
      <h1 class="display" style="font-size:26px">You’re signed in, but not linked to a profile</h1>
      <p class="muted">Your email (${esc(session.user.email)}) isn’t connected to a team profile. Ask the workspace admin to check the invite list.</p>
      <button class="btn btn-outline" id="so">Sign out</button></div></main>`;
    document.getElementById('so').onclick = () => sb.auth.signOut();
    return;
  }
  route();
}

// ---------- shell
const NAV = [
  ['today', 'Today'], ['projects', 'Projects'], ['messages', 'Messages'], ['meetings', 'Meetings'],
  ['files', 'Shared links'], ['team', 'Team'], ['profile', 'My profile'],
];
function shell(active, inner, inquiriesCount = 0) {
  const nav = NAV.concat(S.isAdmin ? [['admin', 'Admin']] : []);
  const link = ([k, label]) => `<a class="nav-link" href="#${k}" ${active === k ? 'aria-current="page"' : ''}>${icon(k === 'files' ? 'files' : k, 18)}${label}${k === 'admin' && inquiriesCount ? `<span class="badge">${inquiriesCount}</span>` : ''}</a>`;
  const bottom = [['today', 'Today'], ['projects', 'Projects'], ['messages', 'Messages'], ['team', 'Team'], ['more', 'More']];
  const moreActive = ['meetings', 'files', 'profile', 'admin', 'more'].includes(active);
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Workspace">
      <a class="brand" href="../"><span class="brand-mark" aria-hidden="true">HC</span><span style="display:flex;flex-direction:column"><span class="brand-name" style="font-size:17px">Hughes Collective</span><span style="font-size:12px;color:#B4C2BE">Team workspace</span></span></a>
      <nav class="side-nav" aria-label="Sections">${nav.map(link).join('')}</nav>
      <div class="me-box">${avatar(S.me.slug)}<span style="display:flex;flex-direction:column;font-size:14px;min-width:0"><strong style="font-weight:600">${esc(S.me.first_name)}</strong><span style="font-size:12px;color:#B4C2BE">${S.isAdmin ? 'Admin' : 'Member'}</span></span><button type="button" data-signout>Sign out</button></div>
    </aside>
    <main class="main" id="main">${inner}</main>
    <nav class="bottom-nav" aria-label="Sections">${bottom.map(([k, l]) => `<a href="#${k}" ${(k === active || (k === 'more' && moreActive)) ? 'aria-current="page"' : ''}>${icon(k, 22)}${l}</a>`).join('')}</nav>
  </div>`;
}
const STALE = { stale: true };
window.addEventListener('unhandledrejection', (e) => { if (e.reason === STALE) e.preventDefault(); });
const VIEW_KEYS = ['today', 'projects', 'project', 'messages', 'meetings', 'files', 'team', 'profile', 'admin', 'more'];
function mount(active, inner, extra) {
  // Ignore a slow screen that finished loading after the person already moved on.
  let cur = (location.hash.replace('#', '') || 'today').split('/')[0];
  if (!VIEW_KEYS.includes(cur)) cur = 'today';
  if (cur === 'project') cur = 'projects';
  if (cur !== active) throw STALE;
  $app.innerHTML = shell(active, inner, extra);
  $app.querySelectorAll('[data-signout]').forEach((b) => b.addEventListener('click', () => sb.auth.signOut()));
  window.scrollTo(0, 0);
}

// ---------- router
function route() {
  if (!S.me) return;
  const [view, arg] = (location.hash.replace('#', '') || 'today').split('/');
  if (view !== 'messages') stopChat();
  const views = { today, projects, project, messages, meetings, files, team, profile, admin, more };
  Promise.resolve().then(() => (views[view] || today)(arg)).catch((e) => { if (e !== STALE) console.error(e); });
}
window.addEventListener('hashchange', route);

// ---------- Today
async function today() {
  mount('today', `<div class="page-head"><div><p class="muted" style="font-size:14px">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Welcome back, ${esc(S.me.first_name)}</h1></div><a class="btn btn-primary btn-sm" href="#projects">+ New project</a></div><div class="skeleton" style="height:320px"></div>`);
  const nowIso = new Date().toISOString();
  const [tasksR, meetR, msgR, projR, inqR] = await Promise.all([
    sb.from('tasks').select('id,title,done,due_date,project_id,projects(title)').eq('assignee_slug', S.me.slug).eq('done', false).order('due_date', { ascending: true, nullsFirst: false }).limit(8),
    sb.from('meetings').select('*').gte('starts_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()).order('starts_at').limit(1),
    sb.from('messages').select('*').order('created_at', { ascending: false }).limit(4),
    sb.from('projects').select('id,title,status,lead_slug,next_step').neq('status', 'Done').order('created_at', { ascending: false }).limit(4),
    sb.from('inquiries').select('id', { count: 'exact', head: true }).eq('handled', false),
  ]);
  const tasks = tasksR.data || []; const m = meetR.data?.[0]; const msgs = msgR.data || []; const projs = projR.data || [];
  const inq = inqR.count || 0;
  const meetingHtml = m ? `<section class="meeting-card"><p class="eyebrow">Next meeting</p><h2 class="display" style="font-size:22px">${esc(m.title)}</h2><p style="color:#DCE5E2">${esc(fmtWhen(m.starts_at))} · ${m.duration_minutes} min</p>${m.agenda ? `<p style="color:#DCE5E2; white-space:pre-line; font-size:14px">${esc(m.agenda)}</p>` : ''}${safeUrl(m.link) ? `<a class="btn" style="background:var(--accent-light);color:var(--ink)" href="${esc(safeUrl(m.link))}" target="_blank" rel="noopener">Join call</a>` : ''}</section>`
    : `<section class="card"><div class="card-head"><h2>Next meeting</h2></div><p class="empty">Nothing scheduled.</p><a class="btn btn-ghost btn-sm" href="#meetings">Schedule one</a></section>`;
  mount('today', `
    <div class="page-head"><div><p class="muted" style="font-size:14px">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Welcome back, ${esc(S.me.first_name)}</h1></div><a class="btn btn-primary btn-sm" href="#projects">+ New project</a></div>
    <div class="notice ok" role="note">This workspace is for business planning and shared projects. Keep client records and any protected health information in each clinician’s own HIPAA-compliant system.</div>
    ${S.isAdmin && inq ? `<a class="notice" href="#admin" style="text-decoration:none">You have ${inq} new website ${inq === 1 ? 'inquiry' : 'inquiries'}. Review them in Admin.</a>` : ''}
    <div class="cols">
      <div class="wide">
        <section class="card"><div class="card-head"><h2>My open tasks</h2><a href="#projects" style="font-size:14px;font-weight:600;padding:10px 0">All projects</a></div>
          ${tasks.length ? tasks.map(taskRow).join('') : '<p class="empty">No open tasks assigned to you.</p>'}</section>
        <section><div class="card-head"><h2 style="font-size:18px;font-weight:600">Active projects</h2></div>
          <div class="project-grid">${projs.length ? projs.map(projectCard).join('') : '<div class="card" style="flex:1"><p class="empty">No projects yet. Start one from Projects.</p></div>'}</div></section>
      </div>
      <div class="narrow">
        ${meetingHtml}
        <section class="card"><div class="card-head"><h2>Latest messages</h2><a href="#messages" style="font-size:14px;font-weight:600;padding:10px 0">Open</a></div>
          ${msgs.length ? msgs.map((x) => `<div class="list-row">${avatar(x.author_slug)}<div class="grow"><div style="font-size:14px"><strong>${esc(firstName(x.author_slug))}</strong> <span class="meta">#${esc(x.channel)} · ${esc(fmtTime(x.created_at))}</span></div><div style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.body)}</div></div></div>`).join('') : '<p class="empty">No messages yet.</p>'}
        </section>
      </div>
    </div>`, inq);
  bindTaskToggles(today);
}

function taskRow(t) {
  return `<label class="list-row" style="cursor:pointer"><input type="checkbox" data-task="${esc(t.id)}" ${t.done ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent);flex:none">
    <span class="grow"><span class="${t.done ? 'done-text' : ''}" style="font-size:15px">${esc(t.title)}</span><br><span class="meta">${t.projects?.title ? esc(t.projects.title) : 'No project'}${t.due_date ? ' · Due ' + esc(fmtDate(t.due_date)) : ''}${t.assignee_slug && t.assignee_slug !== S.me.slug ? ' · ' + esc(firstName(t.assignee_slug)) : ''}</span></span></label>`;
}
function bindTaskToggles(after) {
  $app.querySelectorAll('[data-task]').forEach((cb) => cb.addEventListener('change', async () => {
    const { error } = await sb.from('tasks').update({ done: cb.checked }).eq('id', cb.dataset.task);
    if (error) { cb.checked = !cb.checked; return fail(error); }
    if (cb.checked) toast('Task done.');
    if (after) setTimeout(() => after(location.hash.split('/')[1]), 500);
  }));
}
function projectCard(p) {
  return `<a class="project-card" href="#project/${esc(p.id)}" style="text-decoration:none"><span class="status" data-s="${esc(p.status)}">${esc(p.status)}</span><strong style="font-size:17px">${esc(p.title)}</strong>${p.next_step ? `<span class="muted" style="font-size:14px">Next: ${esc(p.next_step)}</span>` : ''}<span class="meta" style="font-size:13px;color:var(--muted)">${p.lead_slug ? 'Lead: ' + esc(firstName(p.lead_slug)) : 'No lead yet'}</span></a>`;
}

// ---------- Projects
async function projects() {
  const { data, error } = await sb.from('projects').select('id,title,status,lead_slug,next_step').order('created_at', { ascending: false });
  if (error) fail(error, 'Couldn’t load projects');
  const list = data || [];
  const active = list.filter((p) => p.status !== 'Done'); const done = list.filter((p) => p.status === 'Done');
  mount('projects', `
    <div class="page-head"><h1>Projects</h1></div>
    <form id="new-project" class="card stack">
      <h2 style="font-size:18px">Start a project</h2>
      <div class="row"><label class="field">Project name<input name="title" required maxlength="160"></label>
      <label class="field">Lead<select name="lead">${peopleOptions(S.me.slug)}</select></label></div>
      <label class="field">First next step (optional)<input name="next_step" maxlength="300"></label>
      <button class="btn btn-primary" style="align-self:flex-start">Create project</button>
    </form>
    <section><h2 style="font-size:18px;font-weight:600;margin-bottom:12px">Active</h2><div class="project-grid">${active.length ? active.map(projectCard).join('') : '<p class="empty">No active projects.</p>'}</div></section>
    ${done.length ? `<section><h2 style="font-size:18px;font-weight:600;margin-bottom:12px">Done</h2><div class="project-grid">${done.map(projectCard).join('')}</div></section>` : ''}`);
  document.getElementById('new-project').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    const title = f.title.value.trim(); if (!title) return toast('Give the project a name.');
    const { data: row, error: err } = await sb.from('projects').insert({ title, lead_slug: f.lead.value || null, next_step: f.next_step.value.trim() }).select('id').single();
    if (err) return fail(err);
    location.hash = 'project/' + row.id;
  });
}

async function project(id) {
  const [{ data: p, error }, { data: tasks }] = await Promise.all([
    sb.from('projects').select('*').eq('id', id).maybeSingle(),
    sb.from('tasks').select('id,title,done,due_date,assignee_slug,project_id').eq('project_id', id).order('done').order('due_date', { nullsFirst: false }),
  ]);
  if (error || !p) { mount('projects', '<p class="empty">That project couldn’t be found.</p><a href="#projects">Back to projects</a>'); return; }
  const t = tasks || [];
  mount('projects', `
    <a href="#projects" style="font-size:14px;font-weight:600;padding:8px 0">← All projects</a>
    <div class="page-head"><h1>${esc(p.title)}</h1><span class="status" data-s="${esc(p.status)}">${esc(p.status)}</span></div>
    <div class="cols">
      <div class="wide">
        <section class="card"><div class="card-head"><h2>Tasks</h2><span class="meta">${t.filter((x) => x.done).length} of ${t.length} done</span></div>
          ${t.length ? t.map((x) => taskRow({ ...x, projects: null })).join('') : '<p class="empty">No tasks yet.</p>'}
          <form id="new-task" class="stack" style="border-top:1px solid #EDF0EE;padding-top:16px;margin-top:8px">
            <label class="field">New task<input name="title" required maxlength="300" placeholder="What needs doing?"></label>
            <div class="row"><label class="field">Who<select name="who">${peopleOptions(S.me.slug)}</select></label><label class="field">Due (optional)<input name="due" type="date"></label></div>
            <button class="btn btn-primary btn-sm" style="align-self:flex-start">Add task</button>
          </form>
        </section>
      </div>
      <div class="narrow">
        <form id="edit-project" class="card stack">
          <h2 style="font-size:18px">Details</h2>
          <label class="field">Name<input name="title" value="${esc(p.title)}" required maxlength="160"></label>
          <label class="field">Status<select name="status">${STATUSES.map((s) => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label class="field">Lead<select name="lead">${peopleOptions(p.lead_slug)}</select></label>
          <label class="field">Next step<input name="next_step" value="${esc(p.next_step)}" maxlength="300"></label>
          <label class="field">Notes<textarea name="description" rows="5" maxlength="4000">${esc(p.description)}</textarea></label>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start">Save changes</button>
        </form>
        <button class="btn btn-danger btn-sm" id="del-project" style="align-self:flex-start">Delete project</button>
      </div>
    </div>`);
  bindTaskToggles(project);
  document.getElementById('new-task').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const title = f.title.value.trim(); if (!title) return;
    const { error: err } = await sb.from('tasks').insert({ project_id: id, title, assignee_slug: f.who.value || null, due_date: f.due.value || null });
    if (err) return fail(err); project(id);
  });
  document.getElementById('edit-project').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    const { error: err } = await sb.from('projects').update({ title: f.title.value.trim(), status: f.status.value, lead_slug: f.lead.value || null, next_step: f.next_step.value.trim(), description: f.description.value }).eq('id', id);
    if (err) return fail(err); toast('Saved.'); project(id);
  });
  const del = document.getElementById('del-project'); let armed = false;
  del.addEventListener('click', async () => {
    if (!armed) { armed = true; del.textContent = 'Tap again to delete project and its tasks'; setTimeout(() => { armed = false; del.textContent = 'Delete project'; }, 4000); return; }
    const { error: err } = await sb.from('projects').delete().eq('id', id);
    if (err) return fail(err); toast('Project deleted.'); location.hash = 'projects';
  });
}

// ---------- Messages (live)
function stopChat() { if (S.chatSub) { sb.removeChannel(S.chatSub); S.chatSub = null; } }
function msgHtml(m) {
  const mine = m.author_slug === S.me.slug;
  return `<div class="msg ${mine ? 'mine' : ''}" data-id="${esc(m.id)}">${mine ? '' : avatar(m.author_slug, '')}<div><div class="who">${mine ? 'You' : esc(firstName(m.author_slug))} <span class="meta" style="font-weight:400">· ${esc(fmtTime(m.created_at))}</span></div><div class="bubble">${esc(m.body)}</div></div></div>`;
}
async function messages(ch) {
  if (ch && CHANNELS.some(([k]) => k === ch)) S.channel = ch;
  const c = S.channel;
  stopChat();
  const { data, error } = await sb.from('messages').select('*').eq('channel', c).order('created_at', { ascending: false }).limit(100);
  if (error) fail(error, 'Couldn’t load messages');
  const rows = (data || []).reverse();
  mount('messages', `
    <div class="page-head"><h1>Messages</h1></div>
    <div class="channel-tabs" role="group" aria-label="Channels">${CHANNELS.map(([k, l]) => `<button type="button" data-ch="${k}" aria-pressed="${k === c}">${l}</button>`).join('')}</div>
    <section class="card stack">
      <div class="chat" id="chat" aria-live="polite">${rows.length ? rows.map(msgHtml).join('') : '<p class="empty" id="chat-empty">No messages in this channel yet. Say hello.</p>'}</div>
      <form class="composer" id="composer"><label class="sr-only" for="msg-input">Message</label><input id="msg-input" maxlength="4000" placeholder="Message ${esc(CHANNELS.find(([k]) => k === c)[1])}" autocomplete="off"><button class="icon-btn" style="background:var(--accent);color:#fff;border:0;width:48px;height:48px" aria-label="Send message">${icon('send')}</button></form>
    </section>`);
  const chat = document.getElementById('chat'); chat.scrollTop = chat.scrollHeight;
  $app.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => { location.hash = 'messages/' + b.dataset.ch; }));
  const seen = new Set(rows.map((r) => String(r.id)));
  const append = (m) => {
    if (seen.has(String(m.id))) return; seen.add(String(m.id));
    document.getElementById('chat-empty')?.remove();
    chat.insertAdjacentHTML('beforeend', msgHtml(m)); chat.scrollTop = chat.scrollHeight;
  };
  S.chatSub = sb.channel('chat-' + c)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${c}` }, (payload) => append(payload.new))
    .subscribe();
  document.getElementById('composer').addEventListener('submit', async (e) => {
    e.preventDefault(); const input = document.getElementById('msg-input'); const body = input.value.trim(); if (!body) return;
    input.value = '';
    const { data: row, error: err } = await sb.from('messages').insert({ channel: c, body, author_slug: S.me.slug }).select('*').single();
    if (err) { input.value = body; return fail(err, 'Message not sent'); }
    append(row);
  });
}

// ---------- Meetings
async function meetings() {
  const { data, error } = await sb.from('meetings').select('*').gte('starts_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()).order('starts_at').limit(30);
  if (error) fail(error, 'Couldn’t load meetings');
  const list = data || [];
  mount('meetings', `
    <div class="page-head"><h1>Meetings</h1></div>
    <div class="cols">
      <div class="wide"><section class="card"><div class="card-head"><h2>Upcoming</h2></div>
        ${list.length ? list.map((m) => `<div class="list-row"><span class="avatar" style="background:var(--ink)" aria-hidden="true">${icon('meetings', 18)}</span><div class="grow"><strong>${esc(m.title)}</strong><div class="meta">${esc(fmtWhen(m.starts_at))} · ${m.duration_minutes} min</div>${m.agenda ? `<div style="font-size:14px;white-space:pre-line;margin-top:4px">${esc(m.agenda)}</div>` : ''}</div>${safeUrl(m.link) ? `<a class="btn btn-ghost btn-sm" href="${esc(safeUrl(m.link))}" target="_blank" rel="noopener">Join</a>` : ''}<button class="icon-btn" data-del-meeting="${esc(m.id)}" aria-label="Delete ${esc(m.title)}">✕</button></div>`).join('') : '<p class="empty">Nothing scheduled.</p>'}
      </section></div>
      <div class="narrow"><form id="new-meeting" class="card stack"><h2 style="font-size:18px">Schedule a meeting</h2>
        <label class="field">Title<input name="title" required maxlength="160" value="Collective check-in"></label>
        <div class="row"><label class="field">Date &amp; time<input name="when" type="datetime-local" required></label><label class="field">Length (min)<input name="dur" type="number" min="5" max="600" value="60"></label></div>
        <label class="field">Video link (optional)<input name="link" type="url" placeholder="https://…"></label>
        <label class="field">Agenda (optional)<textarea name="agenda" rows="4" maxlength="4000"></textarea></label>
        <button class="btn btn-primary btn-sm" style="align-self:flex-start">Add meeting</button></form></div>
    </div>`);
  document.getElementById('new-meeting').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    if (!f.when.value) return toast('Pick a date and time.');
    const link = f.link.value.trim(); if (link && !safeUrl(link)) return toast('Video links need to start with https://');
    const { error: err } = await sb.from('meetings').insert({ title: f.title.value.trim(), starts_at: new Date(f.when.value).toISOString(), duration_minutes: Number(f.dur.value) || 60, link, agenda: f.agenda.value });
    if (err) return fail(err); toast('Meeting added.'); meetings();
  });
  $app.querySelectorAll('[data-del-meeting]').forEach((b) => b.addEventListener('click', async () => {
    const { error: err } = await sb.from('meetings').delete().eq('id', b.dataset.delMeeting); if (err) return fail(err); meetings();
  }));
}

// ---------- Shared links
async function files() {
  const { data, error } = await sb.from('links').select('*').order('created_at', { ascending: false });
  if (error) fail(error, 'Couldn’t load links');
  const list = data || [];
  mount('files', `
    <div class="page-head"><h1>Shared links</h1></div>
    <p class="muted" style="max-width:640px">Point to documents where they already live (Google Drive, Dropbox, OneDrive, Canva…), so everyone can find them in one place. Don’t link anything containing client information.</p>
    <div class="cols">
      <div class="wide"><section class="card">${list.length ? list.map((l) => `<div class="list-row"><span class="avatar" style="background:${safeColor(person(l.owner_slug)?.tint, '#E3EFEC')};color:var(--ink)" aria-hidden="true">${icon('files', 18)}</span><div class="grow"><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener" style="font-weight:600">${esc(l.title)}</a><div class="meta">${esc(firstName(l.owner_slug))}${l.note ? ' · ' + esc(l.note) : ''}</div></div>${l.owner_slug === S.me.slug ? `<button class="icon-btn" data-del-link="${esc(l.id)}" aria-label="Remove ${esc(l.title)}">✕</button>` : ''}</div>`).join('') : '<p class="empty">No links yet.</p>'}</section></div>
      <div class="narrow"><form id="new-link" class="card stack"><h2 style="font-size:18px">Add a link</h2>
        <label class="field">Title<input name="title" required maxlength="200"></label>
        <label class="field">Link<input name="url" type="url" required placeholder="https://…"></label>
        <label class="field">Note (optional)<input name="note" maxlength="300"></label>
        <button class="btn btn-primary btn-sm" style="align-self:flex-start">Add link</button></form></div>
    </div>`);
  document.getElementById('new-link').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const url = safeUrl(f.url.value.trim());
    if (!url) return toast('Links need to start with https://');
    const { error: err } = await sb.from('links').insert({ title: f.title.value.trim(), url, note: f.note.value.trim(), owner_slug: S.me.slug });
    if (err) return fail(err); files();
  });
  $app.querySelectorAll('[data-del-link]').forEach((b) => b.addEventListener('click', async () => {
    const { error: err } = await sb.from('links').delete().eq('id', b.dataset.delLink); if (err) return fail(err); files();
  }));
}

// ---------- Team
function team() {
  mount('team', `<div class="page-head"><h1>Team</h1><a class="btn btn-ghost btn-sm" href="../profile.html" target="_blank" rel="noopener">View public profiles</a></div>
    <div class="grid-cards">${S.people.map((p) => `<article class="card stack" style="gap:10px">
      <div style="display:flex;gap:12px;align-items:center">${avatar(p.slug, 'lg')}<div><strong style="font-size:17px">${esc(p.full_name)}</strong><div class="meta" style="font-size:14px;color:var(--muted)">${esc(p.role_title)}</div></div></div>
      ${p.credentials_line ? `<p style="font-size:14px">${esc(p.credentials_line)}</p>` : ''}
      <p class="meta" style="font-size:13px;color:var(--muted)">${p.user_id ? 'Has joined the workspace' : 'Hasn’t joined yet'}${p.is_public ? '' : ' · Profile hidden from public site'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-ghost btn-sm" href="#messages/collective">Message</a>${p.public_email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(p.public_email)}">Email</a>` : ''}<a class="btn btn-ghost btn-sm" href="../profile.html?p=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Public profile</a></div>
    </article>`).join('')}</div>`);
}

// ---------- My profile
function profile() {
  const p = S.me;
  const biz = (p.businesses || []).map((b) => (b.note ? `${b.name} — ${b.note}` : b.name)).join('\n');
  mount('profile', `
    <div class="page-head"><h1>My profile</h1><a class="btn btn-ghost btn-sm" href="../profile.html?p=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">See it on the website</a></div>
    <form id="profile-form" class="card stack" style="max-width:820px">
      <div class="row"><label class="field">First name<input name="first_name" value="${esc(p.first_name)}" required maxlength="60"></label>
      <label class="field">Name as shown, with credentials<input name="full_name" value="${esc(p.full_name)}" required maxlength="120"><span class="hint">e.g. Amber Hughes, PhD</span></label></div>
      <div class="row"><label class="field">Title or role<input name="role_title" value="${esc(p.role_title)}" maxlength="120"></label>
      <label class="field">Short credentials line<input name="credentials_line" value="${esc(p.credentials_line)}" maxlength="200"></label></div>
      <label class="field">Bio<textarea name="bio" rows="5" maxlength="2000">${esc(p.bio)}</textarea><span class="hint">2–3 sentences in your own words.</span></label>
      <div class="row"><label class="field">Degrees<textarea name="degrees" rows="3">${esc((p.degrees || []).join('\n'))}</textarea><span class="hint">One per line.</span></label>
      <label class="field">Licenses<textarea name="licenses" rows="3">${esc((p.licenses || []).join('\n'))}</textarea><span class="hint">One per line, with state.</span></label></div>
      <label class="field">Focus areas<textarea name="focus" rows="3">${esc((p.focus || []).join('\n'))}</textarea><span class="hint">One per line.</span></label>
      <label class="field">Businesses &amp; practices<textarea name="businesses" rows="4">${esc(biz)}</textarea><span class="hint">One per line, like “Business name — what it does”.</span></label>
      <label class="field">Your role within the Collective<textarea name="collective_role" rows="2" maxlength="600">${esc(p.collective_role)}</textarea></label>
      <label class="field">Public contact email (optional)<input name="public_email" type="email" value="${esc(p.public_email)}" maxlength="200"><span class="hint">Shown on your public profile as an “Email” button.</span></label>
      <label class="check"><input type="checkbox" name="is_public" ${p.is_public ? 'checked' : ''}> Show my profile on the public website</label>
      <button class="btn btn-primary" style="align-self:flex-start">Save profile</button>
    </form>`);
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    const businesses = lines(f.businesses.value).map((l) => { const [name, ...rest] = l.split(/\s+[—–-]\s+/); return { name: name.trim(), note: rest.join(' — ').trim() }; });
    const upd = {
      first_name: f.first_name.value.trim(), full_name: f.full_name.value.trim(), role_title: f.role_title.value.trim(),
      credentials_line: f.credentials_line.value.trim(), bio: f.bio.value.trim(), degrees: lines(f.degrees.value),
      licenses: lines(f.licenses.value), focus: lines(f.focus.value), businesses, collective_role: f.collective_role.value.trim(),
      public_email: f.public_email.value.trim(), is_public: f.is_public.checked, updated_at: new Date().toISOString(),
    };
    upd.initials = (upd.first_name.slice(0, 2) || p.initials);
    const { data, error } = await sb.from('profiles').update(upd).eq('slug', p.slug).select('*').single();
    if (error) return fail(error);
    Object.assign(S.me, data); const i = S.people.findIndex((x) => x.slug === p.slug); if (i >= 0) S.people[i] = S.me;
    toast('Profile saved. The website shows your changes now.');
  });
}

// ---------- Admin (invites + inquiries)
async function admin() {
  if (!S.isAdmin) { location.hash = 'today'; return; }
  const [{ data: invites }, { data: inq }] = await Promise.all([
    sb.from('allowlist').select('*').order('added_at'),
    sb.from('inquiries').select('*').order('created_at', { ascending: false }).limit(50),
  ]);
  const inv = invites || []; const invited = new Set(inv.map((x) => x.profile_slug));
  const open = S.people.filter((p) => !invited.has(p.slug));
  const unhandled = (inq || []).filter((x) => !x.handled).length;
  mount('admin', `
    <div class="page-head"><h1>Admin</h1></div>
    <div class="cols">
      <div class="wide">
        <section class="card"><div class="card-head"><h2>Website inquiries</h2><span class="meta">${unhandled} new</span></div>
          ${(inq || []).length ? inq.map((q) => `<div class="list-row" style="align-items:flex-start"><div class="grow"><strong>${esc(q.name)}</strong> <a href="mailto:${esc(q.email)}">${esc(q.email)}</a><div class="meta">${esc(q.organization || 'No organization')} · ${esc(q.topic)} · ${esc(fmtWhen(q.created_at))}</div><p style="white-space:pre-line;margin-top:6px;font-size:15px">${esc(q.message)}</p></div><label class="check" style="flex:none;font-size:14px"><input type="checkbox" data-inq="${esc(q.id)}" ${q.handled ? 'checked' : ''}> Handled</label></div>`).join('') : '<p class="empty">No inquiries yet.</p>'}
        </section>
      </div>
      <div class="narrow">
        <section class="card"><div class="card-head"><h2>Invite list</h2></div>
          <p class="muted" style="font-size:14px;margin-bottom:8px">Only these emails can create a workspace account.</p>
          ${inv.map((x) => `<div class="list-row">${avatar(x.profile_slug)}<div class="grow"><strong style="font-size:14px">${esc(firstName(x.profile_slug))}</strong>${x.is_admin ? ' <span class="chip" style="padding:2px 8px;font-size:11px">Admin</span>' : ''}<div class="meta" style="overflow-wrap:anywhere">${esc(x.email)}</div></div>${x.profile_slug !== S.me.slug ? `<button class="icon-btn" data-uninvite="${esc(x.email)}" aria-label="Remove invite for ${esc(x.email)}">✕</button>` : ''}</div>`).join('')}
        </section>
        ${open.length ? `<form id="invite" class="card stack"><h2 style="font-size:18px">Invite a sibling</h2>
          <label class="field">Profile<select name="slug">${open.map((p) => `<option value="${esc(p.slug)}">${esc(p.first_name)}</option>`).join('')}</select></label>
          <label class="field">Their email<input name="email" type="email" required></label>
          <label class="check"><input type="checkbox" name="admin"> Also make them an admin</label>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start">Add to invite list</button>
          <p class="hint" style="font-size:13px;color:var(--muted)">Then send them this link: <strong>${esc(appUrl())}</strong>, and ask them to choose “Create your account”.</p></form>` : ''}
      </div>
    </div>`);
  document.getElementById('invite')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const email = f.email.value.trim().toLowerCase();
    if (!email.includes('@')) return toast('Enter a valid email.');
    const { error } = await sb.from('allowlist').insert({ email, profile_slug: f.slug.value, is_admin: f.admin.checked });
    if (error) return fail(error, 'Invite not added'); toast('Added. Send them the workspace link.'); admin();
  });
  $app.querySelectorAll('[data-uninvite]').forEach((b) => b.addEventListener('click', async () => {
    const { error } = await sb.from('allowlist').delete().eq('email', b.dataset.uninvite); if (error) return fail(error); admin();
  }));
  $app.querySelectorAll('[data-inq]').forEach((cb) => cb.addEventListener('change', async () => {
    const { error } = await sb.from('inquiries').update({ handled: cb.checked }).eq('id', cb.dataset.inq); if (error) { cb.checked = !cb.checked; fail(error); }
  }));
}

// ---------- More (phone menu)
function more() {
  const items = [['meetings', 'Meetings'], ['files', 'Shared links'], ['profile', 'My profile']].concat(S.isAdmin ? [['admin', 'Admin']] : []);
  mount('more', `<div class="page-head"><h1>More</h1></div>
    <section class="card">${items.map(([k, l]) => `<a class="list-row" href="#${k}" style="text-decoration:none;color:var(--ink);font-weight:500">${icon(k === 'files' ? 'files' : k)}<span class="grow">${l}</span>›</a>`).join('')}
    <a class="list-row" href="../" style="text-decoration:none;color:var(--ink);font-weight:500">${icon('today')}<span class="grow">Public website</span>›</a></section>
    <div style="display:flex;gap:12px;align-items:center">${avatar(S.me.slug)}<span class="grow">Signed in as ${esc(S.me.first_name)}</span><button class="btn btn-outline btn-sm" data-signout>Sign out</button></div>
    <p class="muted" style="font-size:14px">Tip: add this workspace to your home screen. On iPhone, tap Share › Add to Home Screen. On Android, tap the ⋮ menu › Install app.</p>`);
}

// ---------- start
sb.auth.onAuthStateChange((event) => {
  // Defer: don't call other auth methods inside this callback.
  setTimeout(() => {
    if (event === 'PASSWORD_RECOVERY') { S.recovering = true; renderAuth('recover'); }
    else if (event === 'SIGNED_OUT') { S.me = null; S.session = null; renderAuth('signin'); }
    else if (event === 'SIGNED_IN' && !S.me && !S.recovering) { enter(); }
  }, 0);
});
enter();
