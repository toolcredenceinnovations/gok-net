import { type ReactNode } from 'react'
import { Pressable, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)

type PressScaleProps = {
  onPress?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
  accessibilityRole?: 'button'
  accessibilityLabel?: string
}

export function PressScale({ onPress, disabled, style, children, accessibilityLabel }: PressScaleProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.set(withTiming(0.97, { duration: 120, easing: EASE_OUT }))
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: 120, easing: EASE_OUT }))
      }}
      hitSlop={8}
      pressRetentionOffset={16}
    >
      <Animated.View style={[style, animatedStyle, disabled && { opacity: 0.6 }]}>{children}</Animated.View>
    </Pressable>
  )
}
