// ===================================================================
//  STUDY PLANNER — Dual-mode (Supabase + localStorage)
// ===================================================================

// ====================== STATE ======================
let currentUser = null;
let currentSession = null;
let schedules = [];
let currentEditingId = null;
let deleteTargetId = null;
let isOnline = false; // true = Supabase, false = localStorage

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ====================== DOM HELPERS ======================
const $ = (id) => document.getElementById(id);

// ====================== DOM REFS ======================
const authContainer = $('auth-container');
const appContainer = $('app-container');
const loginForm = $('login-form');
const signupForm = $('signup-form');
const profileForm = $('profile-form');
const showSignup = $('show-signup');
const showLogin = $('show-login');
const loginEmail = $('login-email');
const loginPassword = $('login-password');
const signupEmail = $('signup-email');
const signupPassword = $('signup-password');
const signupConfirm = $('signup-confirm');
const loginError = $('login-error');
const signupError = $('signup-error');
const loginBtn = $('login-btn');
const signupBtn = $('signup-btn');
const profileList = $('profile-list');
const profileName = $('profile-name');
const createProfileBtn = $('create-profile-btn');
const userEmail = $('user-email');
const logoutBtn = $('logout-btn');
const addSubjectBtn = $('add-subject-btn');
const emptyAddBtn = $('empty-add-btn');
const scheduleGrid = $('schedule-grid');
const emptyState = $('empty-state');
const weekLabel = $('week-label');
const modalOverlay = $('modal-overlay');
const deleteOverlay = $('delete-overlay');
const modalTitle = $('modal-title');
const modalClose = $('modal-close');
const modalCancel = $('modal-cancel');
const subjectForm = $('subject-form');
const subjectId = $('subject-id');
const subjectName = $('subject-name');
const subjectDay = $('subject-day');
const startTime = $('start-time');
const endTime = $('end-time');
const subjectNotes = $('subject-notes');
const subjectColor = $('subject-color');
const colorPresets = $('color-presets');
const deleteClose = $('delete-close');
const deleteCancel = $('delete-cancel');
const deleteConfirm = $('delete-confirm');
const deleteSubjectName = $('delete-subject-name');
const toggleTheme = $('toggle-theme');
const toast = $('toast');

// ====================== TOAST ======================
let toastTimeout = null;
function showToast(message, type = 'success') {
  if (toastTimeout) clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  toastTimeout = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ====================== THEME ======================
function getPreferredTheme() {
  const stored = localStorage.getItem('study-planner-theme');
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function setTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  toggleTheme.textContent = isDark ? '☀️' : '🌙';
  toggleTheme.title = isDark ? 'Switch to light' : 'Switch to dark';
  localStorage.setItem('study-planner-theme', theme);
}
function toggleThemeHandler() {
  setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}
setTheme(getPreferredTheme());

// ====================== WEEK DATES ======================
function getCurrentWeekDates() {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  return DAYS.map((name, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return { name, dateObj: d, dateNum: d.getDate(), month: d.toLocaleString('en-US', { month: 'short' }), isToday: d.toDateString() === now.toDateString() };
  });
}

// ====================== UI HELPERS ======================
function showAuthScreen() { authContainer.style.display = 'flex'; appContainer.style.display = 'none'; loginForm.reset(); signupForm.reset(); hideError(loginError); hideError(signupError); }
function showAppScreen() { authContainer.style.display = 'none'; appContainer.style.display = 'block'; }
function hideError(el) { el.className = 'form-error'; el.textContent = ''; }
function showFormError(el, msg) { el.textContent = msg; el.className = 'form-error visible'; }
function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (loading) { text.style.display = 'none'; loader.style.display = 'inline-block'; btn.disabled = true; }
  else { text.style.display = 'inline'; loader.style.display = 'none'; btn.disabled = false; }
}

