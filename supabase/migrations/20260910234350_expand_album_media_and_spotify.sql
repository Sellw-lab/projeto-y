alter table public.memories drop constraint if exists memories_type_check;
alter table public.memories add constraint memories_type_check check (type = any (array['photo'::text, 'video'::text, 'message'::text, 'song'::text]));
alter table public.memories add column if not exists mime_type text;
alter table public.memories add column if not exists source_url text;
create index if not exists memories_album_date_idx on public.memories (album_id, date desc, created_at desc);

-- The same migration was applied through the Supabase MCP to project zcrwrvftibsthfcglujo.
