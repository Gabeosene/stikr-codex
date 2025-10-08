// lib/experience.ts
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

// Minimal local Experience type because '@/features/stickers/api' does not export it.
// If the real module later exports a matching type, replace this local type with that import.
type Experience = {
  type: 'deep_link' | 'ar' | 'webgl' | 'url' | string;
  payload?: any;
};

export function pickUrlFromPayload(payload: any, type: Experience['type']): string | null {
  if (!payload) return null;
  // accept common keys
  const candidates = [
    payload.url, payload.href, payload.link,
    payload.deep_link, payload.deeplink,
    payload.webgl, payload.ar,
  ].filter(Boolean);
  // prefer by type, fall back to first truthy
  if (type === 'deep_link' || type === 'ar') {
    return payload.deep_link || payload.ar || candidates[0] || null;
  }
  if (type === 'webgl' || type === 'url') {
    return payload.url || payload.webgl || candidates[0] || null;
  }
  return candidates[0] || null;
}

export async function openExperience(exp: Experience) {
  const target = pickUrlFromPayload(exp.payload, exp.type);
  if (!target) {
    Alert.alert('No experience URL', 'This sticker has no attached link yet.');
    return;
  }
  try {
    const can = await Linking.canOpenURL(target);
    if (!can) throw new Error('Cannot open URL');
    await Linking.openURL(target);
  } catch {
    const label = Platform.select({ ios: 'Share Sheet', android: 'Copy URL', default: 'Copy URL' });
    Alert.alert('Could not open', `Try again later.\n\nURL:\n${target}`, [{ text: label }]);
  }
}
