create table if not exists user_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  default_thinking_level text not null default 'medium'
    check (default_thinking_level in ('low', 'medium', 'high')),
  notify_agent_completion boolean not null default false,
  notify_approval_needed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_preferences enable row level security;
