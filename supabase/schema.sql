-- Core raw table used by ingestion pipeline.
create table if not exists public.raw_tools (
    id text not null,
    name text not null,
    source text not null,
    description text,
    url text,
    score integer default 0,
    created_at timestamptz,
    ingested_at timestamptz not null default now(),
    constraint raw_tools_pk primary key (id, source)
);

create index if not exists idx_raw_tools_source_created_at
    on public.raw_tools (source, created_at desc);

create index if not exists idx_raw_tools_ingested_at
    on public.raw_tools (ingested_at desc);

-- New user-submitted suggestions table for dashboard intake.
create table if not exists public.tool_suggestions (
    suggestion_id bigint generated always as identity primary key,
    submitted_at timestamptz not null default now(),
    submitter_name text,
    submitter_email text,
    suggested_tool_name text not null,
    suggested_tool_url text,
    suggested_category text,
    suggested_description text,
    status text not null default 'new',
    source text not null default 'web_form',
    constraint tool_suggestions_status_check check (status in ('new', 'reviewed', 'accepted', 'rejected'))
);

create index if not exists idx_tool_suggestions_submitted_at
    on public.tool_suggestions (submitted_at desc);

create index if not exists idx_tool_suggestions_status
    on public.tool_suggestions (status);
