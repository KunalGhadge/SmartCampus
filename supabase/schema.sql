-- ==============================================================================
-- SmartCampus Supabase Database Schema
-- Run this SQL in your Supabase Project: SQL Editor -> New Query -> Run
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (linked to Supabase Auth users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  college text default 'SmartCampus University',
  department text,
  graduation_year text,
  verified boolean default false,
  trust_score integer default 95,
  badges text[] default array['Student', 'Verified Email']::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Trigger to automatically create a profile when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id),
    coalesce((new.raw_user_meta_data->>'email_verified')::boolean, false)
  );
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
  campus text default 'Main Campus',
  availability text default 'Available',
  for_rent boolean default false,
  rent_per_day numeric,
  specs text[] default array[]::text[],
  tags text[] default array[]::text[],
  seller_id uuid references auth.users(id) on delete set null,
  seller_name text default 'Student',
  seller_college text default 'Campus',
  seller_avatar text,
  seller_verified boolean default false,
  seller_rating numeric default 5.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.listings enable row level security;

create policy "Active listings are viewable by everyone."
  on public.listings for select
  using ( true );

create policy "Authenticated users can create listings."
  on public.listings for insert
  to authenticated
  with check ( auth.uid() = seller_id or seller_id is null );

create policy "Sellers can update their own listings."
  on public.listings for update
  to authenticated
  using ( auth.uid() = seller_id );

create policy "Sellers can delete their own listings."
  on public.listings for delete
  to authenticated
  using ( auth.uid() = seller_id );


-- ------------------------------------------------------------------------------
-- 3. Item Requests (Students looking for items)
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
  campus text default 'Main Campus',
  department text default '',
  student_name text default 'Student',
  student_avatar text,
  student_verified boolean default false,
  author_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.item_requests enable row level security;

create policy "Item requests are viewable by everyone."
  on public.item_requests for select
  using ( true );

create policy "Authenticated users can post item requests."
  on public.item_requests for insert
  to authenticated
  with check ( auth.uid() = author_id or author_id is null );

create policy "Authors can update their item requests."
  on public.item_requests for update
  to authenticated
  using ( auth.uid() = author_id );

create policy "Authors can delete their item requests."
  on public.item_requests for delete
  to authenticated
  using ( auth.uid() = author_id );


-- ------------------------------------------------------------------------------
-- 4. Reviews & Ratings
-- ------------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  reviewer_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone."
  on public.reviews for select
  using ( true );

create policy "Authenticated users can write reviews."
  on public.reviews for insert
  to authenticated
  with check ( auth.uid() = reviewer_id );


-- ------------------------------------------------------------------------------
-- 5. Chat Messages (Realtime persistence)
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  thread_id text not null,
  sender_id text not null,
  sender_name text default 'User',
  text text not null,
  image_url text,
  file_url text,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Messages in thread are viewable by authenticated users."
  on public.messages for select
  to authenticated
  using ( true );

create policy "Authenticated users can send messages."
  on public.messages for insert
  to authenticated
  with check ( true );

-- Enable Realtime publication for messages and listings
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.listings;
alter publication supabase_realtime add table public.item_requests;


-- ------------------------------------------------------------------------------
-- 6. Storage Buckets (Listing Images & Avatars)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS Policies
create policy "Anyone can view listing images"
  on storage.objects for select
  using ( bucket_id = 'listing-images' );

create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'listing-images' );

create policy "Anyone can view avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'avatars' );