// ====================== ONLINE MODE (Supabase Auth) ======================
async function handleLogin(e) {
  e.preventDefault(); hideError(loginError);
  const email = loginEmail.value.trim(), password = loginPassword.value;
  if (!email || !password) { showFormError(loginError, 'Please enter email and password.'); return; }
  setLoading(loginBtn, true);
  try {
    const session = await supabaseSignIn(email, password);
    currentSession = session; currentUser = session.user; loginSuccess();
  } catch (err) {
    console.error('Login:', err);
    let msg = err.message || 'Login failed.';
    if (msg.includes('Invalid login credentials')) msg = 'Invalid email or password.';
    else if (msg.includes('Email not confirmed')) msg = 'Please confirm your email first.';
    showFormError(loginError, msg); setLoading(loginBtn, false);
  }
}

async function handleSignup(e) {
  e.preventDefault(); hideError(signupError);
  const email = signupEmail.value.trim(), password = signupPassword.value, confirm = signupConfirm.value;
  if (!email || !password) { showFormError(signupError, 'Fill in all fields.'); return; }
  if (password.length < 6) { showFormError(signupError, 'Password must be 6+ characters.'); return; }
  if (password !== confirm) { showFormError(signupError, 'Passwords do not match.'); return; }
  setLoading(signupBtn, true);
  try {
    const r = await supabaseSignUp(email, password);
    if (r.emailConfirmation) {
      showToast('Account created! Check your email.', 'success');
      signupForm.style.display = 'none'; loginForm.style.display = 'block'; loginEmail.value = email;
    } else { currentSession = r.session; currentUser = r.session.user; showToast('Account created!'); loginSuccess(); }
    setLoading(signupBtn, false);
  } catch (err) {
    console.error('Signup:', err);
    let msg = err.message || 'Signup failed.';
    if (msg.includes('already exists') || msg.includes('already registered')) msg = 'Email already registered. Sign in instead.';
    showFormError(signupError, msg); setLoading(signupBtn, false);
  }
}

function loginSuccess() {
  userEmail.textContent = currentUser.email;
  logoutBtn.textContent = 'Logout';
  showAppScreen(); loadSchedules();
}

async function handleLogout() {
  if (isOnline) {
    currentUser = null; currentSession = null; schedules = []; clearSession(); renderSchedule(); showAuthScreen();
  } else {
    localStorage.removeItem(lsKey('active_profile'));
    currentUser = null; schedules = []; renderSchedule(); showProfileScreen();
  }
}

// ====================== OFFLINE MODE (localStorage profiles) ======================
function showProfileScreen() {
  authContainer.style.display = 'flex'; appContainer.style.display = 'none';
  loginForm.style.display = 'none'; signupForm.style.display = 'none'; profileForm.style.display = 'flex';
  renderProfileList();
}

