create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  gmail_account_id uuid references gmail_accounts (id) on delete set null,
  action text not null,
  message_ids text[],
  plan_id text,
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_created_at_idx on audit_logs (user_id, created_at);

alter table audit_logs enable row level security;
