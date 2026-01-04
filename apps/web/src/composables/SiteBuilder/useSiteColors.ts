import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import { hsvToRgb, rgbToHex } from '../../components/SiteBuilder/utils/colorConversion'

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
  cssP3: string
  hex: string
}

export type UseSiteColorsOptions = {
  initialHue?: number
  initialSaturation?: number
  initialValue?: number
  // Foundation color initial values (HSV)
  initialFoundationHue?: number
  initialFoundationSaturation?: number
  initialFoundationValue?: number
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
  // Foundation (HSV values)
  foundationHue: Ref<number>
  foundationSaturation: Ref<number>
  foundationValue: Ref<number>
  // Derived RGB/Hex (Foundation)
  foundationRgb: ComputedRef<[number, number, number]>
  foundationHex: ComputedRef<string>
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
    // Foundation defaults (light gray)
    initialFoundationHue = 0,
    initialFoundationSaturation = 0,
    initialFoundationValue = 97,
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

  // HSV state (Foundation)
  const foundationHue = ref(initialFoundationHue)
  const foundationSaturation = ref(initialFoundationSaturation)
  const foundationValue = ref(initialFoundationValue)

  // Derived RGB/Hex (Brand)
  const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
  const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

  // Derived RGB/Hex (Accent)
  const accentRgb = computed(() => hsvToRgb(accentHue.value, accentSaturation.value, accentValue.value))
  const accentHex = computed(() => rgbToHex(...accentRgb.value))

  // Derived RGB/Hex (Foundation)
  const foundationRgb = computed(() => hsvToRgb(foundationHue.value, foundationSaturation.value, foundationValue.value))
  const foundationHex = computed(() => rgbToHex(...foundationRgb.value))

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

  // Foundation color in Oklch (derived from HSV)
  const foundationColor = computed((): FoundationColor => {
    const [r, g, b] = foundationRgb.value
    const oklch = $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
    return {
      oklch,
      css: $Oklch.toCss(oklch),
      cssP3: $Oklch.toCssP3(oklch),
      hex: foundationHex.value,
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
    // Foundation (HSV values)
    foundationHue,
    foundationSaturation,
    foundationValue,
    foundationRgb,
    foundationHex,
    foundationColor,
    // Helpers
    isDark,
  }
}
