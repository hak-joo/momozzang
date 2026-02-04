-- 1. Create the table
create table if not exists public.momozzang (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.momozzang enable row level security;

-- 3. Create Policy: Allow public read access
create policy "Allow public read access"
on public.momozzang
for select
to public
using (true);

-- 4. Create Policy: Allow public write access (for migration/demo)
create policy "Allow public insert access"
on public.momozzang
for insert
to public
with check (true);

-- 5. Storage Setup (Run this in SQL Editor)
-- Create a new bucket 'wedding-images'
insert into storage.buckets (id, name, public)
values ('wedding-images', 'wedding-images', true)
on conflict (id) do nothing;

-- Allow public access to the bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'wedding-images' );

-- Allow public upload (for migration script)
create policy "Public Insert"
on storage.objects for insert
with check ( bucket_id = 'wedding-images' );
