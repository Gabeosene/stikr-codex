// app/_layout.tsx

// Must be first:
import 'react-native-gesture-handler'
import 'react-native-reanimated'

import '@/global.css'

import React from 'react'
import { NAV_THEME } from '@/lib/theme'
import { ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

// NEW: mount auth events once at app start
import { wireAuthEvents } from '@/lib/authEvents'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnReconnect: true,
      // Avoid double refetch/flicker on web tab focus
      refetchOnWindowFocus: Platform.OS === 'web' ? false : true,
    },
  },
})

export { ErrorBoundary } from 'expo-router'

export default function RootLayout() {
  const { colorScheme } = useColorScheme()

  // Wake React Query when app returns to foreground (native)
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      focusManager.setFocused(s === 'active')
    })
    return () => sub.remove()
  }, [])

  // Also sync focus on web when the tab visibility changes
  React.useEffect(() => {
    if (Platform.OS !== 'web') return
    const onVis = () => focusManager.setFocused(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Mount auth telemetry (runs once)
  React.useEffect(() => {
    wireAuthEvents().catch(console.warn)
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack />
          <PortalHost />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
