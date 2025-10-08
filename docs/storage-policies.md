# Storage Buckets & Policies

Run the SQL below in the Supabase SQL Editor (or as a migration) to create the public **stickers** bucket and the private **captures** bucket, and to enforce the correct row-level security policies.

```sql
-- Ensure the storage buckets exist with the desired visibility
insert into storage.buckets (id, name, public)
values ('stickers', 'stickers', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do update set public = false;

-- Stickers bucket: allow anyone (including anonymous) to read
drop policy if exists "Public read access for stickers" on storage.objects;
create policy "Public read access for stickers"
    on storage.objects for select
    using (bucket_id = 'stickers');

-- Captures bucket: only the owner may read and modify their files
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
```

- **stickers**: read-only for anonymous visitors so sticker URLs can be shared publicly.
- **captures**: fully private; only the uploading user (matching `auth.uid()`) can read, update, or delete their files.
