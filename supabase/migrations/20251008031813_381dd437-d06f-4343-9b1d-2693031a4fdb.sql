-- Create table to store generated database migrations
create table if not exists public.generated_migrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_context text,
  migration_sql text not null,
  table_count integer default 0,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  executed_at timestamp with time zone
);

-- Enable RLS
alter table public.generated_migrations enable row level security;

-- Users can view their own migrations
create policy "Users can view their own migrations"
  on public.generated_migrations
  for select
  using (auth.uid() = user_id);

-- Users can update their own migrations
create policy "Users can update their own migrations"
  on public.generated_migrations
  for update
  using (auth.uid() = user_id);

-- System can insert migrations
create policy "System can insert migrations"
  on public.generated_migrations
  for insert
  with check (true);

-- Create index for faster queries
create index if not exists idx_generated_migrations_user_id on public.generated_migrations(user_id);
create index if not exists idx_generated_migrations_status on public.generated_migrations(status);