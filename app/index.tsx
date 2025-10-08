// app/index.tsx
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import { Center } from '@/components/ui/center';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { THEME } from '@/lib/theme';
import { fetchApprovedStickers } from '@/features/stickers/api';
import type { Sticker } from '@/features/stickers/types';
import { getSupabaseConfigurationError } from '@/lib/supabase';
import { MapPinIcon, MoonStarIcon, SunIcon } from 'lucide-react-native';

const BASE_HEADER_OPTIONS = {
  title: 'Stickers',
  headerTransparent: true,
  headerShadowVisible: true,
  headerRight: () => <HeaderActions />,
};

const SCREEN_OPTIONS = {
  light: {
    ...BASE_HEADER_OPTIONS,
    headerStyle: { backgroundColor: THEME.light.background },
  },
  dark: {
    ...BASE_HEADER_OPTIONS,
    headerStyle: { backgroundColor: THEME.dark.background },
  },
};

const GAP = 12;
const COLS = 2;
const CARD_WIDTH = (Dimensions.get('window').width - GAP * (COLS + 1)) / COLS;

export default function BrowseScreen() {
  const { colorScheme } = useColorScheme();
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const supabaseConfigError = getSupabaseConfigurationError();

  React.useEffect(() => {
    if (supabaseConfigError) {
      console.warn(supabaseConfigError.message);
    }
  }, [supabaseConfigError]);

  const {
    data: stickers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Sticker[]>({
    queryKey: ['stickers'],
    queryFn: fetchApprovedStickers,
    enabled: isHydrated && !supabaseConfigError,
    retry: 0,
  });

  React.useEffect(() => {
    if (isError && error) {
      console.error('[stickers] query error:', error);
    }
  }, [isError, error]);

  if (supabaseConfigError) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS[colorScheme ?? 'light']} />

        <Center style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Supabase not configured.</Text>
          <Text style={{ color: '#666', textAlign: 'center' }}>{supabaseConfigError.message}</Text>
        </Center>
      </>
    );
  }

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
            {(error as Error)?.message ?? 'Open the browser console for details.'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ marginTop: 12, padding: 10, backgroundColor: '#eee', borderRadius: 8 }}
          >
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
          estimatedItemSize={CARD_WIDTH + 40}
          numColumns={COLS}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{ padding: GAP }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          renderItem={({ item }) => (
            <View style={{ width: CARD_WIDTH, marginHorizontal: GAP / 2 }}>
              <Link href={`/sticker/${item.id}`} asChild>
                <Pressable style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: '#f4f4f4' }}>
                  <StickerArtwork uri={item.image_url} size={CARD_WIDTH} />
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

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function HeaderActions() {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      <Link href="/map" asChild>
        <Button size="icon" variant="ghost" className="rounded-full web:mx-1">
          <Icon as={MapPinIcon} className="size-5" />
        </Button>
      </Link>
      <ThemeToggle />
    </View>
  );
}

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  return (
    <Button onPressIn={toggleColorScheme} size="icon" variant="ghost" className="rounded-full web:mx-4">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}

function StickerArtwork({ uri, size }: { uri: string | null; size: number }) {
  const [failed, setFailed] = React.useState(false);
  const cleanedUri = uri?.trim();

  if (!cleanedUri || failed) {
    return (
      <View
        style={{
          width: '100%',
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e7e7e7',
        }}
      >
        <Text style={{ color: '#666', fontSize: 12 }}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: cleanedUri }}
      style={{ width: '100%', height: size }}
      contentFit="cover"
      transition={100}
      onError={() => setFailed(true)}
    />
  );
}
