-- Storage bucket configuration and row level security policies.

insert into storage.buckets (id, name, public)
values ('stickers', 'stickers', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do update set public = false;

drop policy if exists "Public read access for stickers" on storage.objects;
create policy "Public read access for stickers"
    on storage.objects for select
    using (bucket_id = 'stickers');

drop policy if exists "Users can read their own captures" on storage.objects;
create policy "Users can read their own captures"
    on storage.objects for select
    using (bucket_id = 'captures' and owner = auth.uid());

drop policy if exists "Users can upload their own captures" on storage.objects;
create policy "Users can upload their own captures"
    on storage.objects for insert
    with check (bucket_id = 'captures' and owner = auth.uid());

drop policy if exists "Users can update their own captures" on storage.objects;
create policy "Users can update their own captures"
    on storage.objects for update
    using (bucket_id = 'captures' and owner = auth.uid())
    with check (bucket_id = 'captures' and owner = auth.uid());

drop policy if exists "Users can delete their own captures" on storage.objects;
create policy "Users can delete their own captures"
    on storage.objects for delete
    using (bucket_id = 'captures' and owner = auth.uid());
