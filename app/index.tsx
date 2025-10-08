// app/index.tsx
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { THEME } from '@/lib/theme';

import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { fetchApprovedStickers, type Sticker } from '@/features/stickers/api';

// --- header (keeps your theme + toggle) ---
const SCREEN_OPTIONS = {
  light: {
    title: 'Stickers',
    headerTransparent: true,
    headerShadowVisible: true,
    headerStyle: { backgroundColor: THEME.light.background },
    headerRight: () => <ThemeToggle />,
  },
  dark: {
    title: 'Stickers',
    headerTransparent: true,
    headerShadowVisible: true,
    headerStyle: { backgroundColor: THEME.dark.background },
    headerRight: () => <ThemeToggle />,
  },
};

// --- layout constants ---
const GAP = 12;
const COLS = 2;
const W = (Dimensions.get('window').width - GAP * (COLS + 1)) / COLS;

export default function BrowseScreen() {
  const { colorScheme } = useColorScheme();
  const isClient = typeof window !== 'undefined';

  // Trim env (avoids hidden whitespace issues)
  const SB_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const SB_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

  // Log once so you can eyeball them in the console
  React.useEffect(() => {
    if (!isClient) return;
    console.log('[env] URL =', SB_URL);
    console.log('[env] KEY prefix =', SB_KEY.slice(0, 8));
    if (!SB_URL.startsWith('https://')) {
      console.warn('[env] URL is missing https:// or malformed');
    }
    if (!SB_KEY) {
      console.warn('[env] anon key missing');
    }
  }, [isClient, SB_URL, SB_KEY]);

  const { data, isLoading, isError, refetch, error, isFetching } = useQuery({
    queryKey: ['stickers'],
    queryFn: fetchApprovedStickers,
    enabled: isClient, // don't run during SSR
    retry: 0,
  });

  const stickers = (data ?? []) as Sticker[];

  React.useEffect(() => {
    if (isError) console.error('[stickers] query error:', error);
  }, [isError, error]);

  // --- PROBE: hit REST directly and print the raw response ---
  React.useEffect(() => {
    if (!isClient || !SB_URL || !SB_KEY) return;

    (async () => {
      const apiUrl = `${SB_URL}/rest/v1/stickers?select=id&limit=1`;
      try {
        console.log('[probe] GET', apiUrl);
        const res = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
          },
        });
        const text = await res.text();
        console.log('[probe] status', res.status);
        console.log('[probe] body', text);
      } catch (e: any) {
        console.error('[probe] failed', e?.name, e?.message || e);
      }
    })();
  }, [isClient, SB_URL, SB_KEY]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS[colorScheme ?? 'light']} />

      {isLoading ? (
        <Center>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading stickers…</Text>
        </Center>
      ) : isError ? (
        <Center>
          <Text>Couldn’t load stickers.</Text>
          <Text style={{ color: '#666', marginTop: 6, textAlign: 'center' }}>
            {(error as any)?.message ?? 'Open the browser console for details.'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ marginTop: 12, padding: 10, backgroundColor: '#eee', borderRadius: 8 }}>
            <Text>Retry</Text>
          </Pressable>
        </Center>
      ) : stickers.length === 0 ? (
        <Center>
          <Text>No approved stickers yet.</Text>
          <Text style={{ color: '#666', marginTop: 6, textAlign: 'center' }}>
            Add a row to <Text style={{ fontWeight: '600' }}>public.stickers</Text> with status="approved".
          </Text>
        </Center>
      ) : (
        <FlashList<Sticker>
          data={stickers}
          estimatedItemSize={W + 40}
          numColumns={COLS}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{ padding: GAP }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          renderItem={({ item }) => (
            <View style={{ width: W, marginHorizontal: GAP / 2 }}>
              <Link href={`/sticker/${item.id}`} asChild>
                <Pressable style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: '#f4f4f4' }}>
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: '100%', height: W }}
                    contentFit="cover"
                    transition={100}
                  />
                  <View style={{ padding: 8 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                      {item.title ?? 'Untitled'}
                    </Text>
                    {!!item.artist_name && (
                      <Text numberOfLines={1} style={{ color: '#666', marginTop: 2 }}>
                        {item.artist_name}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </Link>
            </View>
          )}
        />
      )}
    </>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</View>;
}

// --- your existing ThemeToggle, unchanged ---
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};
function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  return (
    <Button onPressIn={toggleColorScheme} size="icon" variant="ghost" className="rounded-full web:mx-4">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}
