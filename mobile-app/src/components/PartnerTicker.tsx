import { memo, useCallback, useEffect, useRef, useState } from "react"
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import type { Partner } from "../config/partners"
import { colors } from "../theme/colors"

interface PartnerTickerProps {
  items: Partner[]
  label?: string
  durationMs?: number
}

const ITEM_SPACING = 28

function PartnerLogo({ partner }: { partner: Partner }) {
  const [failed, setFailed] = useState(false)
  if (partner.logo && !failed) {
    return (
      <Image
        source={{ uri: partner.logo }}
        style={styles.logo}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <View style={styles.monogram}>
      <Text style={styles.monogramText}>{partner.name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  )
}

function PartnerItem({ partner }: { partner: Partner }) {
  return (
    <View style={styles.item} accessibilityLabel={`${partner.name}${partner.tagline ? ` — ${partner.tagline}` : ""}`}>
      <PartnerLogo partner={partner} />
      <View style={styles.itemText}>
        <Text style={styles.name} numberOfLines={1}>
          {partner.name}
        </Text>
        {partner.tagline ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {partner.tagline}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function Row({ items }: { items: Partner[] }) {
  return (
    <View style={styles.row}>
      {items.map((partner, i) => (
        <PartnerItem key={`${partner.name}-${i}`} partner={partner} />
      ))}
    </View>
  )
}

export const PartnerTicker = memo(function PartnerTicker({
  items,
  label = "Our Partners",
  durationMs = 42000,
}: PartnerTickerProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const copyWidth = useRef(0)
  const currentOffset = useRef(0)
  const animRef = useRef<Animated.CompositeAnimation | null>(null)
  const paused = useRef(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion)
    const id = translateX.addListener(({ value }) => {
      currentOffset.current = value
    })
    return () => translateX.removeListener(id)
  }, [translateX])

  const startLoop = useCallback(
    (fromX: number, width: number, speedMs: number) => {
      animRef.current?.stop()
      if (reducedMotion || width <= 0) return
      paused.current = false
      animRef.current = Animated.loop(
        Animated.timing(translateX, {
          toValue: -width,
          duration: Math.max(500, speedMs),
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        }),
      )
      translateX.setValue(fromX)
      animRef.current.start()
    },
    [reducedMotion, translateX],
  )

  useEffect(() => {
    if (copyWidth.current > 0 && items.length > 0) {
      startLoop(0, copyWidth.current, durationMs)
    }
    return () => animRef.current?.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, durationMs, reducedMotion])

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const width = Math.floor(e.nativeEvent.layout.width / 2)
    if (width !== copyWidth.current) {
      copyWidth.current = width
      if (!paused.current) startLoop(0, width, durationMs)
    }
  }

  const handlePressIn = () => {
    if (!animRef.current) return
    paused.current = true
    animRef.current.stop()
  }

  const handlePressOut = () => {
    if (!paused.current || copyWidth.current <= 0) return
    const current = Math.min(currentOffset.current, 0)
    const remaining = Math.abs(current)
    const remainingMs = Math.max(500, (remaining / copyWidth.current) * durationMs)
    startLoop(current, copyWidth.current, remainingMs)
  }

  if (!items.length) return null

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.viewport}>
          <LinearGradient
            colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeLeft}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.9)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeRight}
            pointerEvents="none"
          />
          <Animated.View
            style={[styles.track, { transform: [{ translateX }] }]}
            onLayout={onTrackLayout}
          >
            <Row items={items} />
            <Row items={items} />
          </Animated.View>
        </View>
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: 16,
  },
  label: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 4,
    marginBottom: 10,
  },
  viewport: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: ITEM_SPACING / 2,
    paddingVertical: 10,
  },
  logo: {
    width: 34,
    height: 34,
    opacity: 0.75,
  },
  monogram: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  monogramText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontWeight: "700",
  },
  itemText: {
    marginLeft: 10,
  },
  name: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 160,
  },
  tagline: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    maxWidth: 160,
  },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 2,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 2,
  },
})
