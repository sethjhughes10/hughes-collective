// Shared setup for the public site and the workspace app.
// The publishable key is safe to put in a website: the database's privacy rules decide what it can do.
import { createClient } from './vendor/supabase.js';

export const SUPABASE_URL = 'https://rsczaolwjoqtwxuqiweq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YeTbzQ9O_wucOnVWODwaTQ_02_bFdvl';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Escape any text before putting it into HTML.
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Only allow https links (blocks javascript: and similar).
export function safeUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; }
}

// Only allow #RRGGBB colors in inline styles.
export function safeColor(c, fallback = '#1E5B52') {
  return /^#[0-9A-Fa-f]{6}$/.test(c || '') ? c : fallback;
}

export function toast(text, ms = 3200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export const PUBLIC_PROFILE_COLUMNS =
  'slug, first_name, full_name, initials, color, tint, role_title, credentials_line, bio, degrees, licenses, focus, businesses, collective_role, public_email, sort';
