import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandLogo } from '../../components/brand-logo'
import { supabase } from '../../lib/supabase'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}
    >
      <BrandLogo compact />
      <View style={styles.badge}><Text style={styles.badgeText}>PHASE 1 PREVIEW</Text></View>
      <Text style={styles.title}>Navigation is ready.</Text>
      <Text style={styles.body}>The complete home dashboard will arrive in the next phase. This route confirms the development login bypass and authenticated app area are separated correctly.</Text>
      <Pressable onPress={signOut} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F5F0' },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  badge: { alignSelf: 'flex-start', marginTop: 80, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: '#E8F5F3' },
  badgeText: { color: '#167E7B', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { marginTop: 18, color: '#292927', fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1 },
  body: { marginTop: 12, color: '#706E68', fontSize: 16, lineHeight: 25 },
  button: { marginTop: 28, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#D8D3C8', backgroundColor: '#FFFFFF' },
  buttonText: { color: '#45433E', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
})
