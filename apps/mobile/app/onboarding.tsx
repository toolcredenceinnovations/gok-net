import { useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { StyleSheet, Text, View, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  scrollTo,
  FadeIn,
  FadeOut,
  type SharedValue,
} from 'react-native-reanimated'
import { ArrowRightIcon } from '../components/arrow-right-icon'
import { PressScale } from '../components/press-scale'
import { OnboardingHeader } from '../components/onboarding/onboarding-header'
import { PaginationDots } from '../components/onboarding/pagination-dots'
import { CaptureVisual } from '../components/onboarding/capture-visual'
import { TrackerVisual } from '../components/onboarding/tracker-visual'
import { LeadsVisual } from '../components/onboarding/leads-visual'

const ONBOARDING_KEY = 'gok-net.onboarding-complete'

const SLIDES = [
  {
    key: 'capture',
    badge: 'LEDGER',
    eyebrow: 'FAST CAPTURE',
    title: 'Log site expenses in seconds',
    subtitle: 'Snap a bill, enter the amount, and move on. No more paper trail clutter or forgotten receipts at the end of the day.',
    Visual: CaptureVisual,
  },
  {
    key: 'tracker',
    badge: 'TRACKER',
    eyebrow: 'FINANCIAL CONTROL',
    title: 'Know where every rupee goes',
    subtitle: 'Track paid, partly paid, and unpaid statuses by month, category, and vendor. Seamlessly manage cashflow across construction projects.',
    Visual: TrackerVisual,
  },
  {
    key: 'leads',
    badge: 'LEAD MANAGER',
    eyebrow: 'LEAD GENERATION',
    title: 'Turn every lead into a sale',
    subtitle: 'Capture, qualify, and track every lead from first touch to close. Stay on top of follow-ups, conversions, and pipeline performance.',
    Visual: LeadsVisual,
  },
] as const

const LAST_INDEX = SLIDES.length - 1

export default function OnboardingScreen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [index, setIndex] = useState(0)
  const scrollX = useSharedValue(0)
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const finishing = useRef(false)

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.set(event.contentOffset.x)
    },
  })

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width)
    setIndex((current) => (current === next ? current : next))
  }

  useEffect(() => {
    void Haptics.selectionAsync()
  }, [index])

  function goTo(nextIndex: number) {
    scrollTo(scrollRef, nextIndex * width, 0, true)
    setIndex(nextIndex)
  }

  async function finishOnboarding() {
    if (finishing.current) return
    finishing.current = true
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {})
    router.replace('/(auth)/login')
  }

  const isLast = index === LAST_INDEX

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OnboardingHeader badge={SLIDES[index].badge} />

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, slideIndex) => (
          <Slide key={slide.key} slide={slide} slideIndex={slideIndex} scrollX={scrollX} width={width} />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <PaginationDots scrollX={scrollX} count={SLIDES.length} width={width} />

        <View style={styles.actionRow}>
          {isLast ? (
            <Animated.View key="get-started" entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.getStartedWrap}>
              <PressScale onPress={finishOnboarding} style={styles.getStartedButton} accessibilityLabel="Get started">
                <Text style={styles.getStartedText}>Get Started</Text>
                <ArrowRightIcon />
              </PressScale>
            </Animated.View>
          ) : (
            <Animated.View key="skip-next" entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.skipNextRow}>
              <PressScale onPress={finishOnboarding} style={styles.skipButton} accessibilityLabel="Skip onboarding">
                <Text style={styles.skipText}>Skip</Text>
              </PressScale>
              <PressScale onPress={() => goTo(index + 1)} style={styles.nextButton} accessibilityLabel="Next">
                <Text style={styles.nextText}>Next</Text>
                <ArrowRightIcon />
              </PressScale>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  )
}

type SlideData = (typeof SLIDES)[number]

function Slide({
  slide,
  slideIndex,
  scrollX,
  width,
}: {
  slide: SlideData
  slideIndex: number
  scrollX: SharedValue<number>
  width: number
}) {
  const Visual = slide.Visual

  const visualStyle = useAnimatedStyle(() => {
    const input = [(slideIndex - 1) * width, slideIndex * width, (slideIndex + 1) * width]
    return {
      opacity: interpolate(scrollX.get(), input, [0.6, 1, 0.6], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(scrollX.get(), input, [0.94, 1, 0.94], Extrapolation.CLAMP) }],
    }
  })

  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.visualArea}>
        <Animated.View style={visualStyle}>
          <Visual />
        </Animated.View>
      </View>
      <View style={styles.copyArea}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F5F0' },
  pager: { flex: 1 },
  slide: { flex: 1 },
  visualArea: { paddingHorizontal: 24, paddingTop: 8 },
  copyArea: { paddingHorizontal: 28, paddingTop: 24, gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#B86724' },
  title: { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.32, color: '#252522' },
  subtitle: { fontSize: 16, lineHeight: 24, color: '#8A8A8A' },
  footer: { paddingHorizontal: 24, paddingTop: 16, gap: 24 },
  actionRow: { minHeight: 56, justifyContent: 'center' },
  skipNextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipButton: { paddingVertical: 12, paddingHorizontal: 16 },
  skipText: { fontSize: 16, fontWeight: '600', color: '#8A8A8A' },
  nextButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#252522', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 999 },
  nextText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  getStartedWrap: { width: '100%' },
  getStartedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#B86724', paddingVertical: 16, borderRadius: 999, width: '100%' },
  getStartedText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
