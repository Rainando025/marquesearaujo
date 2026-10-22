create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- first account created becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  bairro text not null,
  tipo text not null default 'Apartamento',
  negocio text not null default 'Venda',
  preco numeric not null default 0,
  quartos int not null default 1,
  banheiros int not null default 1,
  area int not null default 0,
  descricao text,
  imagem_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;
create policy "public read active" on public.properties for select to anon, authenticated using (ativo or public.has_role(auth.uid(),'admin'));
create policy "admin insert" on public.properties for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.properties for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete" on public.properties for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.properties (titulo,bairro,tipo,negocio,preco,quartos,banheiros,area,descricao,imagem_url) values
('Apartamento 2 quartos com varanda','Pituba','Apartamento','Venda',420000,2,2,68,'Próximo a escolas e comércio, 1 vaga.','/images/hero.jpg'),
('Apartamento vista mar','Barra','Apartamento','Venda',680000,3,2,95,'Andar alto, nascente.','/images/p1.jpg'),
('Casa em condomínio','Stella Maris','Casa','Venda',750000,3,3,160,'Condomínio com área de lazer.','/images/p2.jpg'),
('Cobertura com terraço','Imbuí','Cobertura','Venda',890000,3,3,180,'Terraço com churrasqueira.','/images/p3.jpg'),
('Apartamento mobiliado','Ondina','Apartamento','Aluguel',2800,1,1,45,'Ideal para estudantes e jovens profissionais.','/images/p1.jpg'),
('Casa térrea 3 quartos','Patamares','Casa','Aluguel',4200,3,2,130,'Quintal amplo, aceita pets.','/images/p2.jpg');