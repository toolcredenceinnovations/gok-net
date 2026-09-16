import { useEffect, useState } from 'react'
import { Redirect, Stack } from 'expo-router'
import { View } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function AppLayout() {
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(session != null)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(session != null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  if (hasSession === null) return <View style={{ flex: 1, backgroundColor: '#F7F5F0' }} />
  if (!hasSession) return <Redirect href="/(auth)/login" />

  return <Stack screenOptions={{ headerShown: false }} />
}
