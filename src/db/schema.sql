CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  hc_code TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN ('DNI','NIE','OTHER')),
  document_number TEXT NOT NULL CHECK (trim(document_number) <> ''),
  document_normalized TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL CHECK (trim(first_name) <> ''),
  last_name TEXT NOT NULL CHECK (trim(last_name) <> ''),
  birth_date TEXT,
  sex TEXT CHECK (sex IS NULL OR sex IN ('M','F','O')),
  phone TEXT,
  email TEXT,
  address TEXT,
  insurance_number TEXT NOT NULL CHECK (trim(insurance_number) <> ''),
  insurer_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sequences (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_last_first
  ON patients (last_name, first_name);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  specialist_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('VACATION', 'SICK_LEAVE', 'WORKING_HOURS')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  specialist_id TEXT NOT NULL,
  center_id TEXT NOT NULL,
  specialty TEXT NOT NULL,
  appointment_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);
