-- Demo data (password for every demo account: Demo@1234)
do $$
declare
  u record;
begin
  for u in select * from (values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'rahul@demo.connect4impact.org', 'Rahul', 'Bengaluru'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'priya@demo.connect4impact.org', 'Priya', 'Yelahanka'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'arun@demo.connect4impact.org', 'Arun', 'Bengaluru'),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'admin@demo.connect4impact.org', 'Platform Admin', 'Bengaluru')
  ) as t(id, email, full_name, location)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      crypt('Demo@1234', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name, 'location', u.location),
      now(), now(), '', '', '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now());
  end loop;
end $$;

update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

insert into public.events (host_id, title, description, category, location, start_at, volunteers_needed, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'Tree Plantation', 'Join us to plant 200 native saplings around Cubbon Park. Gloves and saplings provided.', 'environment', 'Bengaluru', '2026-11-28 07:00+05:30', 15, now() - interval '3 hours'),
  ('22222222-2222-2222-2222-222222222222', 'Food Distribution', 'Distributing cooked meals to families near Yelahanka bus stand. Help pack and serve.', 'food', 'Yelahanka', '2026-11-29 12:00+05:30', 10, now() - interval '2 hours'),
  ('33333333-3333-3333-3333-333333333333', 'Blood Donation Camp', 'Blood donation camp in partnership with the city blood bank. Walk-in donors welcome.', 'health', 'Bengaluru', '2026-11-30 09:00+05:30', 0, now() - interval '1 hour');

insert into public.posts (author_id, post_type, title, content, location, created_at) values
  ('22222222-2222-2222-2222-222222222222', 'announcement', 'Community kitchen now open on weekends', 'Our Yelahanka community kitchen will now serve meals every Saturday and Sunday. Everyone is welcome!', 'Yelahanka', now() - interval '5 hours'),
  ('33333333-3333-3333-3333-333333333333', 'help_request', 'Need wheelchairs for senior citizens', 'Our old-age home needs 3 wheelchairs. If you can donate or lend one, please comment.', 'Bengaluru', now() - interval '30 minutes');

insert into public.food_donations (donor_id, food_item, quantity, location, pickup_by, notes) values
  ('11111111-1111-1111-1111-111111111111', 'Vegetable biryani', 'Serves 25', 'Indiranagar, Bengaluru', now() + interval '6 hours', 'Freshly cooked, packed in containers');

insert into public.food_requests (requester_id, description, people_count, location) values
  ('22222222-2222-2222-2222-222222222222', 'Dry rations for night-shelter residents', 40, 'Yelahanka');

insert into public.issue_reports (reporter_id, title, description, category, location) values
  ('33333333-3333-3333-3333-333333333333', 'Overflowing garbage near metro station', 'Garbage has not been cleared for 4 days.', 'garbage', 'MG Road, Bengaluru');

insert into public.polls (creator_id, question, options, location) values
  ('11111111-1111-1111-1111-111111111111', 'Which park should we clean up next month?', array['Cubbon Park', 'Lalbagh', 'Ulsoor Lake'], 'Bengaluru');
