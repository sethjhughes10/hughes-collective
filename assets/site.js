// Public website: team cards, profile page and contact form.
import { sb, esc, safeColor, PUBLIC_PROFILE_COLUMNS } from './common.js';

async function loadProfiles() {
  const { data, error } = await sb.from('profiles').select(PUBLIC_PROFILE_COLUMNS).order('sort');
  if (error) throw error;
  return data || [];
}

function teamCard(p) {
  return `<a class="person-card" href="profile.html?p=${encodeURIComponent(p.slug)}">
    <div class="photo" style="background:${safeColor(p.color)}" aria-hidden="true">${esc(p.initials)}</div>
    <h3 class="display" style="font-size:22px">${esc(p.full_name)}</h3>
    ${p.credentials_line ? `<p class="muted" style="font-size:14px">${esc(p.credentials_line)}</p>` : ''}
    ${p.role_title ? `<p style="font-size:15px">${esc(p.role_title)}</p>` : ''}
    <span style="margin-top:auto; color: var(--accent); font-weight:600; font-size:15px">View profile</span>
  </a>`;
}

async function initHome() {
  const grid = document.getElementById('team-grid');
  try {
    const people = await loadProfiles();
    grid.innerHTML = people.map(teamCard).join('') || '<p class="muted">Profiles are coming soon.</p>';
  } catch (e) {
    grid.innerHTML = '<p class="muted">Team profiles couldn’t load right now. Please refresh in a moment.</p>';
  }

  const form = document.getElementById('inquiry');
  const status = document.getElementById('inquiry-status');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const row = {
      name: String(f.get('name') || '').trim(),
      email: String(f.get('email') || '').trim(),
      organization: String(f.get('organization') || '').trim(),
      topic: String(f.get('topic') || '').trim(),
      message: String(f.get('message') || '').trim(),
    };
    if (!row.name || !row.email.includes('@') || !row.message) {
      status.innerHTML = '<div class="notice err">Please add your name, a valid email and a message.</div>';
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    const { error } = await sb.from('inquiries').insert(row);
    btn.disabled = false; btn.textContent = 'Send inquiry';
    if (error) {
      status.innerHTML = '<div class="notice err">Something went wrong sending your message. Please try again.</div>';
    } else {
      form.reset();
      status.innerHTML = '<div class="notice ok">Thank you. Your message reached the team, and we’ll reply by email.</div>';
    }
  });
}

function section(title, inner) {
  return inner ? `<section><h4>${esc(title)}</h4>${inner}</section>` : '';
}

async function initProfile() {
  const root = document.getElementById('profile-root');
  const tabs = document.getElementById('profile-tabs');
  let people = [];
  try { people = await loadProfiles(); } catch { root.innerHTML = '<p class="muted">This profile couldn’t load right now. Please refresh in a moment.</p>'; return; }
  const want = new URLSearchParams(location.search).get('p');
  const p = people.find((x) => x.slug === want) || people[0];
  if (!p) { root.innerHTML = '<p class="muted">Profiles are coming soon.</p>'; return; }
  document.title = `${p.full_name} — Hughes Collective`;

  tabs.innerHTML = people.map((x) => `<a class="profile-tab" href="profile.html?p=${encodeURIComponent(x.slug)}" ${x.slug === p.slug ? 'aria-current="page"' : ''}>
    <span class="avatar" style="background:${safeColor(x.color)}" aria-hidden="true">${esc(x.initials)}</span>${esc(x.first_name)}</a>`).join('');

  const list = (arr) => (arr && arr.length ? `<ul class="plain-list">${arr.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '');
  const tags = p.focus && p.focus.length ? `<div class="tags">${p.focus.map((f) => `<span style="background:${safeColor(p.tint, '#E3EFEC')}">${esc(f)}</span>`).join('')}</div>` : '';
  const biz = Array.isArray(p.businesses) && p.businesses.length
    ? `<div class="grid-cards">${p.businesses.map((b) => `<div class="card" style="padding:16px; flex: 1 1 220px"><strong>${esc(b.name)}</strong>${b.note ? `<div class="muted" style="font-size:14px">${esc(b.note)}</div>` : ''}</div>`).join('')}</div>` : '';
  const email = p.public_email && p.public_email.includes('@') ? p.public_email : '';

  root.innerHTML = `<article class="profile">
    <div class="profile-side" style="background:${safeColor(p.tint, '#E3EFEC')}">
      <div class="photo" style="height:300px; background:${safeColor(p.color)}; font-size:84px" aria-hidden="true">${esc(p.initials)}</div>
      ${email ? `<a class="btn btn-dark" href="mailto:${esc(email)}">Email ${esc(p.first_name)}</a>` : ''}
      <a class="btn btn-outline" href="./#contact">Request a consultation</a>
    </div>
    <div class="profile-main">
      <div class="stack" style="gap:8px">
        ${p.role_title ? `<p style="font-weight:600; color:${safeColor(p.color)}">${esc(p.role_title)}</p>` : ''}
        <h1 class="display" style="font-size: clamp(30px, 4vw, 40px)">${esc(p.full_name)}</h1>
        ${p.bio ? `<p class="lede" style="font-size:17px; white-space:pre-line">${esc(p.bio)}</p>` : '<p class="muted">Full bio coming soon.</p>'}
      </div>
      <div class="row">${section('Education', list(p.degrees))}${section('Licensure', list(p.licenses))}</div>
      ${section('Focus areas', tags)}
      ${section('Businesses & practices', biz)}
      ${section('Within the Collective', p.collective_role ? `<p>${esc(p.collective_role)}</p>` : '')}
    </div>
  </article>`;
}

if (document.getElementById('team-grid')) initHome();
if (document.getElementById('profile-root')) initProfile();
