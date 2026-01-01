import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import { hsvToRgb, rgbToHex } from '../../components/SiteBuilder/utils/colorConversion'
import { FOUNDATION_PRESETS } from '../../components/SiteBuilder/foundationPresets'

export type BrandColor = {
  hex: string
  oklch: Oklch
  cssOklch: string
}

export type AccentColor = {
  hex: string
  oklch: Oklch
  cssOklch: string
}

export type FoundationColor = {
  oklch: Oklch
  css: string
  hex: string
  label: string
}

export type UseSiteColorsOptions = {
  initialHue?: number
  initialSaturation?: number
  initialValue?: number
  initialFoundationId?: string
  // Accent color initial values
  initialAccentHue?: number
  initialAccentSaturation?: number
  initialAccentValue?: number
}

export type UseSiteColorsReturn = {
  // HSV state (Brand)
  hue: Ref<number>
  saturation: Ref<number>
  value: Ref<number>
  // Derived RGB/Hex (Brand)
  selectedRgb: ComputedRef<[number, number, number]>
  selectedHex: ComputedRef<string>
  // Brand color
  brandColor: ComputedRef<BrandColor>
  // HSV state (Accent)
  accentHue: Ref<number>
  accentSaturation: Ref<number>
  accentValue: Ref<number>
  // Derived RGB/Hex (Accent)
  accentRgb: ComputedRef<[number, number, number]>
  accentHex: ComputedRef<string>
  // Accent color
  accentColor: ComputedRef<AccentColor>
  // Foundation
  selectedFoundationId: Ref<string>
  foundationColor: ComputedRef<FoundationColor>
  // Helpers
  isDark: ComputedRef<boolean>
}

/**
 * Composable for managing site brand and foundation colors.
 * Combines HSV color picker state with foundation preset selection.
 */
export const useSiteColors = (options: UseSiteColorsOptions = {}): UseSiteColorsReturn => {
  const {
    initialHue = 198,
    initialSaturation = 70,
    initialValue = 65,
    initialFoundationId = 'white',
    // Accent defaults (complementary hue offset from brand)
    initialAccentHue = 30,
    initialAccentSaturation = 80,
    initialAccentValue = 60,
  } = options

  // HSV state (Brand)
  const hue = ref(initialHue)
  const saturation = ref(initialSaturation)
  const value = ref(initialValue)

  // HSV state (Accent)
  const accentHue = ref(initialAccentHue)
  const accentSaturation = ref(initialAccentSaturation)
  const accentValue = ref(initialAccentValue)

  // Derived RGB/Hex (Brand)
  const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
  const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

  // Derived RGB/Hex (Accent)
  const accentRgb = computed(() => hsvToRgb(accentHue.value, accentSaturation.value, accentValue.value))
  const accentHex = computed(() => rgbToHex(...accentRgb.value))

  // Brand color in Oklch
  const brandColor = computed((): BrandColor => {
    const [r, g, b] = selectedRgb.value
    const oklch = $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
    return {
      hex: selectedHex.value,
      oklch,
      cssOklch: $Oklch.toCss(oklch),
    }
  })

  // Accent color in Oklch
  const accentColor = computed((): AccentColor => {
    const [r, g, b] = accentRgb.value
    const oklch = $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
    return {
      hex: accentHex.value,
      oklch,
      cssOklch: $Oklch.toCss(oklch),
    }
  })

  // Foundation preset state
  const selectedFoundationId = ref(initialFoundationId)

  const foundationColor = computed((): FoundationColor => {
    const preset = FOUNDATION_PRESETS.find((p) => p.id === selectedFoundationId.value) ?? FOUNDATION_PRESETS[0]!
    const presetHue = preset.H === 'brand' ? hue.value : preset.H
    const oklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
    const srgb = $Oklch.toSrgb(oklch)
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
    return {
      oklch,
      css: $Oklch.toCss(oklch),
      hex: `#${toHex(srgb.r)}${toHex(srgb.g)}${toHex(srgb.b)}`,
      label: preset.label,
    }
  })

  // Helper: is dark mode based on foundation lightness
  const isDark = computed(() => foundationColor.value.oklch.L <= 0.5)

  return {
    // Brand
    hue,
    saturation,
    value,
    selectedRgb,
    selectedHex,
    brandColor,
    // Accent
    accentHue,
    accentSaturation,
    accentValue,
    accentRgb,
    accentHex,
    accentColor,
    // Foundation
    selectedFoundationId,
    foundationColor,
    // Helpers
    isDark,
  }
}
