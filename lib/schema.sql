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
alter table students add column if not exists pickup_stop text;
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
-- One row per payment receipt. Multiple rows per student are allowed
-- (partial payments produce multiple receipts). The `id` is a unique
-- receipt id like "RCP-…"; `student_id` links back to the student row.
create table if not exists recent_fees (
  id text primary key,
  student_id text,
  name text,
  cls text,
  amount int,
  method text,
  time text,
  status text default 'paid',
  paid_at timestamptz default now()
);
-- Idempotent migration for older installs that had id=student_id.
alter table recent_fees add column if not exists student_id text;
create index if not exists idx_recent_fees_student on recent_fees (student_id);

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

-- ---------- donors ----------
-- One row per donor (CSR org, trust, individual, alumnus). `ytd` rolls up
-- contributions for the current year and is what drives the leaderboards.
create table if not exists donors (
  id text primary key,
  name text not null,
  type text default 'Individual',     -- 'CSR' | 'Trust' | 'Individual' | 'Alumni'
  email text,
  phone text,
  ytd int default 0,
  last_gift text,
  next_touchpoint text,
  archived_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_donors_type on donors (type);
alter table donors enable row level security;

-- campaigns: fundraising targets with progress % derived from raised/goal.
create table if not exists campaigns (
  id text primary key,
  name text not null,
  goal int default 0,
  raised int default 0,
  starts text,
  ends text,
  status text default 'active',       -- 'active' | 'completed' | 'paused'
  description text,
  created_at timestamptz default now()
);
alter table campaigns enable row level security;

-- ---------- communication ----------
-- broadcasts: log of every WhatsApp/SMS blast sent through the school
-- (manual or automation). sent/delivered counts feed the dashboard KPIs.
create table if not exists broadcasts (
  id text primary key,
  campaign text not null,
  channel text default 'whatsapp',         -- 'whatsapp' | 'sms' | 'both'
  audience text default 'all',             -- audience tag (e.g. 'all', 'pending_fees', 'class_5-A', 'list_xxx')
  audience_label text,                     -- human label shown in the table
  message text,
  sent int default 0,
  delivered int default 0,
  sent_at timestamptz default now()
);
create index if not exists idx_broadcasts_sent_at on broadcasts (sent_at desc);
alter table broadcasts enable row level security;

-- templates: re-usable DLT-approved message bodies with {{placeholders}}.
create table if not exists message_templates (
  id text primary key,
  name text not null,
  channel text default 'whatsapp',
  body text,
  created_at timestamptz default now()
);
alter table message_templates enable row level security;

-- recipient_lists: ad-hoc imported contact lists for one-off broadcasts
-- (e.g. "Class 5 picnic" parents). Contacts stored as a JSONB array of
-- { name, phone } objects.
create table if not exists recipient_lists (
  id text primary key,
  name text not null,
  contacts jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table recipient_lists enable row level security;

-- ---------- inventory ----------
-- Stock register for books / uniforms / assets. on_hand and issued are
-- updated by inventory_movements rows so we always have an audit trail.
create table if not exists inventory (
  id text primary key,
  name text not null,
  category text default 'asset',     -- 'book' | 'uniform' | 'asset'
  cls text,                          -- '5-A' / 'all' / null
  on_hand int default 0,
  min int default 0,
  issued int default 0,
  unit_price int default 0,
  supplier text,
  archived_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_inventory_category on inventory (category);
alter table inventory enable row level security;

create table if not exists inventory_movements (
  id text primary key,
  item_id text not null,
  type text not null,                -- 'in' | 'out'
  qty int not null,
  note text,
  who text,
  at timestamptz default now()
);
create index if not exists idx_inv_movements_at on inventory_movements (at desc);
alter table inventory_movements enable row level security;

-- ---------- staff ----------
-- One row per teacher / ops / intern on the school's payroll. Performance
-- numbers (attendance, tasks, score) are pre-aggregated per month so the
-- dashboard reads stay cheap. Soft-delete via archived_at.
create table if not exists staff (
  id text primary key,
  name text not null,
  role text default 'Teacher',          -- 'Teacher' | 'Ops' | 'Intern'
  dept text default '—',
  phone text default '—',
  email text,
  joining_date text,
  salary int default 0,
  attendance int default 0,             -- this month % present
  tasks int default 0,                  -- this month % tasks done
  score int default 0,                  -- composite (set by trigger or app)
  status text default 'ok',             -- 'top' | 'ok' | 'low'
  avatar text,                          -- 2-char initials for chip
  archived_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_staff_role on staff (role);
alter table staff enable row level security;

-- ---------- users (auth) ----------
-- One row per real human who can sign in. Passwords are bcrypt-hashed before
-- storage; the raw password never reaches the database. `role` controls which
-- screens the session can see. `linked_id` ties a parent account to one
-- student row (so the parent dashboard scopes to that child) or a teacher
-- account to one staff row.
create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  role text not null,        -- 'admin' | 'academic_director' | 'principal' | 'teacher' | 'parent'
  name text not null,
  linked_id text,            -- student_id (parent) or staff_id (teacher), nullable
  created_at timestamptz default now()
);
create index if not exists idx_users_role on users (role);
alter table users enable row level security;

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
