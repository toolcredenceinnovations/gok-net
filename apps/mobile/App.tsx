import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { formatAmount, formatLakh, STATUS_LABEL } from '@sitekhata/shared'
import { supabase } from './lib/supabase'

/**
 * Phase 0 scaffold. Deliberately minimal: this exists to prove that the Expo
 * app shares `packages/shared` with the web app and authenticates against the
 * same Supabase project. Screens land in Phase 5, once the PWA has shown how
 * the site engineer actually works.
 */
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function sendCode() {
    setError(null)
    const digits = phone.replace(/\D/g, '')
    const { error } = await supabase.auth.signInWithOtp({
      phone: digits.length === 10 ? `+91${digits}` : `+${digits}`,
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (session) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Signed in</Text>
        <Text style={styles.muted}>{session.user.phone ?? session.user.email}</Text>

        {/* shared package working on native, same as web */}
        <Text style={styles.amount}>{formatAmount(250000)}</Text>
        <Text style={styles.muted}>{formatLakh(250000)}</Text>
        <Text style={styles.muted}>{STATUS_LABEL.partial}</Text>

        <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>SiteKhata</Text>
      <Text style={styles.muted}>{sent ? 'Check your phone for the code.' : 'Sign in with your phone.'}</Text>

      {!sent && (
        <>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.button} onPress={sendCode} disabled={!phone}>
            <Text style={styles.buttonText}>Send code</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 24, fontWeight: '600' },
  muted: { marginTop: 4, color: '#525252' },
  amount: { marginTop: 24, fontSize: 34, fontWeight: '700' },
  input: { marginTop: 20, width: '100%', borderWidth: 1, borderColor: '#d4d4d4', borderRadius: 8, padding: 14, fontSize: 18, backgroundColor: '#fff' },
  button: { marginTop: 16, width: '100%', backgroundColor: '#171717', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { marginTop: 12, color: '#b91c1c' },
})
