import { useRef, useState } from 'react'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PressScale } from '../../components/press-scale'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const passwordRef = useRef<TextInput>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  async function signIn() {
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (authError) setError(authError.message)
    else router.replace('/(app)/home')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 48), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <Image
          source={require('../../assets/gokulesh-logo.png')}
          contentFit="contain"
          style={styles.logo}
          accessibilityLabel="GOK-NET"
        />

        <View style={styles.heading}>
          <Text style={styles.title}>Welcome to GOK-NET</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="alexsmith@gmail.com"
              placeholderTextColor="#BBBAB5"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#BBBAB5"
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={signIn}
              style={styles.input}
            />
          </View>

          {error ? (
            <Text selectable style={styles.error}>
              {error}
            </Text>
          ) : null}

          <PressScale
            onPress={signIn}
            disabled={!canSubmit}
            style={styles.button}
            accessibilityLabel="Log in to GOK-NET"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Log in to GOK-NET</Text>
            )}
          </PressScale>
        </View>

        {__DEV__ ? (
          <View style={styles.devArea}>
            <Text style={styles.devLabel}>DEVELOPMENT MODE</Text>
            <PressScale onPress={() => router.replace('/(app)/home')} style={styles.devButton} accessibilityLabel="Skip sign-in and preview app">
              <Text style={styles.devButtonText}>Skip sign-in and preview app</Text>
            </PressScale>
          </View>
        ) : null}

        <Text style={styles.legal}>
          By continuing you agree to our <Text style={styles.legalStrong}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F5F0' },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  logo: { width: 64, height: 64, alignSelf: 'center' },
  heading: { marginTop: 24, gap: 4, alignItems: 'center' },
  title: { color: '#3A3A39', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#888885', fontSize: 14, textAlign: 'center' },
  form: { marginTop: 24, gap: 24 },
  field: { gap: 6 },
  label: { color: '#3A3A39', fontSize: 13, fontWeight: '600' },
  input: { height: 50, borderWidth: 1, borderColor: '#E8E6E0', borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 14, backgroundColor: '#FFFFFF', color: '#3A3A39', fontSize: 15 },
  error: { color: '#B33A32', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  button: { height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B86724', borderRadius: 999 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  devArea: { marginTop: 28, alignItems: 'center', gap: 9 },
  devLabel: { color: '#9B978D', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  devButton: { paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: '#D8D3C8', borderRadius: 99, backgroundColor: '#EEEAE1' },
  devButtonText: { color: '#56534C', fontSize: 13, fontWeight: '600' },
  legal: { marginTop: 'auto', paddingTop: 40, color: '#99958B', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  legalStrong: { color: '#99958B', fontWeight: '500' },
})
