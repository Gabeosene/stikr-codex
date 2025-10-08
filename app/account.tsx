import React from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';

export default function AccountScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Account',
          headerStyle: { backgroundColor: THEME[scheme].background },
          headerTintColor: THEME[scheme].foreground,
          headerShadowVisible: true,
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={{ gap: 12 }}>
          <Text className="text-left text-2xl font-semibold">Account</Text>
          <Text className="text-muted-foreground">
            Manage your profile information and preferences. Account management tools are coming soon.
          </Text>
        </View>

        <View className="mt-8 rounded-xl border border-border bg-card p-4">
          <Text className="text-base font-semibold">Profile</Text>
          <Text className="mt-2 text-sm text-muted-foreground">
            You are signed in with your Stikr account. Future updates will let you edit your display name,
            manage connected services, and review security settings from this page.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
