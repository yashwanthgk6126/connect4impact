# Connect4Impact

An open community platform where people discover activities, share initiatives, organize events, volunteer, redistribute food and collectively solve local problems.

- **Visitors** can browse the Community Feed and Explore Activities without an account.
- **Registered users** can post, upload photographs, host events, request volunteers, join activities, like, comment and report content.
- **Admins** can remove any content, suspend/ban users and review reports.

Stack: React + Vite + TypeScript + Tailwind CSS, Supabase (Postgres, Auth, Storage, Row Level Security).

## App structure

| Area | Routes |
| --- | --- |
| Public website | `/` Community Feed, `/explore` Explore Activities, `/events/:id` activity details |
| Authentication | `/login`, `/signup` |
| User dashboard | `/dashboard` overview, `create-post`, `host-event`, `volunteer`, `food`, `issues`, `polls`, `impact-ai`, `activities`, `profile` |
| Admin dashboard | `/admin` reports, `/admin/users` user management, `/admin/content` content moderation |

Creating an event inserts it into `events`; a database trigger (`sync_event_post`) automatically creates/updates the matching `posts` row, so every event appears in both Explore Activities and the Community Feed without publishing twice.

## Database

All schema, triggers, RLS policies and the `media` storage bucket live in `supabase/migrations/20261124000000_init.sql`:

`profiles`, `posts`, `post_likes`, `comments`, `events`, `event_participants`, `food_donations`, `food_requests`, `issue_reports`, `polls`, `poll_votes`, `user_reports`.

Access rules (enforced in Postgres, not just the UI):

- Everyone (including anonymous visitors) can read published content.
- Registered, non-suspended users can create content as themselves only.
- Authors can edit/delete their own content; only admins can set content to `removed`, change roles or suspend users.
- Suspended users can still browse but cannot post, comment, like, join, vote or upload.

## Setup with a hosted Supabase project

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run `supabase/migrations/20261124000000_init.sql` (or `supabase link --project-ref <ref> && supabase db push`).
3. The database starts empty. Create your account, then promote yourself to admin with the SQL below. (`supabase/tests/fixtures.sql` holds sample users/content used only by `scripts/rls-test.mjs` locally.)
4. Copy `.env.example` to `.env.local` and fill in your project URL and anon key (Project Settings → API).
5. `npm install && npm run dev`.

For quick demos you may want to disable **Confirm email** under Authentication → Providers → Email.

### Making someone an admin

Run in the SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Local development with the Supabase CLI

```bash
supabase start          # requires Docker
supabase db reset       # applies migration (empty database)
cp .env.example .env.local   # use the API URL and anon key printed by `supabase status`
npm install
npm run dev
```

## Deploying

`npm run build` outputs a static site in `dist/`. SPA rewrites are included for Vercel (`vercel.json`) and Netlify (`public/_redirects`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's environment variables.
