-- ==============================================================================
-- SmartCampus Supabase Database Schema (Production Ready)
-- Run this SQL in your Supabase Project: SQL Editor -> New Query -> Run
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (linked to Supabase Auth users & campus peers)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id text primary key,
  email text,
  full_name text,
  display_name text,
  avatar_url text,
  college text default 'MGM College',
  campus text default 'MGM College',
  department text default 'General',
  graduation_year text,
  verified boolean default true,
  email_verified boolean default true,
  trust_score integer default 95,
  badges text[] default array['Student', 'Verified Campus Member']::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( true );

drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile."
  on public.profiles for update
  using ( true );

-- Trigger to automatically create/sync a profile when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, display_name, avatar_url, verified, email_verified, campus, college)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id::text),
    coalesce((new.raw_user_meta_data->>'email_verified')::boolean, true),
    coalesce((new.raw_user_meta_data->>'email_verified')::boolean, true),
    'MGM College',
    'MGM College'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 2. Marketplace Listings Table
-- ------------------------------------------------------------------------------
create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price numeric not null check (price >= 0),
  original_price numeric,
  category text not null,
  condition text not null default 'Good',
  image text not null,
  images text[] default array[]::text[],
  description text default '',
  short_description text,
  negotiable boolean default false,
  pickup_location text,
  department text,
  campus text default 'MGM College',
  availability text default 'Available',
  for_rent boolean default false,
  rent_per_day numeric,
  specs text[] default array[]::text[],
  tags text[] default array[]::text[],
  seller_id text,
  seller_name text default 'Student',
  seller_college text default 'MGM College',
  seller_avatar text,
  seller_verified boolean default true,
  seller_rating numeric default 5.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.listings enable row level security;

drop policy if exists "Active listings are viewable by everyone." on public.listings;
create policy "Active listings are viewable by everyone."
  on public.listings for select
  using ( true );

drop policy if exists "Authenticated users can create listings." on public.listings;
create policy "Authenticated users can create listings."
  on public.listings for insert
  with check ( true );

drop policy if exists "Sellers can update their own listings." on public.listings;
create policy "Sellers can update their own listings."
  on public.listings for update
  using ( true );

drop policy if exists "Sellers can delete their own listings." on public.listings;
create policy "Sellers can delete their own listings."
  on public.listings for delete
  using ( true );


-- ------------------------------------------------------------------------------
-- 3. Item Requests (Campus Wanted Items)
-- ------------------------------------------------------------------------------
create table if not exists public.item_requests (
  id uuid default gen_random_uuid() primary key,
  item_name text not null,
  category text not null,
  budget_min numeric not null default 0,
  budget_max numeric not null default 0,
  condition text default 'Any',
  description text default '',
  urgency text default 'Medium',
  campus text default 'MGM College',
  department text default '',
  student_name text default 'Student',
  student_avatar text,
  student_verified boolean default true,
  author_id text,
  created_at timestamptz default now()
);

alter table public.item_requests enable row level security;

drop policy if exists "Item requests are viewable by everyone." on public.item_requests;
create policy "Item requests are viewable by everyone."
  on public.item_requests for select
  using ( true );

drop policy if exists "Authenticated users can post item requests." on public.item_requests;
create policy "Authenticated users can post item requests."
  on public.item_requests for insert
  with check ( true );

drop policy if exists "Authors can update their item requests." on public.item_requests;
create policy "Authors can update their item requests."
  on public.item_requests for update
  using ( true );

drop policy if exists "Authors can delete their item requests." on public.item_requests;
create policy "Authors can delete their item requests."
  on public.item_requests for delete
  using ( true );


-- ------------------------------------------------------------------------------
-- 4. Reviews & Ratings
-- ------------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  reviewer_id text,
  target_user_id text,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone." on public.reviews;
create policy "Reviews are viewable by everyone."
  on public.reviews for select
  using ( true );

drop policy if exists "Authenticated users can write reviews." on public.reviews;
create policy "Authenticated users can write reviews."
  on public.reviews for insert
  with check ( true );


-- ------------------------------------------------------------------------------
-- 5. Chat Messages (Realtime Zero-Latency Messaging)
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  thread_id text not null,
  sender_id text not null,
  sender_name text default 'Student',
  sender_avatar text,
  text text not null,
  image_url text,
  file_url text,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

