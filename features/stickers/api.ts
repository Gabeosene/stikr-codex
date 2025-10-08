// features/stickers/api.ts
import { supabase } from '@/lib/supabase';

export type Sticker = {
  id: string;
  title: string | null;
  artist_name: string | null;
  image_url: string;
  status: 'pending' | 'approved' | 'flagged';
  created_at?: string;
};

export type Experience = {
  id: string;
  sticker_id: string;
  type: 'url' | 'webgl' | 'ar' | 'deep_link';
  payload: Record<string, any> | null;
};

/** Grid list */
export async function fetchApprovedStickers(): Promise<Sticker[]> {
  const { data, error } = await supabase
    .from('stickers')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Details page */
export async function fetchStickerById(id: string) {
  const { data, error } = await supabase
    .from('stickers')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle(); // null if not found instead of throwing

  if (error) throw error;
  return data; // Sticker | null
}

/** Optional attached experiences */
export async function fetchExperiences(stickerId: string): Promise<Experience[]> {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('sticker_id', stickerId);

  if (error) {
    console.warn('[supabase] experiences error', error);
    return [];
  }
  return data ?? [];
}
