import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

type OnboardingHeaderProps = {
  badge: string
}

export function OnboardingHeader({ badge }: OnboardingHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Image source={require('../../assets/gokulesh-logo.png')} contentFit="contain" style={styles.icon} />
        <Text style={styles.wordmark}>GOK-NET</Text>
      </View>
      <View style={styles.badgeWrap}>
        <Animated.Text key={badge} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.badgeText}>
          {badge}
        </Animated.Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 28, height: 28 },
  wordmark: { fontSize: 18, fontWeight: '700', letterSpacing: -0.36, color: '#252522' },
  badgeWrap: { backgroundColor: '#EBE9E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#8A8A8A' },
})
