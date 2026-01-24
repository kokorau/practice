/**
 * useSiteColorsBridge - Bridge between useSiteState (Oklch) and HSV color controls
 *
 * This composable wraps useSiteState to provide HSV refs compatible with
 * color picker UI components while keeping the Site's seedColors as the
 * source of truth in Oklch format.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import type { UseSiteStateReturn } from './useSiteState'
import {
  hsvToOklch,
  oklchToHsv,
  hsvToRgb,
  rgbToHex,
  type HSVColor,
} from '../../components/SiteBuilder/utils/colorConversion'

// ============================================================================
// Types
// ============================================================================

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

export interface UseSiteColorsBridgeOptions {
  /** useSiteState return value */
  siteState: UseSiteStateReturn
}

/**
 * HSV color values with hex for UI display
 */
export interface HSVColorWithHex {
  hue: number
  saturation: number
  value: number
  hex: string
}

/**
 * Color state for UI components (brand, accent, foundation)
 */
export interface ColorState {
  brand: HSVColorWithHex
  accent: HSVColorWithHex
  foundation: HSVColorWithHex
}

export interface UseSiteColorsBridgeReturn {
  // HSV state (Brand) - writable refs that sync with Site
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
  // Pre-built color state for UI components
  colorState: ComputedRef<ColorState>
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Bridge composable that provides HSV refs synced with Site's Oklch seedColors.
 *
 * @example
 * ```typescript
 * const siteState = useSiteState({ initialSite })
 * const colors = useSiteColorsBridge({ siteState })
 *
 * // Use colors.hue, colors.saturation, colors.value with color pickers
 * // Changes automatically sync to siteState.seedColors
 * ```
 */
export const useSiteColorsBridge = (
  options: UseSiteColorsBridgeOptions
): UseSiteColorsBridgeReturn => {
  const { siteState } = options

  // ========================================================================
  // Initialize HSV refs from Site's seedColors
  // ========================================================================

  const initBrandHsv = (): HSVColor => oklchToHsv(siteState.seedColors.value.brand)
  const initFoundationHsv = (): HSVColor => oklchToHsv(siteState.seedColors.value.foundation)
  const initAccentHsv = (): HSVColor => oklchToHsv(siteState.seedColors.value.accent)

  // Brand HSV refs
  const brandHsv = initBrandHsv()
  const hue = ref(brandHsv.h)
  const saturation = ref(brandHsv.s)
  const value = ref(brandHsv.v)

  // Foundation HSV refs
  const foundationHsv = initFoundationHsv()
  const foundationHue = ref(foundationHsv.h)
  const foundationSaturation = ref(foundationHsv.s)
  const foundationValue = ref(foundationHsv.v)

  // Accent HSV refs
  const accentHsv = initAccentHsv()
  const accentHue = ref(accentHsv.h)
  const accentSaturation = ref(accentHsv.s)
  const accentValue = ref(accentHsv.v)

  // ========================================================================
  // Flag to prevent circular updates
  // ========================================================================

  let isUpdatingFromSite = false
  let isUpdatingToSite = false

  // ========================================================================
  // Watch HSV changes and sync to Site (HSV -> Oklch -> Site)
  // ========================================================================

  // Brand color sync
  watch(
    [hue, saturation, value],
    ([h, s, v]) => {
      if (isUpdatingFromSite) return
      isUpdatingToSite = true
      const oklch = hsvToOklch({ h, s, v })
      siteState.updateBrandColor(oklch)
      isUpdatingToSite = false
    },
    { flush: 'sync' }
  )

  // Foundation color sync
  watch(
    [foundationHue, foundationSaturation, foundationValue],
    ([h, s, v]) => {
      if (isUpdatingFromSite) return
      isUpdatingToSite = true
      const oklch = hsvToOklch({ h, s, v })
      siteState.updateFoundationColor(oklch)
      isUpdatingToSite = false
    },
    { flush: 'sync' }
  )

  // Accent color sync
  watch(
    [accentHue, accentSaturation, accentValue],
    ([h, s, v]) => {
      if (isUpdatingFromSite) return
      isUpdatingToSite = true
      const oklch = hsvToOklch({ h, s, v })
      siteState.updateAccentColor(oklch)
      isUpdatingToSite = false
    },
    { flush: 'sync' }
  )

  // ========================================================================
  // Watch Site seedColors changes and sync to HSV (Site -> Oklch -> HSV)
  // ========================================================================

  watch(
    () => siteState.seedColors.value,
    (newSeedColors) => {
      if (isUpdatingToSite) return
      isUpdatingFromSite = true

      // Update brand
      const newBrandHsv = oklchToHsv(newSeedColors.brand)
      hue.value = newBrandHsv.h
      saturation.value = newBrandHsv.s
      value.value = newBrandHsv.v

      // Update foundation
      const newFoundationHsv = oklchToHsv(newSeedColors.foundation)
      foundationHue.value = newFoundationHsv.h
      foundationSaturation.value = newFoundationHsv.s
      foundationValue.value = newFoundationHsv.v

      // Update accent
      const newAccentHsv = oklchToHsv(newSeedColors.accent)
      accentHue.value = newAccentHsv.h
      accentSaturation.value = newAccentHsv.s
      accentValue.value = newAccentHsv.v

      isUpdatingFromSite = false
    },
    { deep: true }
  )

  // ========================================================================
  // Derived RGB/Hex (Brand)
  // ========================================================================

  const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
  const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

  const brandColor = computed((): BrandColor => {
    const oklch = siteState.seedColors.value.brand
    return {
      hex: selectedHex.value,
      oklch,
      cssOklch: $Oklch.toCss(oklch),
    }
  })

  // ========================================================================
  // Derived RGB/Hex (Accent)
  // ========================================================================

  const accentRgb = computed(() =>
    hsvToRgb(accentHue.value, accentSaturation.value, accentValue.value)
  )
  const accentHex = computed(() => rgbToHex(...accentRgb.value))

  const accentColor = computed((): AccentColor => {
    const oklch = siteState.seedColors.value.accent
    return {
      hex: accentHex.value,
      oklch,
      cssOklch: $Oklch.toCss(oklch),
    }
  })

  // ========================================================================
  // Derived RGB/Hex (Foundation)
  // ========================================================================

  const foundationRgb = computed(() =>
    hsvToRgb(foundationHue.value, foundationSaturation.value, foundationValue.value)
  )
  const foundationHex = computed(() => rgbToHex(...foundationRgb.value))

  const foundationColor = computed((): FoundationColor => {
    const oklch = siteState.seedColors.value.foundation
    return {
      oklch,
      css: $Oklch.toCss(oklch),
      cssP3: $Oklch.toCssP3(oklch),
      hex: foundationHex.value,
    }
  })

  // ========================================================================
  // Helpers
  // ========================================================================

  const isDark = computed(() => siteState.isDark.value)

  // ========================================================================
  // Pre-built Color State for UI
  // ========================================================================

  const colorState = computed((): ColorState => ({
    brand: {
      hue: hue.value,
      saturation: saturation.value,
      value: value.value,
      hex: selectedHex.value,
    },
    accent: {
      hue: accentHue.value,
      saturation: accentSaturation.value,
      value: accentValue.value,
      hex: accentHex.value,
    },
    foundation: {
      hue: foundationHue.value,
      saturation: foundationSaturation.value,
      value: foundationValue.value,
      hex: foundationHex.value,
    },
  }))

  // ========================================================================
  // Return
  // ========================================================================

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
    foundationHue,
    foundationSaturation,
    foundationValue,
    foundationRgb,
    foundationHex,
    foundationColor,
    // Helpers
    isDark,
    colorState,
  }
}
