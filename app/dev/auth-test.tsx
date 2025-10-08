// app/dev/auth-test.tsx (dev-only)
import React, { useMemo, useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';

import { getSupabaseClient, getSupabaseConfigurationError } from '@/lib/supabase';

export default function AuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const supabaseConfigError = getSupabaseConfigurationError();
  const supabase = useMemo(() => {
    if (supabaseConfigError) return null;
    return getSupabaseClient();
  }, [supabaseConfigError]);

  if (supabaseConfigError) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontWeight: '600' }}>Supabase configuration missing.</Text>
        <Text>{supabaseConfigError.message}</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={{ borderWidth: 1, padding: 8 }} />
      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      <Button
        title="Sign in"
        onPress={async () => {
          if (!supabase) return;
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          setMsg(error ? error.message : 'Signed in');
        }}
      />
      <Button
        title="Sign out"
        onPress={async () => {
          if (!supabase) return;
          const { error } = await supabase.auth.signOut();
          setMsg(error ? error.message : 'Signed out');
        }}
      />
      <Text>{msg}</Text>
    </View>
  );
}
