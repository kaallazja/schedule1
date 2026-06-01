# 📚 Study Planner

A study schedule planner with **dark/light mode**, **multi-profile support**, and **Supabase** persistence.

## ✨ Features

- **Weekly schedule grid** — See your entire week at a glance
- **Add subjects** with name, day, time range, notes, and color
- **Edit / delete** subjects with confirmation
- **Status tracking** — Mark subjects as completed
- **Dark & Light mode** — Toggle with one click, persists across sessions
- **Two storage modes:**
  - **Local profiles** (offline) — Just open the file, data stays on your device
  - **Supabase auth** (online) — Full email/password with per-user RLS

## 🚀 Quick Start

### Offline (no server needed)
Just open `index.html` in your browser. Create a profile and go.

### Online (require server)
```powershell
cd "d:\Project 2"
python -m http.server 8080
```
Then open **http://localhost:8080**

### Phone access
1. Run `start-server.bat` (double-click)
2. Open the URL shown in the terminal on your phone
3. Both devices must be on the same Wi-Fi

## 🗄️ Supabase Setup

The app is pre-configured to connect to a Supabase project. The table schema is in `supabase-setup.sql`.

### Run the SQL

```sql
-- In your Supabase SQL Editor:
CREATE TABLE study_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own schedules"
  ON study_schedules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## 📁 Project Structure

```
├── index.html              # Main app (auth + schedule + modals)
├── styles.css              # All styles with CSS custom properties
├── app.js                  # Application logic (dual-mode)
├── supabase-config.js      # Supabase URL + anon key + API functions
├── supabase-setup.sql      # Database schema + RLS policies
├── start-server.bat        # One-click server + phone access
├── .gitignore
└── README.md
```

## 🎨 Dark Mode

Toggle with the 🌙/☀️ button in the header. Your preference is saved to localStorage.

## 📱 Tech Stack

- Vanilla HTML/CSS/JS — no framework
- Supabase (REST API) — cloud persistence
- localStorage — offline fallback
- CSS custom properties — theming
