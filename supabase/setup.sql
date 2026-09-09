-- One-shot schema for Signal. Safe to run more than once.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  password_hash text
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references users (id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique (provider, "providerAccountId")
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text not null unique,
  "userId" uuid not null references users (id) on delete cascade,
  expires timestamptz not null
);

create table if not exists verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

create table if not exists gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  email text not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

create unique index if not exists gmail_accounts_one_primary_per_user
  on gmail_accounts (user_id)
  where is_primary;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on conversations (user_id);
create index if not exists conversation_messages_conversation_id_idx
  on conversation_messages (conversation_id);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  gmail_account_id uuid references gmail_accounts (id) on delete set null,
  action text not null,
  message_ids text[],
  plan_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_created_at_idx
  on audit_logs (user_id, created_at);

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

alter table users enable row level security;
alter table accounts enable row level security;
alter table sessions enable row level security;
alter table verification_tokens enable row level security;
alter table gmail_accounts enable row level security;
alter table conversations enable row level security;
alter table conversation_messages enable row level security;
alter table audit_logs enable row level security;
alter table user_preferences enable row level security;

notify pgrst, 'reload schema';
