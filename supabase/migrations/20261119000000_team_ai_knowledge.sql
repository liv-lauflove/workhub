create table public.ai_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  markdown text not null check (
    octet_length(markdown) <= 65536 and btrim(markdown) <> ''
  ),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (team_id, version),
  check (status <> 'published' or published_at is not null)
);

create unique index ai_knowledge_one_published_per_team
  on public.ai_knowledge_documents (team_id) where status = 'published';

create unique index ai_knowledge_one_draft_per_team
  on public.ai_knowledge_documents (team_id) where status = 'draft';

alter table public.ai_knowledge_documents enable row level security;
revoke all on table public.ai_knowledge_documents from public, anon, authenticated;
grant select on table public.ai_knowledge_documents to authenticated;

create function public.can_manage_ai_knowledge()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'leader'
      and p.team_id = 'e3333333-3333-3333-3333-333333333333'::uuid
  );
$$;

revoke all on function public.can_manage_ai_knowledge() from public, anon, authenticated;
grant execute on function public.can_manage_ai_knowledge() to authenticated;

create policy ai_knowledge_read on public.ai_knowledge_documents
  for select to authenticated
  using (
    (select public.can_manage_ai_knowledge())
    or (
      status = 'published'
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'leader'
          and p.team_id = ai_knowledge_documents.team_id
      )
    )
  );

-- Cached SOP answers inherit the current visibility of their source.
drop policy if exists ai_query_cache_select_own on public.ai_query_cache;
create policy ai_query_cache_select_own on public.ai_query_cache
  for select to authenticated
  using (
    user_id = (select auth.uid()) and expires_at > now()
    and (
      cache_scope not like 'knowledge:%'
      or exists (
        select 1 from public.ai_knowledge_documents d
        where 'knowledge:' || d.id::text = ai_query_cache.cache_scope
          and d.team_id = ai_query_cache.team_id and d.status = 'published'
      )
    )
  );

create function public.create_ai_knowledge_draft(
  p_team_id uuid, p_title text, p_markdown text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.can_manage_ai_knowledge() then
    raise exception 'Knowledge base management is restricted to Management leaders' using errcode = '42501';
  end if;

  -- Serialize revisions for one team, including the first upload.
  perform 1 from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  update public.ai_knowledge_documents set status = 'archived'
  where team_id = p_team_id and status = 'draft';

  insert into public.ai_knowledge_documents (team_id, version, title, markdown, uploaded_by)
  select p_team_id, coalesce(max(version), 0) + 1, btrim(p_title), p_markdown, auth.uid()
  from public.ai_knowledge_documents where team_id = p_team_id
  returning id into new_id;

  return new_id;
end;
$$;

create function public.set_ai_knowledge_document_state(p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.ai_knowledge_documents%rowtype;
begin
  if not public.can_manage_ai_knowledge() then
    raise exception 'Knowledge base management is restricted to Management leaders' using errcode = '42501';
  end if;

  perform 1 from public.teams
  where id = (select team_id from public.ai_knowledge_documents where id = p_id)
  for update;

  select * into strict target from public.ai_knowledge_documents where id = p_id;

  case p_action
    when 'publish' then
      if target.status <> 'draft' or exists (
        select 1 from public.ai_knowledge_documents
        where team_id = target.team_id and version > target.version and published_at is not null
      ) then
        raise exception 'Only a newer draft can be published' using errcode = '22023';
      end if;

      if target.markdown !~ '(?m)^ {0,3}#{1,6}[[:blank:]]+[^[:space:]]' then
        raise exception 'Markdown requires headings' using errcode = '22023';
      end if;

      update public.ai_knowledge_documents set status = 'archived'
      where team_id = target.team_id and status = 'published';

      update public.ai_knowledge_documents set status = 'published', published_at = now()
      where id = p_id;
    when 'withdraw' then
      if target.status <> 'published' then
        raise exception 'Only a published document can be withdrawn' using errcode = '22023';
      end if;

      update public.ai_knowledge_documents set status = 'archived' where id = p_id;
    else
      raise exception 'Unknown knowledge document action' using errcode = '22023';
  end case;
end;
$$;

revoke all on function public.create_ai_knowledge_draft(uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_ai_knowledge_document_state(uuid, text) from public, anon, authenticated;
grant execute on function public.create_ai_knowledge_draft(uuid, text, text) to authenticated;
grant execute on function public.set_ai_knowledge_document_state(uuid, text) to authenticated;

notify pgrst, 'reload schema';
