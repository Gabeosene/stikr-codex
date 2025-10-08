-- Seed data for local development.
truncate table public.captures restart identity cascade;
truncate table public.experiences restart identity cascade;
truncate table public.stickers restart identity cascade;

insert into public.stickers (id, title, artist_name, image_url, latitude, longitude, status)
values
    ('11111111-1111-1111-1111-111111111111', 'Pixel Bloom', 'Avery Code', 'https://example.com/stickers/pixel-bloom.png', 37.7749, -122.4194, 'approved'),
    ('22222222-2222-2222-2222-222222222222', 'Neon Lines', 'Casey Vector', 'https://example.com/stickers/neon-lines.png', 34.0522, -118.2437, 'approved')
on conflict (id) do nothing;

insert into public.experiences (sticker_id, type, payload)
values
    ('11111111-1111-1111-1111-111111111111', 'url', jsonb_build_object('href', 'https://example.com/experiences/pixel-bloom')),
    ('22222222-2222-2222-2222-222222222222', 'deep_link', jsonb_build_object('href', 'stickr://experience/neon-lines'))
on conflict do nothing;
