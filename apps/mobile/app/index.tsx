import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect } from 'expo-router'
import { View } from 'react-native'
import { supabase } from '../lib/supabase'

const ONBOARDING_KEY = 'gok-net.onboarding-complete'

type Destination = '/onboarding' | '/(auth)/login' | '/(app)/home'

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      AsyncStorage.getItem(ONBOARDING_KEY),
      supabase.auth.getSession(),
    ])
      .then(([onboardingValue, { data: { session } }]) => {
        if (cancelled) return
        if (onboardingValue !== 'true') {
          setDestination('/onboarding')
        } else {
          setDestination(session ? '/(app)/home' : '/(auth)/login')
        }
      })
      .catch(() => {
        if (!cancelled) setDestination('/onboarding')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!destination) return <View style={{ flex: 1, backgroundColor: '#F7F5F0' }} />

  return <Redirect href={destination} />
}
