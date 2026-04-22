-- Vidyalaya360 Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Re-runnable: every statement is `if not exists`.

-- ---------- students ----------
-- Production rule: never hard-delete a student. The "Withdraw" action sets
-- status='archived' and stamps archived_at; their financial history (paid
-- receipts, audit log) is preserved forever. Restoring just clears the flag.
create table if not exists students (
  id text primary key,
  name text not null,
  cls text not null,
  parent text default '—',
  fee text default 'pending',
  attendance int default 0,
  transport text default '—',
  joined text,
  status text default 'active',
  archived_at timestamptz,
  created_at timestamptz default now()
);

-- For installs that ran an earlier schema, add the new columns idempotently.
alter table students add column if not exists status text default 'active';
alter table students add column if not exists archived_at timestamptz;
create index if not exists idx_students_status on students (status);

-- ---------- pending fees ----------
create table if not exists pending_fees (
  id text primary key,
  name text,
  cls text,
  amount int,
  due text,
  overdue boolean default false,
  created_at timestamptz default now()
);

-- ---------- recent (paid) fees ----------
create table if not exists recent_fees (
  id text primary key,
  name text,
  cls text,
  amount int,
  method text,
  time text,
  status text default 'paid',
  paid_at timestamptz default now()
);

-- ---------- complaints ----------
-- Tickets raised by parents (or staff). `type` distinguishes a regular
-- complaint from a leave-request submission; `submitted_by` records the role.
create table if not exists complaints (
  id text primary key,
  student text,
  student_id text,
  cls text,
  parent text,
  issue text,
  type text default 'general',          -- 'general' | 'leave_request'
  date text,
  status text default 'Open',           -- Open | In Progress | Resolved
  assigned text,
  submitted_by text default 'parent',   -- 'parent' | 'teacher' | 'principal'
  created_at timestamptz default now()
);
alter table complaints add column if not exists student_id text;
alter table complaints add column if not exists type text default 'general';
alter table complaints add column if not exists submitted_by text default 'parent';

-- ---------- enquiries ----------
create table if not exists enquiries (
  id text primary key,
  name text,
  parent text,
  phone text,
  cls int,
  source text,
  date text,
  status text default 'New',
  created_at timestamptz default now()
);

-- ---------- daily logs (composite key student + date) ----------
-- The Daily Monitoring Panel records what a teacher logs per student per day:
-- attendance + leave reason if absent, classwork/homework completion status,
-- handwriting feedback, behaviour and extra-curricular notes.
create table if not exists daily_logs (
  student_id text not null,
  date text not null,
  student_name text,
  cls text,
  attendance text default 'present',     -- 'present' | 'absent'
  leave_reason text,                     -- only filled when attendance='absent'
  classwork text,
  classwork_status text,                 -- 'completed' | 'not_completed' | null
  homework text,
  homework_status text,                  -- 'completed' | 'pending' | null
  topics text,
  handwriting_note text,
  handwriting_grade text,
  behaviour text,
  extra text,
  posted_by text,
  posted_at timestamptz default now(),
  primary key (student_id, date)
);
-- Idempotent ALTERs for installs that ran an earlier schema.
alter table daily_logs add column if not exists attendance text default 'present';
alter table daily_logs add column if not exists leave_reason text;
alter table daily_logs add column if not exists classwork_status text;
alter table daily_logs add column if not exists homework_status text;

-- ---------- transport routes (stops as JSONB for flexibility) ----------
create table if not exists routes (
  code text primary key,
  name text,
  driver text,
  bus text,
  status text,
  eta text,
  stops jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ---------- audit log ----------
create table if not exists audit_log (
  id text primary key,
  who text,
  action text,
  entity text,
  when_label text,        -- pre-formatted "08:42" / "Yesterday 18:14"
  ip text,
  created_at timestamptz default now()
);

-- ---------- classes + sections ----------
-- Configurable per school. Seeded with Class 1–8, sections A & B on first
-- install; safe to re-run — the INSERT uses ON CONFLICT DO NOTHING.
create table if not exists classes (
  n int primary key,
  label text,
  sections jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
insert into classes (n, label, sections) values
  (1, 'Class 1', '["A","B"]'::jsonb),
  (2, 'Class 2', '["A","B"]'::jsonb),
  (3, 'Class 3', '["A","B"]'::jsonb),
  (4, 'Class 4', '["A","B"]'::jsonb),
  (5, 'Class 5', '["A","B"]'::jsonb),
  (6, 'Class 6', '["A","B"]'::jsonb),
  (7, 'Class 7', '["A","B"]'::jsonb),
  (8, 'Class 8', '["A","B"]'::jsonb)
on conflict (n) do nothing;

-- ---------- activity feed ----------
create table if not exists activities (
  id bigserial primary key,
  t text,
  tone text,
  title text,
  sub text,
  ts text,
  created_at timestamptz default now()
);

-- ---------- helpful indexes ----------
create index if not exists idx_audit_created_at on audit_log (created_at desc);
create index if not exists idx_activities_created_at on activities (created_at desc);
create index if not exists idx_daily_logs_date on daily_logs (date desc);
create index if not exists idx_pending_fees_created_at on pending_fees (created_at desc);
create index if not exists idx_students_created_at on students (created_at desc);

-- ---------- Row Level Security ----------
-- This app uses the SUPABASE_SERVICE_ROLE_KEY on the server, so RLS doesn't
-- need to allow anonymous reads. Enable RLS so the anon key can't write
-- by accident; the service role bypasses RLS.
alter table students      enable row level security;
alter table pending_fees  enable row level security;
alter table recent_fees   enable row level security;
alter table complaints    enable row level security;
alter table enquiries     enable row level security;
alter table daily_logs    enable row level security;
alter table routes        enable row level security;
alter table audit_log     enable row level security;
alter table activities    enable row level security;
