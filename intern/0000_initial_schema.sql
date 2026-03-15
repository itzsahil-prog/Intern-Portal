-- ═════════════════════════════════════════════════════════════════════════════
-- VeloxCodeAgency Intern Portal Schema
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. COHORTS TABLE
-- Stores information about different internship cohorts.
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  max_interns integer not null default 10,
  roles_open text[],
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for cohorts
alter table public.cohorts enable row level security;
create policy "Public can read active cohorts" on public.cohorts for select using (is_active = true);
create policy "Admins can manage cohorts" on public.cohorts for all using (auth.role() = 'service_role'); -- Simplified for now, use custom claims for admin role

-- 2. APPLICATIONS TABLE
-- Stores all submitted applications from public applicants.
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null,
  linkedin text,
  portfolio text,
  role text not null,
  cohort uuid references public.cohorts(id),
  availability text not null,
  start_date date,
  cover_letter text,
  resume_url text,
  status text not null default 'Submitted', -- Submitted, Under Review, Shortlisted, Interview, Accepted, Rejected
  reference_number text not null unique,
  whatsapp_number text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for applications
alter table public.applications enable row level security;
create policy "Public can create applications" on public.applications for insert with check (true);
create policy "Applicants can read their own application status" on public.applications for select using (email = current_setting('request.jwt.claims', true)::json->>'email'); -- Example for status tracker
create policy "Admins can manage applications" on public.applications for all using (auth.role() = 'service_role');

-- 3. INTERNS TABLE
-- Stores data for accepted interns.
create table public.interns (
  id uuid primary key, -- This will be the user's auth.users.id
  name text not null,
  email text not null unique,
  whatsapp_number text,
  role text,
  cohort_id uuid references public.cohorts(id),
  mentor_id uuid, -- references admins(id) later
  start_date date,
  status text not null default 'Active', -- Active, Completed, Deactivated
  points integer not null default 0,
  avatar_url text,
  login_id text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for interns
alter table public.interns enable row level security;
create policy "Interns can view their own profile" on public.interns for select using (id = auth.uid());
create policy "Interns can update their own profile" on public.interns for update using (id = auth.uid());
create policy "Admins can manage interns" on public.interns for all using (auth.role() = 'service_role');

-- 4. TASKS TABLE
-- Stores all tasks assigned to interns.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references public.interns(id),
  cohort_id uuid references public.cohorts(id),
  due_date timestamp with time zone,
  priority text not null default 'Medium', -- Low, Medium, High
  points_value integer not null default 10,
  status text not null default 'To Do', -- To Do, In Progress, Done
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for tasks
alter table public.tasks enable row level security;
create policy "Interns can view their assigned tasks" on public.tasks for select using (assigned_to = auth.uid());
create policy "Admins can manage tasks" on public.tasks for all using (auth.role() = 'service_role');

-- 5. SUBMISSIONS TABLE
-- Stores intern submissions for tasks.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  intern_id uuid not null references public.interns(id),
  task_id uuid not null references public.tasks(id),
  file_url text,
  github_link text,
  notes text,
  status text not null default 'Pending Review', -- Pending Review, Approved, Needs Revision
  feedback text,
  points_awarded integer,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for submissions
alter table public.submissions enable row level security;
create policy "Interns can manage their own submissions" on public.submissions for all using (intern_id = auth.uid());
create policy "Admins can manage submissions" on public.submissions for all using (auth.role() = 'service_role');

-- 6. RESOURCES TABLE
-- Stores learning resources for interns.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null, -- Video, Article, Document, Link
  url text not null,
  topic_tags text[],
  is_featured boolean not null default false,
  visible_to text[] default array['all'], -- 'all' or array of cohort_ids
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for resources
alter table public.resources enable row level security;
create policy "Authenticated users can read resources" on public.resources for select using (auth.role() = 'authenticated');
create policy "Admins can manage resources" on public.resources for all using (auth.role() = 'service_role');

-- 7. MESSAGES TABLE
-- For announcements and direct messages.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid, -- null for system announcements
  receiver_id uuid, -- null for cohort/all announcements
  content text not null,
  is_announcement boolean not null default false,
  cohort_target uuid, -- target a specific cohort
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for messages
alter table public.messages enable row level security;
create policy "Users can see messages sent to them or announcements" on public.messages for select using (receiver_id = auth.uid() or is_announcement = true);
create policy "Admins can manage messages" on public.messages for all using (auth.role() = 'service_role');

-- 8. ADMINS TABLE
-- Stores admin user information.
create table public.admins (
  id uuid primary key, -- This will be the user's auth.users.id
  name text not null,
  email text not null unique,
  pin text, -- Hashed PIN
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- RLS for admins
alter table public.admins enable row level security;
create policy "Admins can manage their own data" on public.admins for all using (id = auth.uid());

-- 9. WHATSAPP LOGS TABLE
-- Logs all outgoing automated WhatsApp messages.
create table public.whatsapp_logs (
  id bigint primary key generated by default as identity,
  intern_id uuid references public.interns(id),
  message_type text not null, -- acceptance, rejection, reminder, etc.
  status text not null, -- sent, failed
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  phone_number text not null,
  error_message text
);
-- RLS for whatsapp_logs
alter table public.whatsapp_logs enable row level security;
create policy "Admins can manage whatsapp logs" on public.whatsapp_logs for all using (auth.role() = 'service_role');

-- ═════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═════════════════════════════════════════════════════════════════════════════
-- Run these in the Supabase UI or via CLI.
-- Create 'resumes' bucket
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
create policy "Allow authenticated uploads to resumes" on storage.objects for insert to authenticated with check ( bucket_id = 'resumes' );
create policy "Allow admin reads on resumes" on storage.objects for select to service_role using ( bucket_id = 'resumes' );

-- Create 'submissions' bucket
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false);
create policy "Allow intern uploads to submissions" on storage.objects for insert to authenticated with check ( bucket_id = 'submissions' );
create policy "Allow admin reads on submissions" on storage.objects for select to service_role using ( bucket_id = 'submissions' );

-- Create 'avatars' bucket
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true); -- Public for easy display
create policy "Allow authenticated uploads to avatars" on storage.objects for insert to authenticated with check ( bucket_id = 'avatars' );
create policy "Allow updates to own avatar" on storage.objects for update to authenticated using ( auth.uid()::text = (storage.foldername(name))[1] );

