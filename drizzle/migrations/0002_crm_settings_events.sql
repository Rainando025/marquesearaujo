alter table public.properties add column fotos text[] not null default '{}';

create table public.settings (
  id int primary key default 1 check (id = 1),
  nome_empresa text not null default 'Aurum Imóveis',
  nome_corretor text not null default '',
  creci text not null default '',
  whatsapp text not null default '5571999999999',
  email text not null default '',
  bio text not null default '',
  foto_url text,
  updated_at timestamptz not null default now()
);
grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "public read settings" on public.settings for select to anon, authenticated using (true);
create policy "admin insert settings" on public.settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update settings" on public.settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.settings (id) values (1);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.neighborhoods to anon, authenticated;
grant insert, update, delete on public.neighborhoods to authenticated;
grant all on public.neighborhoods to service_role;
alter table public.neighborhoods enable row level security;
create policy "public read bairros" on public.neighborhoods for select to anon, authenticated using (true);
create policy "admin write bairros" on public.neighborhoods for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.neighborhoods (nome) select distinct bairro from public.properties on conflict do nothing;

create table public.recommendation_queries (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  resultado jsonb not null default '[]',
  created_at timestamptz not null default now()
);
grant select, delete on public.recommendation_queries to authenticated;
grant all on public.recommendation_queries to service_role;
alter table public.recommendation_queries enable row level security;
create policy "admin read consultas" on public.recommendation_queries for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete consultas" on public.recommendation_queries for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null default '',
  email text not null default '',
  interesse text not null default '',
  property_id uuid references public.properties(id) on delete set null,
  origem text not null default 'site',
  status text not null default 'lead',
  notas text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "admin all leads" on public.leads for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  property_id uuid references public.properties(id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_created_idx on public.events(created_at);
grant select on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "admin read events" on public.events for select to authenticated using (public.has_role(auth.uid(),'admin'));