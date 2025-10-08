// lib/experience.ts
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import type { Experience } from '@/features/stickers/types';

const EXPERIENCE_LABELS: Record<Experience['type'], string> = {
  url: 'Open Link',
  webgl: 'Open WebGL',
  ar: 'Open AR',
  deep_link: 'Open App',
};

const EXPERIENCE_KEY_PRIORITY: Record<Experience['type'], string[]> = {
  url: ['url', 'href', 'link'],
  webgl: ['webgl', 'url', 'href'],
  ar: ['ar', 'deep_link', 'deeplink', 'url'],
  deep_link: ['deep_link', 'deeplink', 'url'],
};

const FALLBACK_KEYS = ['link', 'href', 'url', 'webgl', 'deep_link', 'deeplink', 'ar'];

export function getExperienceCta(type: Experience['type']): string {
  return EXPERIENCE_LABELS[type] ?? `Open ${formatExperienceType(type)}`;
}

export async function openExperience(exp: Experience) {
  const target = resolveExperienceUrl(exp);

  if (!target) {
    Alert.alert('No experience URL', 'This sticker has no attached link yet.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(target);
    if (!canOpen) {
      throw new Error(`Cannot open URL: ${target}`);
    }

    await Linking.openURL(target);
  } catch (error) {
    console.warn('[experience] failed to open', { experience: exp, error });
    Alert.alert('Could not open', `Try again later.\n\nURL:\n${target}`);
  }
}

function resolveExperienceUrl(exp: Experience): string | null {
  const keys = EXPERIENCE_KEY_PRIORITY[exp.type] ?? [];
  const payload = exp.payload ?? {};

  for (const key of [...keys, ...FALLBACK_KEYS]) {
    const value = (payload as Record<string, unknown>)[key];
    const stringValue = typeof value === 'string' ? value.trim() : null;
    if (stringValue) {
      return stringValue;
    }
  }

  return null;
}

function formatExperienceType(type: Experience['type']): string {
  return type
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
