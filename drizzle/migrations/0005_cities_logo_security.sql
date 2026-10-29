-- 0005: Adiciona suporte a logo, cidade, endereço, mapa, tabela de cidades, índices de performance e segurança
alter table public.settings add column if not exists logo_url text;

alter table public.properties add column if not exists cidade text not null default '';
alter table public.properties add column if not exists endereco text not null default '';

alter table public.portfolio add column if not exists cidade text not null default '';
alter table public.portfolio add column if not exists endereco text not null default '';

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
      using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
  end if;
end $$;

-- Índices de performance para otimizar queries e evitar estouro de limites do Supabase
create index if not exists properties_ativo_created_idx on public.properties(ativo, created_at desc);
create index if not exists properties_cidade_bairro_idx on public.properties(cidade, bairro);
create index if not exists events_property_id_idx on public.events(property_id);
create index if not exists events_tipo_created_idx on public.events(tipo, created_at desc);

-- Remove gatilho de criação automática de admin por segurança
drop trigger if exists on_auth_user_created_admin on auth.users;
drop function if exists public.handle_first_admin();
