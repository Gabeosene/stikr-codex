// app/map.tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';
import { MapPinIcon, RotateCcwIcon } from 'lucide-react-native';

import { Center } from '@/components/ui/center';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { fetchApprovedStickers } from '@/features/stickers/api';
import type { Sticker } from '@/features/stickers/types';
import { getSupabaseConfigurationError } from '@/lib/supabase';
import { THEME } from '@/lib/theme';

const MAP_BASE_URL = 'https://staticmap.openstreetmap.de/staticmap.php';
const MAX_ZOOM = 18;
const MIN_ZOOM = 2;
const TILE_SIZE = 256;

const BASE_HEADER_OPTIONS = {
  title: 'Map',
  headerTransparent: true,
  headerShadowVisible: true,
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

type MarkerWithLocation = Sticker & { latitude: number; longitude: number };

type MapPoint = {
  latitude: number;
  longitude: number;
};

type MarkerPosition = {
  id: string;
  sticker: MarkerWithLocation;
  x: number;
  y: number;
};

export default function MapScreen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const mapWidth = Math.round(Math.min(Math.max(windowWidth - 32, 280), 1024));
  const mapHeight = Math.max(Math.round(mapWidth * 0.6), 240);

  const supabaseConfigError = getSupabaseConfigurationError();

  const { data: stickers = [], isLoading, isError, error, refetch, isFetching } = useQuery<Sticker[]>(
    {
      queryKey: ['stickers-map'],
      queryFn: fetchApprovedStickers,
      enabled: !supabaseConfigError,
      staleTime: 30_000,
    },
  );

  const markers = React.useMemo<MarkerWithLocation[]>(() => {
    return stickers.filter((item): item is MarkerWithLocation =>
      typeof item.latitude === 'number' && typeof item.longitude === 'number',
    );
  }, [stickers]);

  const center = React.useMemo<MapPoint | null>(() => getMapCenter(markers), [markers]);

  const zoom = React.useMemo(() => {
    if (!center) return 12;
    return getMapZoom(markers, { width: mapWidth, height: mapHeight });
  }, [center, markers, mapWidth, mapHeight]);

  const mapUrl = React.useMemo(() => {
    if (!center || markers.length === 0) return null;
    return buildStaticMapUrl({ center, zoom, markers, width: mapWidth, height: mapHeight });
  }, [center, zoom, markers, mapWidth, mapHeight]);

  const markerPositions = React.useMemo(() => {
    if (!center || markers.length === 0) return [] as MarkerPosition[];
    return projectMarkers({ center, zoom, markers, width: mapWidth, height: mapHeight });
  }, [center, markers, mapWidth, mapHeight, zoom]);

  const refreshControl = (
    <RefreshControl
      refreshing={isFetching}
      onRefresh={() => refetch()}
      tintColor={colorScheme === 'dark' ? '#ffffff' : '#2563eb'}
    />
  );

  if (supabaseConfigError) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS[colorScheme ?? 'light']} />
        <Center style={styles.paddedCenter}>
          <Text style={styles.errorTitle}>Supabase not configured.</Text>
          <Text style={styles.errorDescription}>{supabaseConfigError.message}</Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS[colorScheme ?? 'light']} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 32 }]}
        refreshControl={refreshControl}
        bounces
      >
        {isLoading ? (
          <Center style={styles.loadingBlock}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading map…</Text>
          </Center>
        ) : isError ? (
          <Center style={styles.loadingBlock}>
            <Text style={styles.errorTitle}>Couldn’t load stickers.</Text>
            <Text style={styles.errorDescription}>{(error as Error)?.message ?? 'Try again shortly.'}</Text>
            <Button onPress={() => refetch()} className="mt-4">
              <Icon as={RotateCcwIcon} className="mr-2 size-4" />
              Retry
            </Button>
          </Center>
        ) : markers.length === 0 ? (
          <Center style={styles.loadingBlock}>
            <Text style={styles.errorTitle}>No location data yet.</Text>
            <Text style={styles.errorDescription}>
              Approved stickers with latitude and longitude will appear on the map when available.
            </Text>
          </Center>
        ) : (
          <View style={styles.mapSection}>
            <View style={[styles.mapWrapper, { width: mapWidth, height: mapHeight }]}> 
              {mapUrl ? (
                <>
                  <Image source={{ uri: mapUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                  {markerPositions.map(({ id, x, y, sticker }) => (
                    <Pressable
                      key={id}
                      style={[styles.markerButton, { left: x - MARKER_HITBOX / 2, top: y - MARKER_HITBOX }]}
                      onPress={() => router.push(`/sticker/${id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${sticker.title ?? 'sticker'}`}
                    >
                      <Icon as={MapPinIcon} className="size-6 text-primary" />
                      <View style={styles.markerDot} />
                    </Pressable>
                  ))}
                </>
              ) : (
                <Center style={StyleSheet.absoluteFill}>
                  <Text style={styles.errorDescription}>Map unavailable.</Text>
                </Center>
              )}
            </View>

            <View style={styles.legendHeader}>
              <Icon as={MapPinIcon} className="mr-2 size-5 text-primary" />
              <Text style={styles.legendTitle}>Nearby stickers</Text>
            </View>
            <View style={styles.legendList}>
              {markers.map((marker, index) => {
                const isLast = index === markers.length - 1;
                return (
                  <Pressable
                    key={marker.id}
                    onPress={() => router.push(`/sticker/${marker.id}`)}
                  style={[styles.legendItem, isLast && styles.legendItemLast]}
                >
                  <View style={styles.legendIcon}>
                    <Icon as={MapPinIcon} className="size-4 text-primary" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.legendTitleText} numberOfLines={1}>
                      {marker.title ?? 'Untitled sticker'}
                    </Text>
                    <Text style={styles.legendSubtitle} numberOfLines={1}>
                      {formatCoordinates(marker.latitude, marker.longitude)}
                    </Text>
                  </View>
                </Pressable>
              );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function getMapCenter(markers: MarkerWithLocation[]): MapPoint | null {
  if (!markers.length) return null;
  const { latitude, longitude } = markers.reduce(
    (acc, marker) => ({
      latitude: acc.latitude + marker.latitude,
      longitude: acc.longitude + marker.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: latitude / markers.length,
    longitude: longitude / markers.length,
  };
}

function getMapZoom(markers: MarkerWithLocation[], mapDim: { width: number; height: number }): number {
  if (markers.length <= 1) return 15;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  markers.forEach(({ latitude, longitude }) => {
    north = Math.max(north, latitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    west = Math.min(west, longitude);
  });

  const latFraction = (latRad(north) - latRad(south)) / Math.PI;
  const lngDiff = east - west;
  const lngFraction = ((lngDiff < 0 ? lngDiff + 360 : lngDiff) || 360) / 360;

  const latZoom = latFraction > 0 ? zoom(mapDim.height, latFraction) : MAX_ZOOM;
  const lngZoom = lngFraction > 0 ? zoom(mapDim.width, lngFraction) : MAX_ZOOM;

  return clamp(Math.min(latZoom, lngZoom, MAX_ZOOM), MIN_ZOOM, MAX_ZOOM);
}

function latRad(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radX2, Math.PI), -Math.PI);
}

function zoom(mapPx: number, fraction: number) {
  return Math.floor(Math.log(mapPx / TILE_SIZE / fraction) / Math.LN2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildStaticMapUrl({
  center,
  zoom,
  markers,
  width,
  height,
}: {
  center: MapPoint;
  zoom: number;
  markers: MarkerWithLocation[];
  width: number;
  height: number;
}) {
  const params: string[] = [];
  params.push(`center=${center.latitude.toFixed(6)},${center.longitude.toFixed(6)}`);
  params.push(`zoom=${clamp(Math.round(zoom), MIN_ZOOM, MAX_ZOOM)}`);
  params.push(`size=${Math.round(width)}x${Math.round(height)}`);
  markers.forEach((marker) => {
    params.push(
      `markers=${encodeURIComponent(`${marker.latitude.toFixed(6)},${marker.longitude.toFixed(6)},lightblue1`)}`,
    );
  });
  return `${MAP_BASE_URL}?${params.join('&')}`;
}

function projectMarkers({
  center,
  zoom,
  markers,
  width,
  height,
}: {
  center: MapPoint;
  zoom: number;
  markers: MarkerWithLocation[];
  width: number;
  height: number;
}): MarkerPosition[] {
  const zoomLevel = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const centerPoint = project(center.latitude, center.longitude, zoomLevel);
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return markers
    .map((sticker) => {
      const point = project(sticker.latitude, sticker.longitude, zoomLevel);
      return {
        id: sticker.id,
        sticker,
        x: halfWidth + (point.x - centerPoint.x),
        y: halfHeight + (point.y - centerPoint.y),
      };
    })
    .filter((position) =>
      position.x >= -MARKER_HITBOX &&
      position.x <= width + MARKER_HITBOX &&
      position.y >= -MARKER_HITBOX &&
      position.y <= height + MARKER_HITBOX,
    );
}

function project(lat: number, lon: number, zoom: number) {
  const siny = Math.sin((lat * Math.PI) / 180);
  const clamped = clamp(siny, -0.9999, 0.9999);
  const scale = TILE_SIZE * Math.pow(2, zoom);
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale,
  };
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
}

const MARKER_HITBOX = 44;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 24,
  },
  paddedCenter: {
    padding: 24,
    gap: 12,
  },
  loadingBlock: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorDescription: {
    color: '#666',
    textAlign: 'center',
  },
  mapSection: {
    gap: 24,
    alignItems: 'stretch',
  },
  mapWrapper: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#e7e7e7',
  },
  markerButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: MARKER_HITBOX,
    height: MARKER_HITBOX,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: -6,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  legendList: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  legendItemLast: {
    borderBottomWidth: 0,
  },
  legendIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  legendTitleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  legendSubtitle: {
    color: '#555',
    fontSize: 13,
    marginTop: 2,
  },
});

