-- Connect4Impact schema: open community platform
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  location text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not is_suspended);
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_suspended);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'location'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins (or the database owner / service role, where auth.uid() is null) may change role or suspension.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_suspended is distinct from old.is_suspended)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can change roles or suspend users';
  end if;
  if new.id = auth.uid() and new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Administrators cannot change their own role';
  end if;
  return new;
end;
$$;

create trigger guard_profile_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- events (community activities)
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  description text not null default '',
  category text not null default 'other' check (category in
    ('environment', 'food', 'health', 'education', 'animal_welfare', 'cleanup', 'elderly_care', 'fundraising', 'other')),
  location text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  volunteers_needed integer not null default 0 check (volunteers_needed >= 0),
  image_url text,
  status text not null default 'published' check (status in ('published', 'cancelled', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_start_at_idx on public.events (start_at);
create index events_category_idx on public.events (category);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- posts / likes / comments
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type text not null default 'update' check (post_type in
    ('update', 'announcement', 'photo', 'volunteer', 'event', 'help_request')),
  title text,
  content text not null default '',
  image_url text,
  location text,
  event_id uuid unique references public.events(id) on delete cascade,
  status text not null default 'published' check (status in ('published', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- An event automatically appears in the Community Feed: one linked post per event.
create or replace function public.sync_event_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.posts (author_id, post_type, title, content, image_url, location, event_id, status, created_at)
    values (new.host_id, 'event', new.title, new.description, new.image_url, new.location, new.id,
            case when new.status = 'removed' then 'removed' else 'published' end, new.created_at);
  else
    update public.posts
       set title = new.title, content = new.description, image_url = new.image_url, location = new.location,
           status = case when new.status = 'removed' then 'removed' else 'published' end,
           updated_at = now()
     where event_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sync_event_post
  after insert or update on public.events
  for each row execute function public.sync_event_post();

-- Prevent anyone except admins from setting moderation status 'removed'
create or replace function public.guard_removed_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'removed' and (tg_op = 'INSERT' or old.status is distinct from 'removed')
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can remove content';
  end if;
  if tg_op = 'UPDATE' and old.status = 'removed' and new.status <> 'removed'
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can restore removed content';
  end if;
  return new;
end;
$$;

create trigger guard_removed_status before insert or update on public.events
  for each row execute function public.guard_removed_status();
create trigger guard_removed_status before insert or update on public.posts
  for each row execute function public.guard_removed_status();

-- ---------------------------------------------------------------------------
-- food
-- ---------------------------------------------------------------------------
create table public.food_donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.profiles(id) on delete cascade,
  food_item text not null,
  quantity text not null,
  location text not null,
  pickup_by timestamptz,
  contact text,
  notes text,
  status text not null default 'available' check (status in ('available', 'claimed', 'collected')),
  claimed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.food_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  people_count integer not null default 1 check (people_count > 0),
  location text not null,
  needed_by timestamptz,
  contact text,
  status text not null default 'open' check (status in ('open', 'fulfilled')),
  created_at timestamptz not null default now()
);

create or replace function public.claim_food_donation(donation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_user() then
    raise exception 'You must be signed in to claim food';
  end if;
  update public.food_donations
     set status = 'claimed', claimed_by = auth.uid()
   where id = donation_id and status = 'available' and donor_id <> auth.uid();
  if not found then
    raise exception 'This donation is no longer available';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- issue reports
-- ---------------------------------------------------------------------------
create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'other' check (category in
    ('roads', 'garbage', 'water', 'electricity', 'safety', 'pollution', 'other')),
  location text not null,
  image_url text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- polls
-- ---------------------------------------------------------------------------
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  options text[] not null check (array_length(options, 1) between 2 and 6),
  location text,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create or replace function public.validate_poll_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.polls;
begin
  select * into p from public.polls where id = new.poll_id;
  if new.option_index >= array_length(p.options, 1) then
    raise exception 'Invalid poll option';
  end if;
  if p.closes_at is not null and p.closes_at < now() then
    raise exception 'This poll is closed';
  end if;
  return new;
end;
$$;

create trigger validate_poll_vote before insert on public.poll_votes
  for each row execute function public.validate_poll_vote();

-- ---------------------------------------------------------------------------
-- user reports (inappropriate users / content)
-- ---------------------------------------------------------------------------
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (reported_user_id is not null or post_id is not null or comment_id is not null or event_id is not null)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.food_donations enable row level security;
alter table public.food_requests enable row level security;
alter table public.issue_reports enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.user_reports enable row level security;

-- profiles
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- events
create policy "Published events are public" on public.events for select
  using (status <> 'removed' or host_id = auth.uid() or public.is_admin());
create policy "Registered users host events" on public.events for insert to authenticated
  with check (host_id = auth.uid() and public.is_active_user());
create policy "Hosts and admins update events" on public.events for update to authenticated
  using (host_id = auth.uid() or public.is_admin());
create policy "Hosts and admins delete events" on public.events for delete to authenticated
  using (host_id = auth.uid() or public.is_admin());

-- event participants
create policy "Participants are public" on public.event_participants for select using (true);
create policy "Registered users join activities" on public.event_participants for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy "Users leave, hosts and admins manage" on public.event_participants for delete to authenticated
  using (user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- posts
create policy "Published posts are public" on public.posts for select
  using (status = 'published' or author_id = auth.uid() or public.is_admin());
create policy "Registered users create posts" on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user() and post_type <> 'event' and event_id is null);
create policy "Authors and admins update posts" on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "Authors and admins delete posts" on public.posts for delete to authenticated
  using ((author_id = auth.uid() and event_id is null) or public.is_admin());

-- likes
create policy "Likes are public" on public.post_likes for select using (true);
create policy "Registered users like" on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());
create policy "Users unlike" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- comments
create policy "Comments are public" on public.comments for select using (true);
create policy "Registered users comment" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user());
create policy "Authors edit comments" on public.comments for update to authenticated using (author_id = auth.uid());
create policy "Authors and admins delete comments" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- food donations
create policy "Food donations are public" on public.food_donations for select using (true);
create policy "Registered users donate food" on public.food_donations for insert to authenticated
  with check (donor_id = auth.uid() and public.is_active_user());
create policy "Donors and admins update donations" on public.food_donations for update to authenticated
  using (donor_id = auth.uid() or public.is_admin());
create policy "Donors and admins delete donations" on public.food_donations for delete to authenticated
  using (donor_id = auth.uid() or public.is_admin());

-- food requests
create policy "Food requests are public" on public.food_requests for select using (true);
create policy "Registered users request food" on public.food_requests for insert to authenticated
  with check (requester_id = auth.uid() and public.is_active_user());
create policy "Requesters and admins update requests" on public.food_requests for update to authenticated
  using (requester_id = auth.uid() or public.is_admin());
create policy "Requesters and admins delete requests" on public.food_requests for delete to authenticated
  using (requester_id = auth.uid() or public.is_admin());

-- issue reports
create policy "Issue reports are public" on public.issue_reports for select using (true);
create policy "Registered users report issues" on public.issue_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());
create policy "Reporters and admins update issues" on public.issue_reports for update to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy "Reporters and admins delete issues" on public.issue_reports for delete to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- polls
create policy "Polls are public" on public.polls for select using (true);
create policy "Registered users create polls" on public.polls for insert to authenticated
  with check (creator_id = auth.uid() and public.is_active_user());
create policy "Creators and admins delete polls" on public.polls for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- poll votes
create policy "Poll votes are public" on public.poll_votes for select using (true);
create policy "Registered users vote once" on public.poll_votes for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

-- user reports
create policy "Reporters and admins see reports" on public.user_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy "Registered users report content" on public.user_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user() and status = 'open');
create policy "Admins review reports" on public.user_reports for update to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public media bucket, users upload into their own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

create policy "Media is public" on storage.objects for select using (bucket_id = 'media');
create policy "Registered users upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user());
create policy "Owners and admins delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
