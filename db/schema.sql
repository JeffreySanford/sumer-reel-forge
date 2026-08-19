create table studio_projects (
  id uuid primary key,
  slug text not null unique,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table source_documents (
  id uuid primary key,
  project_id uuid not null references studio_projects(id),
  title text not null,
  source_path text,
  checksum_sha256 text,
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table chapters (
  id uuid primary key,
  project_id uuid not null references studio_projects(id),
  source_document_id uuid references source_documents(id),
  chapter_number integer not null,
  title text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, chapter_number)
);

create table reels (
  id uuid primary key,
  chapter_id uuid not null references chapters(id),
  episode_number integer not null,
  title text not null,
  status text not null default 'draft',
  target_duration_seconds integer not null,
  source_section text not null,
  hook text not null,
  visual_core text not null,
  logline text not null,
  narration text not null,
  voice_direction text,
  music_direction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, episode_number),
  check (status in ('draft', 'review', 'approved', 'rendering', 'published', 'archived'))
);

create table reel_shots (
  id uuid primary key,
  reel_id uuid not null references reels(id) on delete cascade,
  shot_number integer not null,
  time_range text not null,
  duration_seconds integer not null,
  visual text not null,
  motion text not null,
  prompt text not null,
  created_at timestamptz not null default now(),
  unique (reel_id, shot_number)
);

create table generated_assets (
  id uuid primary key,
  project_id uuid not null references studio_projects(id),
  reel_id uuid references reels(id),
  shot_id uuid references reel_shots(id),
  asset_type text not null,
  storage_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (asset_type in ('image', 'video', 'audio', 'subtitle', 'manifest', 'log'))
);

create table render_jobs (
  id uuid primary key,
  reel_id uuid not null references reels(id),
  mode text not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  input_hash text,
  heartbeat_at timestamptz,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  stdout_log_asset_id uuid references generated_assets(id),
  stderr_log_asset_id uuid references generated_assets(id),
  output_asset_id uuid references generated_assets(id),
  error_summary text,
  check (mode in ('storyboard', 'draft-video', 'final-video')),
  check (status in ('queued', 'running', 'complete', 'failed', 'stale', 'cancelled'))
);

create table audit_logs (
  id uuid primary key,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index render_jobs_status_heartbeat_idx on render_jobs(status, heartbeat_at);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);
