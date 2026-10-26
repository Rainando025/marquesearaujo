create table public.portfolio (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  bairro text not null default '',
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
create policy "admin all portfolio" on public.portfolio for all to authenticated
using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));