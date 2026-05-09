create extension if not exists pgcrypto;

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rotas (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  empresa text not null,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  km numeric(12,2) not null default 0 check (km >= 0),
  duracao integer not null default 0 check (duracao >= 0),
  qtd_entregas integer not null default 0 check (qtd_entregas >= 0),
  consumo_veiculo numeric(12,2) default 0 check (consumo_veiculo >= 0),
  preco_combustivel numeric(12,2) default 0 check (preco_combustivel >= 0),
  custo_por_km numeric(12,2) not null default 0 check (custo_por_km >= 0),
  custo_por_km_inclui_combustivel boolean not null default false,
  ajudante numeric(12,2) not null default 0 check (ajudante >= 0),
  outros numeric(12,2) not null default 0 check (outros >= 0),
  sync_operation_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vales (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data_vale date not null,
  valor_vale numeric(12,2) not null default 0 check (valor_vale >= 0),
  descricao text,
  sync_operation_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rotas_user_sync_operation_idx
  on public.rotas(user_id, sync_operation_id)
  where sync_operation_id is not null;

create unique index if not exists vales_user_sync_operation_idx
  on public.vales(user_id, sync_operation_id)
  where sync_operation_id is not null;

create index if not exists rotas_user_data_idx on public.rotas(user_id, data);
create index if not exists vales_user_data_idx on public.vales(user_id, data_vale);

alter table public.usuarios enable row level security;
alter table public.rotas enable row level security;
alter table public.vales enable row level security;

drop policy if exists "usuarios_select_own" on public.usuarios;
create policy "usuarios_select_own" on public.usuarios
  for select using (auth.uid() = id);

drop policy if exists "usuarios_update_own" on public.usuarios;
create policy "usuarios_update_own" on public.usuarios
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "rotas_crud_own" on public.rotas;
create policy "rotas_crud_own" on public.rotas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vales_crud_own" on public.vales;
create policy "vales_crud_own" on public.vales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