function renderProfileList() {
  const profiles = localGetProfiles();
  profileList.innerHTML = '';
  if (profiles.length === 0) {
    profileList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:16px;font-size:14px;">No profiles yet. Create one below.</p>';
    return;
  }
  profiles.forEach(p => {
    const item = document.createElement('div');
    item.className = 'profile-item';
    item.innerHTML = `<span>👤 ${escapeHtml(p.name)}</span><button class="profile-delete" data-id="${p.id}" title="Delete profile">✕</button>`;
    item.addEventListener('click', (e) => { if (!e.target.closest('.profile-delete')) selectProfile(p.id); });
    item.querySelector('.profile-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteProfile(p.id); });
    profileList.appendChild(item);
  });
}

function selectProfile(id) {
  const profiles = localGetProfiles();
  const profile = profiles.find(p => p.id === id);
  if (!profile) return;
  localStorage.setItem(lsKey('active_profile'), id);
  currentUser = { id: profile.id, email: profile.name };
  userEmail.textContent = profile.name;
  logoutBtn.textContent = 'Switch';
  showAppScreen();
  schedules = localGetSchedules(id);
  renderSchedule();
}

function deleteProfile(id) {
  if (!confirm('Delete this profile and all its schedules?')) return;
  localDeleteProfile(id);
  if (currentUser && currentUser.id === id) {
    currentUser = null; schedules = [];
    localStorage.removeItem(lsKey('active_profile'));
  }
  renderProfileList();
}

function handleCreateProfile() {
  const name = profileName.value.trim();
  if (!name) { showToast('Enter a profile name.', 'error'); return; }
  const profiles = localGetProfiles();
  const id = genId();
  profiles.push({ id, name });
  localSaveProfiles(profiles);
  profileName.value = '';
  selectProfile(id);
}

// ====================== CRUD ======================
async function loadSchedules() {
  if (!currentUser) return;
  if (isOnline) {
    if (!currentSession) return;
    try {
      const q = `select=*&user_id=eq.${currentUser.id}&order=start_time.asc`;
      const data = await supabaseSelect(currentSession, q);
      schedules = data || []; renderSchedule();
    } catch (err) { console.error('Load:', err); showToast('Error loading: ' + (err.message || '?'), 'error'); }
  } else {
    schedules = localGetSchedules(currentUser.id);
    renderSchedule();
  }
}

async function saveSubject(formData) {
  const { id, name, day, start, end, notes, color } = formData;
  const isEdit = !!id;

  if (isOnline) {
    try {
      if (isEdit) await supabaseUpdate(currentSession, id, { subject: name, day, start_time: start, end_time: end, notes, color });
      else await supabaseInsert(currentSession, { user_id: currentUser.id, subject: name, day, start_time: start, end_time: end, notes, color, status: 'pending' });
      showToast(isEdit ? 'Updated!' : 'Added!'); closeModal(); await loadSchedules();
    } catch (err) { console.error('Save:', err); showToast('Error saving: ' + (err.message || '?'), 'error'); }
  } else {
    let all = localGetSchedules(currentUser.id);
    if (isEdit) {
      const idx = all.findIndex(s => s.id === id);
      if (idx > -1) { all[idx] = { ...all[idx], subject: name, day, start_time: start, end_time: end, notes, color }; }
    } else {
      all.push({ id: genId(), user_id: currentUser.id, subject: name, day, start_time: start, end_time: end, notes, color, status: 'pending', created_at: new Date().toISOString() });
    }
    localSaveSchedules(currentUser.id, all);
    showToast(isEdit ? 'Updated!' : 'Added!'); closeModal();
    schedules = all; renderSchedule();
  }
}

async function deleteSubject(id) {
  if (!id) return;
  if (isOnline) {
    try { await supabaseDelete(currentSession, id); closeDeleteModal(); showToast('Deleted.'); await loadSchedules(); }
    catch (err) { console.error('Delete:', err); showToast('Error deleting.', 'error'); }
  } else {
    let all = localGetSchedules(currentUser.id).filter(s => s.id !== id);
    localSaveSchedules(currentUser.id, all);
    closeDeleteModal(); showToast('Deleted.');
    schedules = all; renderSchedule();
  }
}

async function toggleSubjectStatus(id, newStatus) {
  if (isOnline) {
    try { await supabaseUpdate(currentSession, id, { status: newStatus }); }
    catch (err) { console.error('Status:', err); showToast('Error updating.', 'error'); return; }
  }
  const item = schedules.find(s => s.id === id);
  if (item) {
    item.status = newStatus;
    if (!isOnline) localSaveSchedules(currentUser.id, schedules);
  }
  renderSchedule();
}

// ====================== RENDER ======================
function renderSchedule() {
  scheduleGrid.innerHTML = '';
  const weekDates = getCurrentWeekDates();
  if (!schedules || schedules.length === 0) { emptyState.style.display = 'block'; scheduleGrid.style.display = 'none'; return; }
  emptyState.style.display = 'none'; scheduleGrid.style.display = 'grid';
  const f = weekDates[0], l = weekDates[6];
  weekLabel.textContent = f.month === l.month ? `${f.month} ${f.dateNum}–${l.dateNum}, ${f.dateObj.getFullYear()}` : `${f.month} ${f.dateNum} – ${l.month} ${l.dateNum}, ${f.dateObj.getFullYear()}`;
  weekDates.forEach(di => { scheduleGrid.appendChild(createDayColumn(di, schedules.filter(s => s.day === di.name))); });
}

function createDayColumn(di, items) {
  const col = document.createElement('div');
  col.className = `day-column${di.isToday ? ' today' : ''}`;
  col.innerHTML = `<div class="day-header"><span class="day-name">${di.name}</span><span class="day-date">${di.dateNum}</span><span class="day-month">${di.month}</span></div>`;
  const body = document.createElement('div'); body.className = 'day-body';
  if (!items.length) {
    body.innerHTML = '<div class="day-empty"><div class="day-empty-icon">📅</div><div class="day-empty-text">No subjects</div></div>';
  } else {
    items.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    items.forEach(item => body.appendChild(createStudyCard(item)));
  }
  col.appendChild(body); return col;
}

function createStudyCard(item) {
  const card = document.createElement('div');
  card.className = `study-card${item.status === 'completed' ? ' completed' : ''}`;
  card.style.borderLeftColor = item.color || '#6366f1';
  const t = formatTime(item.start_time) + ' – ' + formatTime(item.end_time);
  card.innerHTML = `
    <div class="card-top"><span class="card-title">${escapeHtml(item.subject)}</span>
      <div class="card-actions"><button class="card-action-btn edit-btn" data-id="${item.id}" title="Edit">&#9998;</button><button class="card-action-btn delete-btn" data-id="${item.id}" title="Delete">&#128465;</button></div>
    </div>
    <div class="card-time">${t}</div>
    ${item.notes ? `<div class="card-notes">${escapeHtml(item.notes)}</div>` : ''}
    <div class="card-footer"><label class="status-toggle"><input type="checkbox" class="status-checkbox" data-id="${item.id}" ${item.status === 'completed' ? 'checked' : ''}><span class="status-label">${item.status === 'completed' ? 'Done' : 'Pending'}</span></label></div>`;
  card.querySelector('.edit-btn').onclick = (e) => { e.stopPropagation(); openEditModal(item); };
  card.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); openDeleteModal(item); };
  card.querySelector('.status-checkbox').onchange = (e) => { e.stopPropagation(); toggleSubjectStatus(item.id, e.target.checked ? 'completed' : 'pending'); };
  return card;
}

