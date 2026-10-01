-- Anonymous engagement only. Chat messages and AI responses are never stored here.
create table if not exists public.portfolio_visitors (
    id uuid primary key,
    created_at timestamptz not null default now()
);
create table if not exists public.portfolio_visits (
    id uuid primary key,
    visitor_id uuid not null references public.portfolio_visitors(id),
    created_at timestamptz not null default now()
);
create index if not exists portfolio_visits_visitor_idx on public.portfolio_visits(visitor_id);
create table if not exists public.portfolio_likes (
    visitor_id uuid primary key references public.portfolio_visitors(id),
    created_at timestamptz not null default now()
);
create table if not exists public.portfolio_stats (
    id smallint primary key check (id = 1),
    views bigint not null default 0 check (views >= 0),
    likes bigint not null default 0 check (likes >= 0),
    visitors bigint not null default 0 check (visitors >= 0),
    revision bigint not null default 0 check (revision >= 0)
);
insert into public.portfolio_stats(id) values (1) on conflict (id) do nothing;

alter table public.portfolio_visitors enable row level security;
alter table public.portfolio_visits enable row level security;
alter table public.portfolio_likes enable row level security;
alter table public.portfolio_stats enable row level security;
-- Access goes through the server API. Browser keys cannot read visitor IDs or mutate counters.
revoke all on public.portfolio_visitors, public.portfolio_visits, public.portfolio_likes, public.portfolio_stats from public, anon, authenticated;
grant select, insert, update, delete on public.portfolio_visitors, public.portfolio_visits, public.portfolio_likes, public.portfolio_stats to service_role;

create or replace function public.portfolio_stats_snapshot(p_visitor_id uuid)
returns table (views bigint, likes bigint, visitors bigint, revision bigint, liked boolean)
language sql stable security invoker set search_path = ''
as $$
    select s.views, s.likes, s.visitors, s.revision,
        exists (select 1 from public.portfolio_likes l where l.visitor_id = p_visitor_id)
    from public.portfolio_stats s where s.id = 1;
$$;

create or replace function public.portfolio_record_visit(p_visitor_id uuid, p_visit_id uuid)
returns table (views bigint, likes bigint, visitors bigint, revision bigint, liked boolean)
language plpgsql security invoker set search_path = ''
as $$
declare
    inserted integer;
    first_visit boolean;
begin
    if p_visitor_id is null or p_visit_id is null then
        raise exception 'Visitor and visit IDs are required' using errcode = '22004';
    end if;
    -- Serialize the short mutation so concurrent retries cannot double count.
    perform 1 from public.portfolio_stats s where s.id = 1 for update;
    insert into public.portfolio_visitors(id) values (p_visitor_id) on conflict (id) do nothing;
    first_visit := not exists (select 1 from public.portfolio_visits v where v.visitor_id = p_visitor_id);
    insert into public.portfolio_visits(id, visitor_id) values (p_visit_id, p_visitor_id) on conflict (id) do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
        update public.portfolio_stats s set views = s.views + 1,
            visitors = s.visitors + case when first_visit then 1 else 0 end,
            revision = s.revision + 1 where s.id = 1;
    end if;
    return query select * from public.portfolio_stats_snapshot(p_visitor_id);
end;
$$;

create or replace function public.portfolio_set_like(p_visitor_id uuid, p_liked boolean)
returns table (views bigint, likes bigint, visitors bigint, revision bigint, liked boolean)
language plpgsql security invoker set search_path = ''
as $$
declare
    changed integer;
begin
    if p_visitor_id is null or p_liked is null then
        raise exception 'Visitor ID and like state are required' using errcode = '22004';
    end if;
    perform 1 from public.portfolio_stats s where s.id = 1 for update;
    insert into public.portfolio_visitors(id) values (p_visitor_id) on conflict (id) do nothing;
    if p_liked then
        insert into public.portfolio_likes(visitor_id) values (p_visitor_id) on conflict (visitor_id) do nothing;
    else
        delete from public.portfolio_likes l where l.visitor_id = p_visitor_id;
    end if;
    get diagnostics changed = row_count;
    if changed > 0 then
        update public.portfolio_stats s set likes = s.likes + case when p_liked then 1 else -1 end,
            revision = s.revision + 1 where s.id = 1;
    end if;
    return query select * from public.portfolio_stats_snapshot(p_visitor_id);
end;
$$;

revoke execute on function public.portfolio_stats_snapshot(uuid) from public, anon, authenticated;
revoke execute on function public.portfolio_record_visit(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.portfolio_set_like(uuid, boolean) from public, anon, authenticated;
grant execute on function public.portfolio_stats_snapshot(uuid) to service_role;
grant execute on function public.portfolio_record_visit(uuid, uuid) to service_role;
grant execute on function public.portfolio_set_like(uuid, boolean) to service_role;
notify pgrst, 'reload schema';
