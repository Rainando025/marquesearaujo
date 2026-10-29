-- ==============================================================================
-- SETUP COMPLETO DO BANCO DE DADOS SUPABASE - IMOBILIÁRIA MARQUES E ARAÚJO
-- Execute este script no SQL Editor do seu projeto Supabase para criar ou atualizar
-- toda a estrutura de tabelas, índices de performance, RLS e permissões.
-- ==============================================================================

-- 1. TIPO DE PERMISSÃO E FUNÇÃO DE CHECAGEM
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_roles' and policyname = 'read own roles') then
    create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- 2. CONFIGURAÇÕES DA IMOBILIÁRIA (TABELA SINGLE-ROW)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  nome_empresa text not null default 'Marques e Araújo Imóveis',
  nome_corretor text not null default '',
  creci text not null default '',
  whatsapp text not null default '5571999999999',
  email text not null default '',
  bio text not null default '',
  foto_url text,
  logo_url text,
  updated_at timestamptz not null default now()
);
grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'settings' and policyname = 'public read settings') then
    create policy "public read settings" on public.settings for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'settings' and policyname = 'admin insert settings') then
    create policy "admin insert settings" on public.settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'settings' and policyname = 'admin update settings') then
    create policy "admin update settings" on public.settings for update to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 3. CIDADES (GERENCIADAS PELO ADMIN)
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.cities to anon, authenticated;
grant insert, update, delete on public.cities to authenticated;
grant all on public.cities to service_role;
alter table public.cities enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'cities' and policyname = 'public read cidades') then
    create policy "public read cidades" on public.cities for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'cities' and policyname = 'admin write cidades') then
    create policy "admin write cidades" on public.cities for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 4. BAIRROS (GERENCIADOS PELO ADMIN)
create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.neighborhoods to anon, authenticated;
grant insert, update, delete on public.neighborhoods to authenticated;
grant all on public.neighborhoods to service_role;
alter table public.neighborhoods enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'neighborhoods' and policyname = 'public read bairros') then
    create policy "public read bairros" on public.neighborhoods for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'neighborhoods' and policyname = 'admin write bairros') then
    create policy "admin write bairros" on public.neighborhoods for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 5. CATÁLOGO DE IMÓVEIS (VITRINE DO SITE)
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cidade text not null default '',
  bairro text not null default '',
  endereco text not null default '',
  tipo text not null default 'Apartamento',
  negocio text not null default 'Venda',
  preco numeric not null default 0,
  quartos int not null default 1,
  banheiros int not null default 1,
  area int not null default 0,
  descricao text,
  imagem_url text,
  fotos text[] not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'properties' and policyname = 'public read active') then
    create policy "public read active" on public.properties for select to anon, authenticated using (ativo or public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'properties' and policyname = 'admin insert') then
    create policy "admin insert" on public.properties for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'properties' and policyname = 'admin update') then
    create policy "admin update" on public.properties for update to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'properties' and policyname = 'admin delete') then
    create policy "admin delete" on public.properties for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 6. CARTEIRA DE CAPTAÇÕES (INTERNO DO CORRETOR)
create table if not exists public.portfolio (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cidade text not null default '',
  bairro text not null default '',
  endereco text not null default '',
  tipo text not null default 'Apartamento',
  negocio text not null default 'Venda',
  proprietario text not null default '',
  data_entrada date not null default current_date,
  status text not null default 'captado',
  valor numeric not null default 0,
  notas text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.portfolio to authenticated;
grant all on public.portfolio to service_role;
alter table public.portfolio enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'portfolio' and policyname = 'admin all portfolio') then
    create policy "admin all portfolio" on public.portfolio for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 7. LEADS E CONTATOS DE CLIENTES
create table if not exists public.leads (
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'leads' and policyname = 'admin all leads') then
    create policy "admin all leads" on public.leads for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 8. EVENTOS DE NAVEGAÇÃO E ACESSOS (ANALYTICS)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  property_id uuid references public.properties(id) on delete set null,
  ip text,
  pagina text,
  user_agent text,
  created_at timestamptz not null default now()
);
grant select on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'admin read events') then
    create policy "admin read events" on public.events for select to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 9. CONSULTAS DE RECOMENDAÇÃO INTELIGENTE
create table if not exists public.recommendation_queries (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  resultado jsonb not null default '[]',
  created_at timestamptz not null default now()
);
grant select, delete on public.recommendation_queries to authenticated;
grant all on public.recommendation_queries to service_role;
alter table public.recommendation_queries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'recommendation_queries' and policyname = 'admin read consultas') then
    create policy "admin read consultas" on public.recommendation_queries for select to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recommendation_queries' and policyname = 'admin delete consultas') then
    create policy "admin delete consultas" on public.recommendation_queries for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 10. BUCKET DE ARMAZENAMENTO PRIVADO PARA FOTOS
insert into storage.buckets (id, name, public)
values ('imoveis', 'imoveis', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'admin manage imoveis files') then
    create policy "admin manage imoveis files" on storage.objects for all to authenticated
      using (bucket_id = 'imoveis' and public.has_role(auth.uid(), 'admin'))
      with check (bucket_id = 'imoveis' and public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- 11. ÍNDICES DE PERFORMANCE (PROTEÇÃO CONTRA ESTOURO DE COTAS SUPABASE)
create index if not exists properties_ativo_created_idx on public.properties(ativo, created_at desc);
create index if not exists properties_cidade_bairro_idx on public.properties(cidade, bairro);
create index if not exists events_created_idx on public.events(created_at desc);
create index if not exists events_property_id_idx on public.events(property_id);
create index if not exists events_tipo_created_idx on public.events(tipo, created_at desc);

-- 12. REMOVE GATILHO DE PRIMEIRO ACESSO PÚBLICO (SEGURANÇA TOTAL)
drop trigger if exists on_auth_user_created_admin on auth.users;
drop function if exists public.handle_first_admin();

-- ==============================================================================
-- COMO PROMOVER OU VERIFICAR UM USUÁRIO COMO ADMINISTRADOR:
--
-- Para verificar quem já é admin:
--   select u.id, u.email, r.role
--   from auth.users u
--   join public.user_roles r on r.user_id = u.id
--   where r.role = 'admin';
--
-- Para promover um usuário existente para admin (substitua pelo e-mail desejado):
--   insert into public.user_roles (user_id, role)
--   select id, 'admin'::app_role from auth.users where email = 'seu-email@dominio.com'
--   on conflict (user_id, role) do nothing;
-- ==============================================================================

