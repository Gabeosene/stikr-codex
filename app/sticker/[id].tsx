// app/sticker/[id].tsx
import React from 'react'
import { View, Text, ActivityIndicator, ScrollView, Pressable, RefreshControl, Alert, Platform } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { useQuery } from '@tanstack/react-query'
import { fetchStickerById, fetchExperiences, type Experience } from '@/features/stickers/api'
import { openExperience } from '@/lib/experience'

export default function StickerDetails() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const sid = Array.isArray(id) ? id[0] : id
  const isClient = typeof window !== 'undefined' || Platform.OS !== 'web'

  // Sticker query (client-only; no SSR)
  const stickerQ = useQuery({
    queryKey: ['sticker', sid],
    queryFn: () => fetchStickerById(sid!),
    enabled: isClient && !!sid,
    retry: 1,
  })

  // Experiences (optional; non-blocking)
  const expQ = useQuery({
    queryKey: ['experiences', sid],
    queryFn: () => fetchExperiences(sid!),
    enabled: isClient && !!sid,
    retry: 1,
  })

  React.useEffect(() => {
    if (stickerQ.isError) console.error('[sticker] error', stickerQ.error)
    if (expQ.isError) console.warn('[experiences] error (non-blocking)', expQ.error)
  }, [stickerQ.isError, expQ.isError])

  const onRefresh = React.useCallback(() => {
    if (!sid) return
    stickerQ.refetch()
    expQ.refetch()
  }, [sid])

  const onOpen = React.useCallback(async (exp: Experience) => {
    try {
      await openExperience(exp)
    } catch (e: any) {
      Alert.alert('Could not open', e?.message ?? 'Unknown error')
    }
  }, [])

  const getCtaText = (exp: Experience) => {
    switch (exp.type) {
      case 'ar': return 'Open AR'
      case 'url': return 'Open Link'
      default: return `Open ${String(exp.type).replace('_', ' ')}`
    }
  }

  if (!sid) {
    return (
      <Center>
        <Text>Missing sticker id.</Text>
        <GhostButton onPress={() => router.back()}>Go back</GhostButton>
      </Center>
    )
  }

  if (stickerQ.isLoading) {
    return (
      <Center>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </Center>
    )
  }

  const s = stickerQ.data // may be null if not found or not allowed by RLS

  return (
    <>
      <Stack.Screen options={{ title: s?.title ?? 'Sticker' }} />
      {!s ? (
        <Center>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Sticker not found.</Text>
          <Text style={{ color: '#666', marginTop: 6, textAlign: 'center' }}>
            id: <Text style={{ fontWeight: '600' }}>{sid}</Text>
          </Text>
          <GhostButton style={{ marginTop: 12 }} onPress={() => router.back()}>Go back</GhostButton>
        </Center>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={stickerQ.isFetching || expQ.isFetching} onRefresh={onRefresh} />
          }
        >
          <Image
            source={{ uri: s.image_url }}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#f2f2f2' }}
            contentFit="cover"
            transition={150}
          />

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{s.title ?? 'Untitled'}</Text>
            {!!s.artist_name && <Text style={{ color: '#666', marginTop: 4 }}>{s.artist_name}</Text>}
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Experience</Text>

            {expQ.isLoading ? (
              <ActivityIndicator />
            ) : expQ.isError ? (
              <ErrorView
                message="Couldn’t load experience."
                onRetry={() => expQ.refetch()}
              />
            ) : (expQ.data ?? []).length === 0 ? (
              <Text style={{ color: '#666' }}>No attached experience.</Text>
            ) : (
              (expQ.data as Experience[]).map((exp) => (
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
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {getCtaText(exp)}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</View>
}

function GhostButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode
  onPress?: () => void
  style?: any
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#cfd8d3',
          backgroundColor: 'white',
          marginTop: 8,
        },
        style,
      ]}
    >
      <Text style={{ color: '#004226', fontWeight: '600' }}>{children}</Text>
    </Pressable>
  )
}

function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ padding: 12, borderWidth: 1, borderColor: '#ffd6d6', backgroundColor: '#fff5f5', borderRadius: 10 }}>
      <Text style={{ color: '#b00020', marginBottom: 8 }}>{message}</Text>
      {onRetry && <GhostButton onPress={onRetry}>Try again</GhostButton>}
    </View>
  )
}
