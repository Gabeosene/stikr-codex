// features/stickers/api.ts
import { getSupabaseClient } from '@/lib/supabase';

export type Sticker = {
  id: string;
  title: string | null;
  artist_name: string | null;
  image_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: 'pending' | 'approved' | 'flagged';
  created_at?: string;
};

export type Experience = {
  id: string;
  sticker_id: string;
  type: 'url' | 'webgl' | 'ar' | 'deep_link';
  payload: Record<string, any> | null;
};

const STICKER_FIELDS = 'id,title,artist_name,image_url,latitude,longitude,status,created_at';
const EXPERIENCE_FIELDS = 'id,sticker_id,type,payload';

/** Grid list */
export async function fetchApprovedStickers(): Promise<Sticker[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('stickers')
    .select(STICKER_FIELDS)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Sticker[] | null) ?? [];
}

/** Details page */
export async function fetchStickerById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('stickers')
    .select(STICKER_FIELDS)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle(); // null if not found instead of throwing

  if (error) throw error;
  return (data as Sticker | null) ?? null; // Sticker | null
}

/** Optional attached experiences */
export async function fetchExperiences(stickerId: string): Promise<Experience[]> {
  const supabase = getSupabaseClient();
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
