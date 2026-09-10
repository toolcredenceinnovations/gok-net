import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { Database } from '@sitekhata/shared/types/database'

/**
 * Session lives in expo-secure-store — encrypted on device, not in
 * AsyncStorage. A site engineer's phone is a shared, lost-prone object.
 *
 * expo-secure-store has no web implementation, so the web build (Expo web,
 * used for local dev in a browser) falls back to localStorage instead.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
}

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // No URL to parse in a native app.
      detectSessionInUrl: false,
    },
  }
)
