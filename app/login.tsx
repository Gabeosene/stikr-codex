// app/login.tsx
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import type { Session } from '@supabase/supabase-js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import { getSupabaseClient, getSupabaseConfigurationError } from '@/lib/supabase';

const HEADER_OPTIONS = {
  light: {
    title: 'Sign in',
    headerTransparent: true,
    headerStyle: { backgroundColor: THEME.light.background },
  },
  dark: {
    title: 'Sign in',
    headerTransparent: true,
    headerStyle: { backgroundColor: THEME.dark.background },
  },
} as const;

type Mode = 'sign-in' | 'sign-up';

type StatusTone = 'error' | 'success' | 'info';

export default function AuthScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const supabaseConfigError = getSupabaseConfigurationError();
  const supabase = React.useMemo(() => {
    if (supabaseConfigError) return null;
    return getSupabaseClient();
  }, [supabaseConfigError]);

  const [mode, setMode] = React.useState<Mode>('sign-in');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [status, setStatus] = React.useState<{ tone: StatusTone; message: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    setStatus(null);
  }, [mode]);

  React.useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession ?? null);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const palette = THEME[colorScheme ?? 'light'];

  const isSignedIn = session != null;
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  const isPasswordValid = trimmedPassword.length >= 6;
  const canSubmit =
    !submitting &&
    !isSignedIn &&
    trimmedEmail.length > 0 &&
    isPasswordValid &&
    (mode === 'sign-in' || trimmedConfirmPassword === trimmedPassword);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setStatus(null);

    try {
      if (!supabase) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        setStatus({
          tone: 'info',
          message: 'Authentication is disabled in this preview build.',
        });
        return;
      }

      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          throw error;
        }

        setStatus({
          tone: 'success',
          message:
            'Check your inbox for a confirmation link. Once verified, come back here to sign in.',
        });
        setMode('sign-in');
        setConfirmPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          throw error;
        }

        setStatus({ tone: 'success', message: 'Signed in! Redirecting…' });
        router.replace('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setStatus({ tone: 'error', message });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, mode, router, supabase, trimmedEmail, trimmedPassword]);

  const toggleMode = React.useCallback(() => {
    setMode((prev) => (prev === 'sign-in' ? 'sign-up' : 'sign-in'));
    setConfirmPassword('');
    setStatus(null);
  }, []);

  const getStatusStyles = React.useCallback(
    (tone: StatusTone) => {
      const base = {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
      } as const;

      if (tone === 'error') {
        return {
          ...base,
          backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
          borderColor: '#f87171',
        } as const;
      }

      if (tone === 'success') {
        return {
          ...base,
          backgroundColor: colorScheme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
          borderColor: '#4ade80',
        } as const;
      }

      return {
        ...base,
        backgroundColor: colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe',
        borderColor: '#93c5fd',
      } as const;
    },
    [colorScheme]
  );

  const supabaseUnavailable = supabaseConfigError != null || supabase == null;

  return (
    <>
      <Stack.Screen
        options={{
          ...HEADER_OPTIONS[colorScheme ?? 'light'],
          title: mode === 'sign-in' ? 'Sign in' : 'Create account',
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
            <Card style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
              <CardHeader style={{ gap: 8 }}>
                <CardTitle>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</CardTitle>
                <CardDescription>
                  {mode === 'sign-in'
                    ? 'Enter your email and password to continue.'
                    : 'Sign up with a valid email address to start submitting stickers.'}
                </CardDescription>
              </CardHeader>
              <CardContent style={{ gap: 18, paddingBottom: 24 }}>
                {supabaseUnavailable ? (
                  <View style={getStatusStyles('info')}>
                    <Text className="font-semibold">Demo only</Text>
                    <Text className="text-muted-foreground mt-1">
                      Supabase credentials are not configured, so the authentication form below is for
                      demonstration purposes only.
                    </Text>
                    {supabaseConfigError ? (
                      <Text className="text-muted-foreground mt-2 text-xs">{supabaseConfigError.message}</Text>
                    ) : null}
                  </View>
                ) : isSignedIn ? (
                  <View style={getStatusStyles('info')}>
                    <Text className="font-medium">
                      You are already signed in as {session?.user?.email ?? 'a user'}.
                    </Text>
                    <Text className="text-muted-foreground mt-1">
                      Sign out from the developer menu or the Supabase dashboard to switch accounts.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={{ gap: 6 }}>
                      <Text className="text-sm font-medium">Email</Text>
                      <Input
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        placeholder="you@example.com"
                        textContentType="emailAddress"
                        editable={!submitting}
                      />
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text className="text-sm font-medium">Password</Text>
                      <Input
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="••••••••"
                        textContentType={
                          Platform.OS === 'ios'
                            ? mode === 'sign-in'
                              ? 'password'
                              : 'newPassword'
                            : 'password'
                        }
                        editable={!submitting}
                      />
                      <Text className="text-muted-foreground text-xs">
                        {mode === 'sign-up'
                          ? 'Use at least 6 characters. You will receive a confirmation email.'
                          : 'Use the password associated with your Supabase account.'}
                      </Text>
                      {mode === 'sign-up' && trimmedPassword.length > 0 && !isPasswordValid ? (
                        <Text className="text-destructive text-xs">Password must be at least 6 characters.</Text>
                      ) : null}
                    </View>
                    {mode === 'sign-up' ? (
                      <View style={{ gap: 6 }}>
                        <Text className="text-sm font-medium">Confirm password</Text>
                        <Input
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry
                          placeholder="••••••••"
                          textContentType={Platform.OS === 'ios' ? 'newPassword' : 'password'}
                          editable={!submitting}
                          aria-invalid={trimmedConfirmPassword.length > 0 && trimmedConfirmPassword !== trimmedPassword}
                        />
                        {trimmedConfirmPassword.length > 0 && trimmedConfirmPassword !== trimmedPassword ? (
                          <Text className="text-destructive text-xs">Passwords do not match.</Text>
                        ) : null}
                      </View>
                    ) : null}
                    {status ? (
                      <View style={getStatusStyles(status.tone)}>
                        <Text className="font-medium">{status.message}</Text>
                      </View>
                    ) : null}
                    <Button
                      onPress={handleSubmit}
                      disabled={!canSubmit}
                      style={{ height: 48, borderRadius: 12, backgroundColor: palette.primary }}
                      accessibilityLabel={
                        supabaseUnavailable
                          ? 'Demo submit (no authentication backend configured)'
                          : mode === 'sign-in'
                            ? 'Sign in'
                            : 'Create account'
                      }
                    >
                      {submitting ? (
                        <ActivityIndicator color={palette.primaryForeground} />
                      ) : (
                        <Text className="text-base font-semibold text-primary-foreground">
                          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                        </Text>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
              {!isSignedIn ? (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderColor: palette.border,
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text className="text-sm text-muted-foreground">
                    {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}
                  </Text>
                  <Button variant="link" onPress={toggleMode} disabled={submitting}>
                    <Text>
                      {mode === 'sign-in' ? 'Create one' : 'Sign in'}
                    </Text>
                  </Button>
                </View>
              ) : null}
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
