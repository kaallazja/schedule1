// ====== Dual Storage: Supabase (server) + localStorage (file://) ======

const SUPABASE_URL = 'https://daxssitygzjbzxlkuupc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRheHNzaXR5Z3pqYnp4bGt1dXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTkxNjAsImV4cCI6MjA5NTg3NTE2MH0._zmyDjpZKEiCZ9VKEW648QyzHpq3-DmdRp5ghsQ4dFs';

// ====================== DETECT MODE ======================
// Supabase mode = served via HTTP (localhost or hosted)
// Local mode = opened as file://
let g_isSupabaseMode = false;
let g_detectionDone = false;

async function detectStorageMode() {
  if (g_detectionDone) return g_isSupabaseMode;
  g_detectionDone = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok || res.status === 401 || res.status === 404) {
      g_isSupabaseMode = true;
    }
  } catch {
    g_isSupabaseMode = false;
  }
  return g_isSupabaseMode;
}

function isSupabaseMode() { return g_isSupabaseMode; }

// ====================== SUPABASE IMPLEMENTATION ======================
const AUTH = `${SUPABASE_URL}/auth/v1`;
const REST = `${SUPABASE_URL}/rest/v1`;

function saveSession(data) {
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: data.user,
  };
  localStorage.setItem('supabase_session', JSON.stringify(session));
  return session;
}

function loadSession() {
  try {
    const raw = localStorage.getItem('supabase_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem('supabase_session');
}

function h(contentType) {
  return {
    'Content-Type': contentType || 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
}

function ah(session) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session.access_token}`,
    'Prefer': 'return=representation',
  };
}

async function supabaseSignIn(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST', headers: h(), body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || data.msg || 'Login failed');
  return saveSession(data);
}

async function supabaseSignUp(email, password) {
  const res = await fetch(`${AUTH}/signup`, {
    method: 'POST', headers: h(), body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error || 'Signup failed');
  if (data.access_token) return { session: saveSession(data), emailConfirmation: false };
  return { session: null, emailConfirmation: true };
}

async function supabaseRefreshToken(rt) {
  const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: 'POST', headers: h(), body: JSON.stringify({ refresh_token: rt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Session expired. Please sign in again.');
  return saveSession(data);
}

async function supabaseGetUser(session) {
  const res = await fetch(`${AUTH}/user`, { headers: ah(session) });
  const data = await res.json();
  return res.ok ? data : null;
}

async function q(method, url, body, session) {
  const opts = { method, headers: ah(session) };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(text ? (JSON.parse(text).message || text) : 'Request failed');
  return text ? JSON.parse(text) : null;
}

function supabaseSelect(session, query) { return q('GET', `${REST}/study_schedules?${query}`, null, session); }
function supabaseInsert(session, r) { return q('POST', `${REST}/study_schedules`, r, session); }
function supabaseUpdate(session, id, u) { return q('PATCH', `${REST}/study_schedules?id=eq.${id}`, u, session); }
function supabaseDelete(session, id) { return q('DELETE', `${REST}/study_schedules?id=eq.${id}`, null, session); }

// ====================== LOCAL-STORAGE IMPLEMENTATION ======================
function lsKey(id) { return `planner_v1_${id}`; }

function localGetProfiles() {
  try { return JSON.parse(localStorage.getItem(lsKey('profiles')) || '[]'); }
  catch { return []; }
}

function localSaveProfiles(profiles) {
  localStorage.setItem(lsKey('profiles'), JSON.stringify(profiles));
}

function localGetSchedules(profileId) {
  try { return JSON.parse(localStorage.getItem(lsKey(`schedules_${profileId}`)) || '[]'); }
  catch { return []; }
}

function localSaveSchedules(profileId, schedules) {
  localStorage.setItem(lsKey(`schedules_${profileId}`), JSON.stringify(schedules));
}

function localDeleteProfile(profileId) {
  localStorage.removeItem(lsKey(`schedules_${profileId}`));
  const profiles = localGetProfiles().filter(p => p.id !== profileId);
  localSaveProfiles(profiles);
}

// ====================== FILE HELPER ======================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ====================== GENERATE ID ======================
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
