-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New member',
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  avatar_bg text not null default '#dce8df',
  avatar_color text not null default '#42644c',
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friendship_not_self check (requester_id <> addressee_id),
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);

create table if not exists public.ledgers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name_zh text not null,
  name_en text not null,
  icon_color text not null default '#416f54',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_members (
  ledger_id uuid not null references public.ledgers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ledger_members_user_id_idx on public.ledger_members(user_id);
create index if not exists expenses_ledger_created_idx on public.expenses(ledger_id, created_at desc);
create index if not exists friendships_addressee_status_idx on public.friendships(addressee_id, status);
create unique index if not exists friendships_symmetric_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create or replace function public.is_ledger_member(check_ledger_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ledger_members m
    where m.ledger_id = check_ledger_id and m.user_id = (select auth.uid()));
$$;
create or replace function public.is_ledger_owner(check_ledger_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ledgers l
    where l.id = check_ledger_id and l.owner_id = (select auth.uid()));
$$;
create or replace function public.is_accepted_friend(friend_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester_id = (select auth.uid()) and f.addressee_id = friend_user_id)
      or (f.addressee_id = (select auth.uid()) and f.requester_id = friend_user_id)));
$$;
revoke all on function public.is_ledger_member(uuid) from public, anon;
revoke all on function public.is_ledger_owner(uuid) from public, anon;
revoke all on function public.is_accepted_friend(uuid) from public, anon;
grant execute on function public.is_ledger_member(uuid) to authenticated;
grant execute on function public.is_ledger_owner(uuid) to authenticated;
grant execute on function public.is_accepted_friend(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_daybook on auth.users;
create trigger on_auth_user_created_daybook
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.send_friend_request_by_code(friend_code_input text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  select id into target_id from public.profiles
    where friend_code = upper(trim(friend_code_input));
  if target_id is null then raise exception '未找到该好友码'; end if;
  if target_id = auth.uid() then raise exception '不能添加自己'; end if;
  if exists (select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester_id = auth.uid() and f.addressee_id = target_id)
      or (f.addressee_id = auth.uid() and f.requester_id = target_id))) then
    raise exception '已经是好友';
  end if;
  if exists (select 1 from public.friendships f where f.status = 'pending'
    and ((f.requester_id = auth.uid() and f.addressee_id = target_id)
      or (f.addressee_id = auth.uid() and f.requester_id = target_id))) then
    update public.friendships set status = 'accepted'
      where status = 'pending' and ((requester_id = auth.uid() and addressee_id = target_id)
        or (addressee_id = auth.uid() and requester_id = target_id));
    return;
  end if;
  delete from public.friendships where status = 'declined'
    and ((requester_id = auth.uid() and addressee_id = target_id)
      or (addressee_id = auth.uid() and requester_id = target_id));
  insert into public.friendships (requester_id, addressee_id) values (auth.uid(), target_id);
end;
$$;

grant execute on function public.send_friend_request_by_code(text) to authenticated;
revoke all on function public.send_friend_request_by_code(text) from public, anon;
grant execute on function public.send_friend_request_by_code(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;
alter table public.expenses enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.ledgers to authenticated;
grant select, insert, update, delete on public.ledger_members to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['expenses', 'friendships', 'ledger_members', 'ledgers'] loop
    if not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

drop policy if exists "profiles readable by self, friends, and ledger peers" on public.profiles;
create policy "profiles readable by self, friends, and ledger peers" on public.profiles
for select to authenticated using (
  id = (select auth.uid())
  or public.is_accepted_friend(profiles.id)
  or exists (select 1 from public.friendships f where f.status = 'pending'
    and ((f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
      or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id)))
  or exists (select 1 from public.ledger_members peer
    where peer.user_id = profiles.id and public.is_ledger_member(peer.ledger_id))
);
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profile owner updates own profile" on public.profiles;
create policy "profile owner updates own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "friendship participants read requests" on public.friendships;
create policy "friendship participants read requests" on public.friendships
for select to authenticated using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
drop policy if exists "users send friend requests" on public.friendships;
create policy "users send friend requests" on public.friendships
for insert to authenticated with check (requester_id = (select auth.uid()) and addressee_id <> (select auth.uid()));
drop policy if exists "recipients answer friend requests" on public.friendships;
create policy "recipients answer friend requests" on public.friendships
for update to authenticated using (addressee_id = (select auth.uid()) and status = 'pending')
with check (addressee_id = (select auth.uid()) and status in ('accepted', 'declined'));

drop policy if exists "ledger members read ledgers" on public.ledgers;
create policy "ledger members read ledgers" on public.ledgers
for select to authenticated using (owner_id = (select auth.uid()) or public.is_ledger_member(ledgers.id));
drop policy if exists "users create own ledgers" on public.ledgers;
create policy "users create own ledgers" on public.ledgers
for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "ledger owners update ledgers" on public.ledgers;
create policy "ledger owners update ledgers" on public.ledgers
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "ledger members read membership" on public.ledger_members;
create policy "ledger members read membership" on public.ledger_members
for select to authenticated using (public.is_ledger_member(ledger_members.ledger_id));
drop policy if exists "owners add ledger members" on public.ledger_members;
create policy "owners add ledger members" on public.ledger_members
for insert to authenticated with check (
  (user_id = (select auth.uid()) and role = 'owner' and public.is_ledger_owner(ledger_id))
  or (public.is_ledger_owner(ledger_id) and public.is_accepted_friend(user_id))
);
drop policy if exists "owners remove ledger members" on public.ledger_members;
create policy "owners remove ledger members" on public.ledger_members
for delete to authenticated using (public.is_ledger_owner(ledger_id));

drop policy if exists "ledger members read expenses" on public.expenses;
create policy "ledger members read expenses" on public.expenses
for select to authenticated using (public.is_ledger_member(expenses.ledger_id));
drop policy if exists "ledger members create expenses" on public.expenses;
create policy "ledger members create expenses" on public.expenses
for insert to authenticated with check (created_by = (select auth.uid()) and public.is_ledger_member(expenses.ledger_id));
drop policy if exists "ledger members update expenses" on public.expenses;
create policy "ledger members update expenses" on public.expenses
for update to authenticated using (public.is_ledger_member(expenses.ledger_id))
with check (public.is_ledger_member(expenses.ledger_id));
drop policy if exists "expense creators or ledger owners delete expenses" on public.expenses;
create policy "expense creators or ledger owners delete expenses" on public.expenses
for delete to authenticated using (created_by = (select auth.uid()) or public.is_ledger_owner(ledger_id));
