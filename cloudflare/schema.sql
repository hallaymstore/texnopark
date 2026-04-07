CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  tracking_code TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  selected_program TEXT NOT NULL,
  portfolio_link TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_device_id ON applications(device_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  tracking_code TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  meeting_type TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);