-- Create 'resources' bucket
insert into storage.buckets (id, name, public) values ('resources', 'resources', false);
create policy "Allow admin uploads to resources" on storage.objects for insert to service_role with check ( bucket_id = 'resources' );
create policy "Allow authenticated reads on resources" on storage.objects for select to authenticated using ( bucket_id = 'resources' );


-- ═════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═════════════════════════════════════════════════════════════════════════════

-- Seed Cohorts
insert into public.cohorts (name, start_date, end_date, max_interns, roles_open, is_active) values
('Cohort A (Summer 2024)', '2024-06-01', '2024-08-31', 20, '{"Frontend Developer", "Backend Developer", "UI/UX Designer"}', true),
('Cohort B (Fall 2024)', '2024-09-01', '2024-11-30', 15, '{"Full Stack Developer", "Project Manager", "QA Tester"}', true),
('Cohort C (Winter 2023)', '2023-12-01', '2024-02-28', 10, '{"DevOps Intern"}', false);

-- NOTE: Seeding the admin user requires creating a user in Supabase Auth first,
-- then using that user's UID to insert into the `public.admins` table.
-- This is best done via a server-side script.
-- Example (replace with actual UID after creating user):
-- insert into public.admins (id, name, email, pin) values
-- ('<auth_user_id_for_itzsahil@veloxcode>', 'Sahil', 'itzsahil@veloxcode', '<hashed_pin_000000>');

-- To create the auth user:
-- In Supabase SQL Editor, run:
-- insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token_encrypted)
-- values (
--   '00000000-0000-0000-0000-000000000000',
--   uuid_generate_v4(),
--   'authenticated',
--   'authenticated',
--   'itzsahil@veloxcode',
--   crypt('itzsahil@123', gen_salt('bf')), -- Replace with your password
--   now(),
--   '',
--   null,
--   null,
--   '{"provider":"email","providers":["email"]}',
--   '{"role":"admin"}', -- Store role in metadata
--   now(),
--   now(),
--   '',
--   '',
--   '',
--   ''
-- );