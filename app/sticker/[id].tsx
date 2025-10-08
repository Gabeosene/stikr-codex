// app/sticker/[id].tsx
import React from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';

import { Center } from '@/components/ui/center';
import { GhostButton } from '@/components/ui/ghost-button';
import { ErrorView } from '@/components/ui/error-view';
import { fetchStickerById, fetchExperiences } from '@/features/stickers/api';
import type { Experience, Sticker } from '@/features/stickers/types';
import { getExperienceCta, openExperience } from '@/lib/experience';
import { getSupabaseConfigurationError } from '@/lib/supabase';

export default function StickerDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const sid = Array.isArray(id) ? id[0] : id;
  const [isHydrated, setIsHydrated] = React.useState(false);
  const supabaseConfigError = getSupabaseConfigurationError();

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const canQuery = isHydrated && !!sid && !supabaseConfigError;

  const {
    data: sticker,
    isLoading: isStickerLoading,
    isFetching: isStickerFetching,
    isError: isStickerError,
    error: stickerError,
    refetch: refetchSticker,
  } = useQuery<Sticker | null>({
    queryKey: ['sticker', sid],
    queryFn: () => {
      if (!sid) {
        throw new Error('Missing sticker id');
      }
      return fetchStickerById(sid);
    },
    enabled: canQuery,
    retry: 1,
  });

  const {
    data: experiences = [],
    isLoading: isExperiencesLoading,
    isFetching: isExperiencesFetching,
    isError: isExperiencesError,
    error: experiencesError,
    refetch: refetchExperiences,
  } = useQuery<Experience[]>({
    queryKey: ['experiences', sid],
    queryFn: () => {
      if (!sid) {
        throw new Error('Missing sticker id');
      }
      return fetchExperiences(sid);
    },
    enabled: canQuery,
    retry: 1,
  });

  React.useEffect(() => {
    if (isStickerError && stickerError) {
      console.error('[sticker] error', stickerError);
    }
    if (isExperiencesError && experiencesError) {
      console.warn('[experiences] error (non-blocking)', experiencesError);
    }
  }, [isStickerError, stickerError, isExperiencesError, experiencesError]);

  const onRefresh = React.useCallback(() => {
    if (!sid) return;
    void refetchSticker();
    void refetchExperiences();
  }, [sid, refetchSticker, refetchExperiences]);

  const onOpen = React.useCallback(async (exp: Experience) => {
    try {
      await openExperience(exp);
    } catch (e: any) {
      Alert.alert('Could not open', e?.message ?? 'Unknown error');
    }
  }, []);

  if (supabaseConfigError) {
    return (
      <Center>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Supabase not configured.</Text>
        <Text style={{ color: '#666', textAlign: 'center' }}>{supabaseConfigError.message}</Text>
        <GhostButton style={{ marginTop: 12 }} onPress={() => router.back()}>
          Go back
        </GhostButton>
      </Center>
    );
  }

  if (!sid) {
    return (
      <Center>
        <Text>Missing sticker id.</Text>
        <GhostButton onPress={() => router.back()}>Go back</GhostButton>
      </Center>
    );
  }

  if (isStickerLoading) {
    return (
      <Center>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </Center>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: sticker?.title ?? 'Sticker' }} />
      {!sticker ? (
        <Center>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Sticker not found.</Text>
          <Text style={{ color: '#666', marginTop: 6, textAlign: 'center' }}>
            id: <Text style={{ fontWeight: '600' }}>{sid}</Text>
          </Text>
          <GhostButton style={{ marginTop: 12 }} onPress={() => router.back()}>
            Go back
          </GhostButton>
        </Center>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isStickerFetching || isExperiencesFetching} onRefresh={onRefresh} />
          }
        >
          <Artwork uri={sticker.image_url} />

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{sticker.title ?? 'Untitled'}</Text>
            {!!sticker.artist_name && <Text style={{ color: '#666', marginTop: 4 }}>{sticker.artist_name}</Text>}
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Experience</Text>

            {isExperiencesLoading ? (
              <ActivityIndicator />
            ) : isExperiencesError ? (
              <ErrorView
                message={(experiencesError as Error)?.message ?? 'Couldn’t load experience.'}
                onRetry={() => void refetchExperiences()}
              />
            ) : experiences.length === 0 ? (
              <Text style={{ color: '#666' }}>No attached experience.</Text>
            ) : (
              experiences.map((exp) => (
                <Pressable
                  key={exp.id}
                  onPress={() => onOpen(exp)}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  style={{
                    padding: 12,
                    backgroundColor: '#004226',
                    borderRadius: 10,
                    marginBottom: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>{getExperienceCta(exp.type)}</Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </>
  );
}

function Artwork({ uri }: { uri: string | null }) {
  const [failed, setFailed] = React.useState(false);
  const cleanedUri = uri?.trim();

  if (!cleanedUri || failed) {
    return (
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: 12,
          backgroundColor: '#f2f2f2',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#666' }}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: cleanedUri }}
      style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#f2f2f2' }}
      contentFit="cover"
      transition={150}
      onError={() => setFailed(true)}
    />
  );
}
