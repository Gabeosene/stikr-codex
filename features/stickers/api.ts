// features/stickers/api.ts
import { getSupabaseConfigurationError, tryGetSupabaseClient } from '@/lib/supabase';

import type { Experience, Sticker } from './types';

type UnknownRecord = Record<string, unknown>;

const STICKER_FIELD_VARIANTS = [
  'id,title,artist_name,image_url,latitude,longitude,status,created_at',
  '*',
] as const;

const EXPERIENCE_FIELDS = 'id,sticker_id,type,payload';

/** Grid list */
export async function fetchStickers(): Promise<Sticker[]> {
  const supabase = requireSupabaseClient();
  const rows = await withFieldFallback<StickerRow[]>(
    (fields) =>
      supabase
        .from('stickers')
        .select(fields)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    [],
  );

  return rows.map(normalizeStickerRow);
}

/** @deprecated Use {@link fetchStickers} instead. */
export const fetchApprovedStickers = fetchStickers;

/** Details page */
export async function fetchStickerById(id: string) {
  const supabase = requireSupabaseClient();
  const row = await withFieldFallback<StickerRow | null>(
    (fields) =>
      supabase
        .from('stickers')
        .select(fields)
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle(), // null if not found instead of throwing
    null,
  );

  return row ? normalizeStickerRow(row) : null;
}

/** Optional attached experiences */
export async function fetchExperiences(stickerId: string): Promise<Experience[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('experiences')
    .select(EXPERIENCE_FIELDS)
    .eq('sticker_id', stickerId);

  if (error) {
    console.warn('[supabase] experiences error', error);
    return [];
  }

  return (data as Experience[] | null) ?? [];
}

type StickerRow = (Sticker & UnknownRecord) | UnknownRecord;

async function withFieldFallback<T>(
  runQuery: (
    fields: (typeof STICKER_FIELD_VARIANTS)[number],
  ) => PromiseLike<any>,
  fallback: T,
): Promise<T> {
  let lastColumnError: unknown = null;

  for (const fields of STICKER_FIELD_VARIANTS) {
    const response = (await runQuery(fields)) as { data: T | null; error: unknown };
    const { data, error } = response;

    if (!error) {
      return (data ?? fallback) as T;
    }

    if (!isMissingColumnError(error)) {
      throw error;
    }

    lastColumnError = error;
  }

  if (lastColumnError) {
    console.warn('[supabase] sticker location columns missing – falling back without coordinates');
  }

  return fallback;
}

function requireSupabaseClient() {
  const supabase = tryGetSupabaseClient();
  if (supabase) {
    return supabase;
  }

  const configError = getSupabaseConfigurationError();
  if (configError) {
    throw configError;
  }

  throw new Error('Supabase client is not configured.');
}

function normalizeStickerRow(row: StickerRow): Sticker {
  const record = row as UnknownRecord;
  const { latitude, longitude } = extractCoordinates(record);
  const id = typeof record.id === 'string' ? record.id : String(record.id ?? '');
  const status = normalizeStatus(record.status);

  return {
    id,
    title: (record.title as Sticker['title']) ?? null,
    artist_name: (record.artist_name as Sticker['artist_name']) ?? null,
    image_url: (record.image_url as Sticker['image_url']) ?? null,
    status,
    created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
  };
}

function extractCoordinates(record: UnknownRecord): { latitude: number | null; longitude: number | null } {
  let latitude = pickCoordinate(record, LATITUDE_KEYS);
  let longitude = pickCoordinate(record, LONGITUDE_KEYS);

  if (latitude != null && longitude != null) {
    return { latitude, longitude };
  }

  const locationSource = record.location ?? record.geo_location ?? record.coordinates;

  if (typeof locationSource === 'string') {
    const parsed = parsePointString(locationSource);
    if (parsed) {
      latitude ??= parsed.latitude;
      longitude ??= parsed.longitude;
    }
  } else if (Array.isArray(locationSource)) {
    if (locationSource.length >= 2) {
      longitude ??= toNumber(locationSource[0]);
      latitude ??= toNumber(locationSource[1]);
    }
  } else if (locationSource && typeof locationSource === 'object') {
    const locationRecord = locationSource as UnknownRecord;
    latitude ??= pickCoordinate(locationRecord, [...LATITUDE_KEYS, 'y']);
    longitude ??= pickCoordinate(locationRecord, [...LONGITUDE_KEYS, 'x']);

    const coordinates = locationRecord.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      longitude ??= toNumber(coordinates[0]);
      latitude ??= toNumber(coordinates[1]);
    }
  }

  return {
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
}

function normalizeStatus(value: unknown): Sticker['status'] {
  if (typeof value === 'string') {
    if (value === 'approved' || value === 'pending' || value === 'flagged') {
      return value;
    }
  }
  return 'pending';
}

const LATITUDE_KEYS = [
  'latitude',
  'lat',
  'location_latitude',
  'location_lat',
  'geo_latitude',
  'geo_lat',
  'sticker_latitude',
  'sticker_lat',
];

const LONGITUDE_KEYS = [
  'longitude',
  'lng',
  'lon',
  'long',
  'location_longitude',
  'location_long',
  'geo_longitude',
  'geo_long',
  'sticker_longitude',
  'sticker_long',
];

function pickCoordinate(source: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in source)) continue;
    const value = source[key];
    const numeric = toNumber(value);
    if (numeric != null) {
      return numeric;
    }
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parsePointString(value: string): { latitude: number; longitude: number } | null {
  const match = value.match(/POINT\s*\(([-\d.+eE]+)\s+([\-\d.+eE]+)\)/);
  if (!match) return null;
  const longitude = Number.parseFloat(match[1]);
  const latitude = Number.parseFloat(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; message?: unknown };
  if (err.code === '42703') return true;
  if (typeof err.message === 'string') {
    return /\b(column|attribute)\b[^.]*does not exist/i.test(err.message);
  }
  return false;
}

