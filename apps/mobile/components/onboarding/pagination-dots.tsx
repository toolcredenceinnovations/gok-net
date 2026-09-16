import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, interpolate, interpolateColor, Extrapolation, type SharedValue } from 'react-native-reanimated'

const INACTIVE_COLOR = '#D9D7CE'
const ACTIVE_COLOR = '#B86724'

type PaginationDotsProps = {
  scrollX: SharedValue<number>
  count: number
  width: number
}

export function PaginationDots({ scrollX, count, width }: PaginationDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} scrollX={scrollX} width={width} />
      ))}
    </View>
  )
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      width: interpolate(scrollX.get(), input, [8, 24, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(scrollX.get(), input, [INACTIVE_COLOR, ACTIVE_COLOR, INACTIVE_COLOR]),
    }
  })

  return <Animated.View style={[styles.dot, style]} />
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 999 },
})
