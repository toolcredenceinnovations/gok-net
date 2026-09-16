import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

export function CaptureVisual() {
  return (
    <View style={styles.frame}>
      <Image source={require('../../assets/onboarding-capture.jpg')} contentFit="cover" style={StyleSheet.absoluteFill} />
      <View style={styles.overlay}>
        <View style={styles.cornerRow}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
        </View>
        <View style={styles.ring} />
        <View style={styles.cornerRow}>
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
      </View>
    </View>
  )
}

const CORNER_SIZE = 20
const CORNER_THICKNESS = 3

const styles = StyleSheet.create({
  frame: { height: 320, width: '100%', borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden' },
  overlay: { flex: 1, backgroundColor: 'rgba(23,23,22,0.6)', padding: 24, alignItems: 'center', justifyContent: 'space-between' },
  cornerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' },
  corner: { width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#FFFFFF' },
  cornerTopLeft: { borderLeftWidth: CORNER_THICKNESS, borderTopWidth: CORNER_THICKNESS },
  cornerTopRight: { borderRightWidth: CORNER_THICKNESS, borderTopWidth: CORNER_THICKNESS },
  cornerBottomLeft: { borderLeftWidth: CORNER_THICKNESS, borderBottomWidth: CORNER_THICKNESS },
  cornerBottomRight: { borderRightWidth: CORNER_THICKNESS, borderBottomWidth: CORNER_THICKNESS },
  ring: { width: 80, height: 80, borderRadius: 999, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.2)' },
})
