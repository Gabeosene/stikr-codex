// Derive a stable, non-sensitive session_id from the access token
import * as Crypto from 'expo-crypto';

export async function makeSessionId(accessToken: string) {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accessToken);
  return hex.slice(0, 16); // short + deterministic per login
}
