import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

type BrandLogoProps = {
  compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Image
        source={require('../assets/gokulesh-wordmark.png')}
        contentFit="contain"
        style={styles.image}
        accessibilityLabel="Gokulesh Group"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: 230, height: 84 },
  compact: { width: 184, height: 68 },
  image: { width: '100%', height: '100%' },
})
