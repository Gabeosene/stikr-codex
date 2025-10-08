import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ToastAndroid,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import { getSupabaseClient, getSupabaseConfigurationError } from '@/lib/supabase';

const MODES = [
  { id: 'magic-link', label: 'Magic link' },
  { id: 'password', label: 'Email & password' },
] as const;

type SignInMode = (typeof MODES)[number]['id'];

export default function SignInScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const supabaseConfigError = getSupabaseConfigurationError();
  const supabase = React.useMemo(() => {
    if (supabaseConfigError) return null;
    try {
      return getSupabaseClient();
    } catch (err) {
      console.warn(err);
      return null;
    }
  }, [supabaseConfigError]);

  const [mode, setMode] = React.useState<SignInMode>('magic-link');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const scheme = colorScheme ?? 'light';
  const palette = THEME[scheme];

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const canSubmit =
    trimmedEmail.length > 0 && (mode === 'magic-link' || trimmedPassword.length >= 6);

  React.useEffect(() => {
    setError(null);
  }, [mode, email, password]);

  const showToast = React.useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Success', message);
    }
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw supabaseConfigError ?? new Error('Supabase is not configured.');
      }

      if (mode === 'magic-link') {
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            shouldCreateUser: true,
          },
        });

        if (signInError) {
          throw signInError;
        }

        showToast('Check your email for the sign-in link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (signInError) {
          throw signInError;
        }

        showToast('Signed in successfully.');
      }

      setPassword('');
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    loading,
    mode,
    router,
    showToast,
    supabase,
    supabaseConfigError,
    trimmedEmail,
    trimmedPassword,
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sign in',
          headerTransparent: true,
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.foreground,
        }}
      />

      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="flex-1 px-6 pb-10 pt-16">
            <View className="gap-3">
              <Text className="text-2xl font-semibold text-foreground">Welcome back</Text>
              <Text className="text-muted-foreground">
                Use your email to sign in instantly with a magic link or your password.
              </Text>
            </View>

            <Card className="mt-8 gap-0">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">Sign in</CardTitle>
                <CardDescription>
                  Choose how you want to access your account.
                </CardDescription>
              </CardHeader>

              <CardContent className="gap-6 pb-6">
                <View className="flex-row gap-2">
                  {MODES.map((item) => {
                    const isActive = item.id === mode;
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        disabled={loading}
                        onPress={() => setMode(item.id)}
                      >
                        <Text className="text-center text-sm font-medium">{item.label}</Text>
                      </Button>
                    );
                  })}
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-medium text-foreground">Email</Text>
                  <Input
                    value={email}
                    editable={!loading}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    placeholder="you@example.com"
                    returnKeyType={mode === 'password' ? 'next' : 'send'}
                    onSubmitEditing={mode === 'magic-link' ? handleSubmit : undefined}
                  />
                </View>

                {mode === 'password' ? (
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Password</Text>
                    <Input
                      value={password}
                      editable={!loading}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      textContentType="password"
                      placeholder="Your password"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    <Text className="text-xs text-muted-foreground">
                      Passwords must be at least 6 characters.
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs text-muted-foreground">
                    We will email you a secure link that lets you sign in without a password.
                  </Text>
                )}

                {error ? (
                  <View className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                    <Text className="text-sm font-medium text-destructive">{error}</Text>
                  </View>
                ) : null}

                <Button
                  className="h-11"
                  disabled={!canSubmit || loading}
                  onPress={handleSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color={palette.primaryForeground} />
                  ) : (
                    <Text className="text-base font-semibold">
                      {mode === 'magic-link' ? 'Send magic link' : 'Sign in'}
                    </Text>
                  )}
                </Button>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
