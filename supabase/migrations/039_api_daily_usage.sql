-- Pregled 23. 10. 2026: javne rute koje koštaju (AI pomoćnik u turi -> Gemini,
-- mejl agentu -> Resend) imale su samo ograničenje po IP adresi, u memoriji
-- jedne Vercel instance. Skript koji menja IP adrese nije imao gornju granicu
-- troška, a mogao je i da zatrpa agenta mejlovima sa kvadrat360.com.
-- Ovde se broje pozivi po ruti i danu (vreme u Srbiji), za ceo sajt zajedno.
-- Čita je i piše samo server (service_role) preko bump_api_usage.

create table if not exists public.api_daily_usage (
  route text not null,
  day date not null,
  count integer not null default 0,
  primary key (route, day)
);

alter table public.api_daily_usage enable row level security;

revoke all on public.api_daily_usage from anon, authenticated;
grant select, insert, update on public.api_daily_usage to service_role;

-- Uveća brojač za današnji dan i vrati novu vrednost (atomično, i kad više
-- instanci broji istovremeno).
create or replace function public.bump_api_usage(p_route text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.api_daily_usage as u (route, day, count)
  values (p_route, (now() at time zone 'Europe/Belgrade')::date, 1)
  on conflict (route, day) do update set count = u.count + 1
  returning u.count;
$$;

revoke all on function public.bump_api_usage(text) from public, anon, authenticated;
grant execute on function public.bump_api_usage(text) to service_role;