// ====================== MODAL ======================
function openAddModal() {
  currentEditingId = null; modalTitle.textContent = 'Add Subject'; subjectForm.reset(); subjectId.value = ''; subjectColor.value = '#6366f1'; updateColorPresets('#6366f1');
  const h = String(new Date().getHours()).padStart(2, '0'); startTime.value = h + ':00'; endTime.value = (String(Number(h) + 1).padStart(2, '0')) + ':00'; modalOverlay.style.display = 'flex';
}
function openEditModal(item) {
  currentEditingId = item.id; modalTitle.textContent = 'Edit Subject'; subjectId.value = item.id; subjectName.value = item.subject; subjectDay.value = item.day; startTime.value = item.start_time; endTime.value = item.end_time; subjectNotes.value = item.notes || ''; subjectColor.value = item.color || '#6366f1'; updateColorPresets(item.color || '#6366f1'); modalOverlay.style.display = 'flex';
}
function closeModal() { modalOverlay.style.display = 'none'; subjectForm.reset(); subjectId.value = ''; currentEditingId = null; }
function openDeleteModal(item) { deleteTargetId = item.id; deleteSubjectName.textContent = item.subject; deleteOverlay.style.display = 'flex'; }
function closeDeleteModal() { deleteOverlay.style.display = 'none'; deleteTargetId = null; }
function updateColorPresets(sel) { colorPresets.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === sel)); }