drop policy if exists "Messages in thread are viewable by everyone." on public.messages;
create policy "Messages in thread are viewable by everyone."
  on public.messages for select
  using ( true );

drop policy if exists "Authenticated users can send messages." on public.messages;
create policy "Authenticated users can send messages."
  on public.messages for insert
  with check ( true );

-- Enable Realtime publication for messages, listings, item requests, and profiles (Safe / Idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listings'
  ) then
    alter publication supabase_realtime add table public.listings;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'item_requests'
  ) then
    alter publication supabase_realtime add table public.item_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;


-- ------------------------------------------------------------------------------
-- 6. Storage Buckets (Listing Images & Avatars)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "Anyone can view listing images" on storage.objects;
create policy "Anyone can view listing images"
  on storage.objects for select
  using ( bucket_id = 'listing-images' );

drop policy if exists "Authenticated users can upload listing images" on storage.objects;
create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  with check ( bucket_id = 'listing-images' );

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );


-- ------------------------------------------------------------------------------
-- 7. Seed Data: Active Campus Profiles (for Peer Chat & Discovery)
-- ------------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, display_name, avatar_url, campus, college, department, verified, email_verified, trust_score)
values
  ('user_rhea', 'rhea.k@mgmcollege.edu', 'Rhea Kulkarni', 'Rhea Kulkarni', 'https://i.pravatar.cc/120?img=12', 'MGM College', 'MGM College', 'Mechanical Engineering', true, true, 98),
  ('user_yash', 'yash.t@mgmcollege.edu', 'Yash Tiwari', 'Yash Tiwari', 'https://i.pravatar.cc/120?img=47', 'MGM College', 'MGM CET', 'CSE', true, true, 97),
  ('user_mihir', 'mihir.j@mgmcollege.edu', 'Mihir Jain', 'Mihir Jain', 'https://i.pravatar.cc/120?img=33', 'MGM College', 'MGM University', 'EEE', true, true, 99),
  ('user_devansh', 'devansh.k@mgmcollege.edu', 'Devansh Kapoor', 'Devansh Kapoor', 'https://i.pravatar.cc/120?img=14', 'MGM College', 'MGM College', 'Civil Engineering', true, true, 94),
  ('user_sana', 'sana.t@mgmcollege.edu', 'Sana Thomas', 'Sana Thomas', 'https://i.pravatar.cc/120?img=20', 'MGM College', 'MGM CET', 'ECE', true, true, 96),
  ('user_ananya', 'ananya.s@mgmcollege.edu', 'Ananya Sharma', 'Ananya Sharma', 'https://i.pravatar.cc/120?img=32', 'MGM College', 'MGM University', 'Computer Science', true, true, 98),
  ('user_ishaan', 'ishaan.v@mgmcollege.edu', 'Ishaan Verma', 'Ishaan Verma', 'https://i.pravatar.cc/120?img=15', 'MGM College', 'MGM College', 'IT', true, true, 96),
  ('user_tanvi', 'tanvi.p@mgmcollege.edu', 'Tanvi Patel', 'Tanvi Patel', 'https://i.pravatar.cc/120?img=22', 'MGM College', 'MGM CET', 'Architecture', true, true, 95),
  ('user_rohan', 'rohan.d@mgmcollege.edu', 'Rohan Das', 'Rohan Das', 'https://i.pravatar.cc/120?img=8', 'MGM College', 'MGM College', 'Electrical Engineering', true, true, 97),
  ('user_sneha', 'sneha.r@mgmcollege.edu', 'Sneha Rao', 'Sneha Rao', 'https://i.pravatar.cc/120?img=49', 'MGM College', 'MGM College', 'Chemical Engineering', true, true, 96),
  ('user_aditya', 'aditya.j@mgmcollege.edu', 'Aditya Joshi', 'Aditya Joshi', 'https://i.pravatar.cc/120?img=11', 'MGM College', 'MGM University', 'Engineering Physics', true, true, 97),
  ('user_kabir', 'kabir.s@mgmcollege.edu', 'Kabir Shah', 'Kabir Shah', 'https://i.pravatar.cc/120?img=7', 'MGM College', 'MGM CET', 'MBA', true, true, 95)
on conflict (id) do update
set
  display_name = excluded.display_name,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  campus = excluded.campus,
  department = excluded.department;
