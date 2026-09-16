import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync()
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  )
}