function handleSubjectFormSubmit(e) {
  e.preventDefault();
  const fd = { id: subjectId.value || null, name: subjectName.value.trim(), day: subjectDay.value, start: startTime.value, end: endTime.value, notes: subjectNotes.value.trim(), color: subjectColor.value };
  if (!fd.name) { showToast('Enter a subject name.', 'error'); return; }
  if (!fd.day) { showToast('Select a day.', 'error'); return; }
  if (!fd.start || !fd.end) { showToast('Set start and end time.', 'error'); return; }
  if (fd.start >= fd.end) { showToast('End time must be after start time.', 'error'); return; }
  saveSubject(fd);
}

// ====================== HELPERS ======================
function formatTime(s) {
  if (!s) return '';
  try { const [h, m] = s.split(':').map(Number); const p = h >= 12 ? 'PM' : 'AM'; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, '0')} ${p}`; }
  catch { return s; }
}
function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ====================== EVENT LISTENERS ======================
loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);
showSignup.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; signupForm.style.display = 'flex'; hideError(loginError); hideError(signupError); });
showLogin.addEventListener('click', (e) => { e.preventDefault(); signupForm.style.display = 'none'; loginForm.style.display = 'flex'; hideError(loginError); hideError(signupError); });
logoutBtn.addEventListener('click', handleLogout);
addSubjectBtn.addEventListener('click', openAddModal);
emptyAddBtn.addEventListener('click', openAddModal);
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
subjectForm.addEventListener('submit', handleSubjectFormSubmit);
deleteClose.addEventListener('click', closeDeleteModal);
deleteCancel.addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', (e) => { if (e.target === deleteOverlay) closeDeleteModal(); });
deleteConfirm.addEventListener('click', () => { if (deleteTargetId) deleteSubject(deleteTargetId); });
colorPresets.addEventListener('click', (e) => { const s = e.target.closest('.color-swatch'); if (!s) return; subjectColor.value = s.dataset.color; updateColorPresets(s.dataset.color); });
toggleTheme.addEventListener('click', toggleThemeHandler);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (modalOverlay.style.display === 'flex') closeModal(); if (deleteOverlay.style.display === 'flex') closeDeleteModal(); } });
createProfileBtn.addEventListener('click', handleCreateProfile);
profileName.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCreateProfile(); });

// ====================== INIT ======================
(async function init() {
  // Detect storage mode
  isOnline = await detectStorageMode();
  console.log('Mode:', isOnline ? 'Supabase (online)' : 'localStorage (offline)');

  if (isOnline) {
    profileForm.style.display = 'none';
    // Try to restore Supabase session
    try {
      const session = loadSession();
      if (session) {
        if (isSessionExpired(session)) {
          if (session.refresh_token) {
            const ref = await supabaseRefreshToken(session.refresh_token);
            currentSession = ref; currentUser = ref.user;
          } else { clearSession(); showAuthScreen(); return; }
        } else {
          const user = await supabaseGetUser(session);
          if (user && user.id) { currentSession = session; currentUser = user; }
          else {
            if (session.refresh_token) { const ref = await supabaseRefreshToken(session.refresh_token); currentSession = ref; currentUser = ref.user; }
            else { clearSession(); showAuthScreen(); return; }
          }
        }
        loginSuccess();
      } else { showAuthScreen(); }
    } catch (err) { console.error('Session restore:', err); clearSession(); showAuthScreen(); }
  } else {
    // Offline mode — show profile selector
    const activeId = localStorage.getItem(lsKey('active_profile'));
    const profiles = localGetProfiles();
    if (activeId && profiles.find(p => p.id === activeId)) {
      selectProfile(activeId);
    } else {
      showProfileScreen();
    }
  }
})();
