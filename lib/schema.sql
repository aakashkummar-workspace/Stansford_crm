-- Vidyalaya360 Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Re-runnable: every statement is `if not exists`.

-- ---------- students ----------
create table if not exists students (
  id text primary key,
  name text not null,
  cls text not null,
  parent text default '—',
  fee text default 'pending',
  attendance int default 0,
  transport text default '—',
  joined text,
  created_at timestamptz default now()
);

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
create table if not exists complaints (
  id text primary key,
  student text,
  cls text,
  parent text,
  issue text,
  date text,
  status text default 'Open',
  assigned text,
  created_at timestamptz default now()
);

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
create table if not exists daily_logs (
  student_id text not null,
  date text not null,
  student_name text,
  cls text,
  classwork text,
  homework text,
  topics text,
  handwriting_note text,
  handwriting_grade text,
  behaviour text,
  extra text,
  posted_by text,
  posted_at timestamptz default now(),
  primary key (student_id, date)
);

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
