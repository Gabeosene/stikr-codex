// app/dev/auth-test.tsx (dev-only)
import React, { useState } from 'react'
import { View, TextInput, Button, Text } from 'react-native'
import { supabase } from '@/lib/supabase' // adjust to your client

export default function AuthTest() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={{ borderWidth: 1, padding: 8 }} />
      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      <Button title="Sign in" onPress={async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setMsg(error ? error.message : 'Signed in')
      }} />
      <Button title="Sign out" onPress={async () => {
        const { error } = await supabase.auth.signOut()
        setMsg(error ? error.message : 'Signed out')
      }} />
      <Text>{msg}</Text>
    </View>
  )
}
