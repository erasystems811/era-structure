-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Business types
create table business_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Question bank
create table questions (
  id uuid primary key default uuid_generate_v4(),
  business_type_id uuid references business_types(id) on delete cascade,
  layer int not null check (layer in (1, 2)),
  block text not null,
  question_text text not null,
  input_type text not null check (input_type in ('dropdown','multi-select','yes-no','short-text','number','voice-note')),
  options jsonb,
  order_index int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Businesses (client accounts)
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_name text not null,
  owner_phone text not null,
  owner_email text not null unique,
  business_type_id uuid references business_types(id),
  stage text not null default 'assessment' check (stage in ('assessment','guide','maintenance')),
  is_active boolean default true,
  is_locked boolean default false,
  locked_at timestamptz,
  created_at timestamptz default now()
);

-- User profiles (links auth.users to businesses + role)
create table owner_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  business_id uuid references businesses(id),
  role text not null default 'client' check (role in ('admin','client'))
);

-- Staff members
create table staff_members (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  role text not null,
  whatsapp_number text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Layer 1 responses
create table layer1_responses (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade unique,
  answers jsonb not null default '{}',
  submitted_at timestamptz default now(),
  admin_released boolean default false
);

-- Observation schedule
create table observation_schedule (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade unique,
  day1_date date not null,
  day2_date date not null,
  notes text,
  generated_questions jsonb,
  created_at timestamptz default now()
);

-- Layer 2 responses
create table layer2_responses (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade unique,
  answers jsonb not null default '{}',
  photo_uploads text[] default '{}',
  submitted_at timestamptz default now()
);

-- Reports
create table reports (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade unique,
  generated_content jsonb not null default '{}',
  admin_notes text,
  status text not null default 'pending' check (status in ('pending','released')),
  generated_at timestamptz default now(),
  released_at timestamptz
);

-- Workspace documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  title text not null,
  category text not null check (category in ('operations','people','finance','customer','standards')),
  google_doc_id text,
  google_doc_url text,
  assigned_role text,
  assigned_staff_id uuid references staff_members(id),
  last_reviewed_at timestamptz,
  next_review_due timestamptz,
  review_cycle_days int default 14,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Document review history
create table document_reviews (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade,
  reviewed_at timestamptz default now(),
  reviewed_by text
);

-- Guide bot sessions
create table guide_sessions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  session_date timestamptz default now(),
  messages jsonb not null default '[]',
  completed_tasks text[] default '{}'
);

-- Daily checklists
create table checklists (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff_members(id) on delete cascade,
  date date not null,
  tasks jsonb not null default '[]',
  send_time text default '08:00',
  unique(staff_id, date)
);

-- Checklist completions
create table checklist_completions (
  id uuid primary key default uuid_generate_v4(),
  checklist_id uuid references checklists(id) on delete cascade,
  task_index int not null,
  completed boolean default false,
  completed_at timestamptz,
  unique(checklist_id, task_index)
);

-- Weekly staff check-ins
create table staff_checkins (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff_members(id) on delete cascade,
  week_start date not null,
  questions jsonb not null default '[]',
  responses jsonb default '{}',
  submitted_at timestamptz,
  unique(staff_id, week_start)
);

-- Section feedback
create table section_feedback (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  section_name text not null,
  question text not null,
  response text,
  submitted_at timestamptz default now()
);

-- Payments
create table payments (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  amount numeric not null,
  currency text default 'NGN',
  flutterwave_ref text unique,
  status text default 'pending',
  paid_at timestamptz,
  unlock_triggered boolean default false,
  created_at timestamptz default now()
);

-- Admin notes
create table admin_notes (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  note text not null,
  created_by text not null,
  created_at timestamptz default now()
);

-- RLS policies
alter table businesses enable row level security;
alter table owner_profiles enable row level security;
alter table staff_members enable row level security;
alter table layer1_responses enable row level security;
alter table observation_schedule enable row level security;
alter table layer2_responses enable row level security;
alter table reports enable row level security;
alter table documents enable row level security;
alter table guide_sessions enable row level security;
alter table checklists enable row level security;
alter table checklist_completions enable row level security;
alter table section_feedback enable row level security;
alter table payments enable row level security;

-- Admin has full access (service role bypasses RLS — policies for client auth)
create policy "client_own_business" on businesses
  for select using (
    id = (select business_id from owner_profiles where user_id = auth.uid())
  );

create policy "client_own_layer1" on layer1_responses
  for all using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
  );

create policy "client_own_layer2" on layer2_responses
  for all using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
  );

create policy "client_own_observation" on observation_schedule
  for all using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
  );

create policy "client_own_report" on reports
  for select using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
    and status = 'released'
  );

create policy "client_own_documents" on documents
  for all using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
  );

create policy "client_own_sessions" on guide_sessions
  for all using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
  );

create policy "client_own_feedback" on section_feedback
  for all using (
    business_id = (select business_id from owner_profiles where user_id = auth.uid())
  );

-- Seed default business types
insert into business_types (name) values
  ('Laundry'),
  ('Salon'),
  ('Catering & Food'),
  ('Logistics & Delivery'),
  ('Retail & Product'),
  ('Fashion & Tailoring'),
  ('Agency & Creative'),
  ('Events');
