Implementation

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript |
| Auth | NextAuth 5 (Google OAuth + email/password credentials) |
| Database | Supabase (PostgreSQL) |
| Integrations | Google OAuth 2.0, Gmail API v1 |
| Styling | Tailwind CSS |

## Architecture

### Auth

Dual auth via NextAuth 5:
- Google OAuth for sign-in + Gmail scope acquisition
- Email/password credentials with bcrypt hashing

Sessions are JWT-based. Middleware protects `/chat` and `/onboarding` routes.

### Gmail Integration

Gmail accounts are stored per-user in Supabase (`gmail_accounts` table). Multiple accounts per user are supported; one is marked `is_primary`. OAuth tokens are refreshed automatically before API calls.

All Gmail API interactions go through `/app/api/gmail/*`:
- `GET /api/gmail/messages` — fetch messages
- `GET /api/gmail/stats` — inbox stats
- `POST /api/gmail/connect` — initiate OAuth flow
- `GET /api/gmail/callback` — handle OAuth callback
- `GET /api/gmail/accounts` — list connected accounts

OAuth state is verified with HMAC to prevent CSRF.

### Agent

The agent lives in `lib/agent.ts`. Flow:

1. User sends a natural language command in the chat interface
2. Intent detection classifies the command (read, reply, archive, trash, summarize, flag)
3. A step-by-step execution plan is generated and shown to the user
4. On confirmation, the agent executes each step via Gmail API

Current state: intent detection and plan generation are implemented (rule-based keyword matching). Actual Gmail mutations (send/reply/archive/trash) and LLM-based reasoning are not yet wired.

### Conversations

Chat history is persisted in Supabase:

- `conversations` — one row per chat thread, linked to a user
- `conversation_messages` — messages with `role` (`user` | `assistant`) and optional `metadata` (for agent plan steps)

### Database Schema

```sql
-- Users
users (id, name, email, emailVerified, image, password_hash)

-- NextAuth adapter tables
accounts (id, userId, provider, providerAccountId, access_token, refresh_token, ...)
sessions (id, sessionToken, userId, expires)
verification_tokens (identifier, token, expires)

-- Gmail
gmail_accounts (id, user_id, email, access_token, refresh_token, expires_at, is_primary, ...)

-- Chat
conversations (id, user_id, title, created_at, updated_at)
conversation_messages (id, conversation_id, role, content, metadata, created_at)
```

## Environment Variables

```
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GMAIL_OAUTH_HMAC_SECRET
```

## What's Left to Build

- [ ] Gmail mutations from chat (send, reply, archive, trash)
- [ ] LLM-based agent reasoning (replace rule-based keyword matching)
- [ ] Rate limiting on Gmail API calls
- [ ] Audit logging for agent actions
- [ ] Onboarding: connect Gmail → animated indexing → success