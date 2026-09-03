-- Lets one account log in under several nicknames (e.g. "พีนัท" and "peanut" both
-- reach the same person). Safe to run on your live project: does not touch
-- sessions/audit_log/other data, just widens how nickname login works.

-- 1. add the new array column and migrate existing single nicknames into it
alter table profiles add column if not exists nicknames text[] not null default '{}';
update profiles set nicknames = array[nickname] where nickname is not null and nicknames = '{}';

-- 2. drop the old single-nickname column now that it's migrated
alter table profiles drop column if exists nickname;

-- 3. replace the login lookup to match any nickname in the array
drop function if exists email_for_nickname(text);

create function email_for_nickname(p_nickname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles
  where is_active and exists (select 1 from unnest(nicknames) n where lower(n) = lower(p_nickname))
  limit 1;
$$;

grant execute on function email_for_nickname(text) to anon, authenticated;
