// features/stickers/types.ts

export type StickerStatus = 'pending' | 'approved' | 'flagged';

export type Sticker = {
  id: string;
  title: string | null;
  artist_name: string | null;
  image_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: StickerStatus;
  created_at?: string;
};

export type ExperienceType = 'url' | 'webgl' | 'ar' | 'deep_link';

export type Experience = {
  id: string;
  sticker_id: string;
  type: ExperienceType;
  payload: Record<string, unknown> | null;
};
