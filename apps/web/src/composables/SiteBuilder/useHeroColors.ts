/**
 * useHeroColors
 *
 * Color and theme management for HeroScene
 * Handles:
 * - Theme mode (light/dark)
 * - Primitive key-based color selection for background and mask layers
 * - Ink color selection for text readability
 * - Foreground element color resolution
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { RGBA } from '@practice/texture'
import type {
  PrimitivePalette,
  ContextName,
  PrimitiveKey,
  NeutralKey,
} from '../../modules/SemanticColorPalette/Domain'
import {
  NEUTRAL_KEYS,
  selectNeutralByHistogram,
  APCA_INK_TARGETS,
  type NeutralEntry,
} from '../../modules/SemanticColorPalette/Domain'
import { selectInkForSurface } from '../../modules/SemanticColorPalette/Infra'
import type { InkRole } from '../../modules/SemanticColorPalette/Domain'
import { generateLuminanceMap } from '../../modules/ContrastChecker'
import type {
  HeroPrimitiveKey,
  ForegroundLayerConfig,
} from '../../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Semantic context to primitive surface key mapping
 */
const CONTEXT_SURFACE_KEYS: Record<'light' | 'dark', Record<ContextName, PrimitiveKey>> = {
  light: {
    canvas: 'F1',
    sectionNeutral: 'F2',
    sectionTint: 'Bt',
    sectionContrast: 'Bf',
  },
  dark: {
    canvas: 'F8',
    sectionNeutral: 'F7',
    sectionTint: 'Bs',
    sectionContrast: 'Bf',
  },
}

/**
 * Element bounds for per-element background analysis (scaled to canvas dimensions)
 */
export interface ElementBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Options for useHeroColors composable
 */
export interface UseHeroColorsOptions {
  /** Primitive palette from parent */
  primitivePalette: ComputedRef<PrimitivePalette>
  /** Dark mode flag from parent */
  isDark: Ref<boolean> | ComputedRef<boolean>
  /** Canvas image data for contrast analysis */
  canvasImageData: Ref<ImageData | null>
  /** Foreground config for element color resolution */
  foregroundConfig: Ref<ForegroundLayerConfig>
}

/**
 * Return type for useHeroColors composable
 */
export interface UseHeroColorsReturn {
  // Theme mode
  /** Current theme mode ('light' | 'dark') */
  themeMode: ComputedRef<'light' | 'dark'>

  // Background layer colors
  /** Primary background color key */
  backgroundColorKey1: Ref<PrimitiveKey>
  /** Secondary background color key ('auto' = canvas surface) */
  backgroundColorKey2: Ref<PrimitiveKey | 'auto'>
  /** Background color 1 as RGBA */
  textureColor1: ComputedRef<RGBA>
  /** Background color 2 as RGBA */
  textureColor2: ComputedRef<RGBA>
  /** Canvas surface key (used when 'auto') */
  canvasSurfaceKey: ComputedRef<PrimitiveKey>

  // Mask layer colors
  /** Primary mask color key ('auto' = surface - deltaL) */
  maskColorKey1: Ref<PrimitiveKey | 'auto'>
  /** Secondary mask color key ('auto' = mask surface) */
  maskColorKey2: Ref<PrimitiveKey | 'auto'>
  /** Semantic context for mask layer */
  maskSemanticContext: Ref<ContextName>
  /** Mask surface key (derived from semantic context) */
  maskSurfaceKey: ComputedRef<PrimitiveKey>
  /** Mask inner color (transparent) as RGBA */
  maskInnerColor: ComputedRef<RGBA>
  /** Mask outer color as RGBA */
  maskOuterColor: ComputedRef<RGBA>
  /** Midground texture color 1 as RGBA */
  midgroundTextureColor1: ComputedRef<RGBA>
  /** Midground texture color 2 as RGBA */
  midgroundTextureColor2: ComputedRef<RGBA>

  // Ink color selection
  /** Get ink color for text on a given surface */
  getInkColorForSurface: (surfaceKey: PrimitiveKey, role?: InkRole) => Oklch
  /** Get ink color as RGBA for rendering */
  getInkRgbaForSurface: (surfaceKey: PrimitiveKey, role?: InkRole) => RGBA

  // Foreground ink colors
  /** Title ink color as CSS string */
  foregroundTitleColor: ComputedRef<string>
  /** Body ink color as CSS string */
  foregroundBodyColor: ComputedRef<string>
  /** Title auto-selected neutral key */
  foregroundTitleAutoKey: ComputedRef<NeutralKey | null>
  /** Body auto-selected neutral key */
  foregroundBodyAutoKey: ComputedRef<NeutralKey | null>
  /** Map of element ID to resolved CSS color string */
  foregroundElementColors: ComputedRef<Map<string, string>>

  // Element bounds for ink color calculation
  /** Set element bounds for background analysis */
  setElementBounds: (elementType: 'title' | 'description', bounds: ElementBounds | null) => void
}

// ============================================================
// Helpers
// ============================================================

/**
 * Convert Oklch color to RGBA tuple
 */
const paletteToRgba = (oklch: Oklch, alpha: number = 1.0): RGBA => {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for color and theme management in HeroScene
 */
export function useHeroColors(options: UseHeroColorsOptions): UseHeroColorsReturn {
  const { primitivePalette, isDark, canvasImageData, foregroundConfig } = options

  // ============================================================
  // Theme Mode
  // ============================================================
  const themeMode = computed((): 'light' | 'dark' => (isDark.value ? 'dark' : 'light'))

  // ============================================================
  // Background Layer Colors
  // ============================================================
  const backgroundColorKey1 = ref<PrimitiveKey>('B')
  const backgroundColorKey2 = ref<PrimitiveKey | 'auto'>('auto')

  const canvasSurfaceKey = computed((): PrimitiveKey => CONTEXT_SURFACE_KEYS[themeMode.value].canvas)

  const resolvedBackgroundColorKey2 = computed((): PrimitiveKey =>
    backgroundColorKey2.value === 'auto' ? canvasSurfaceKey.value : backgroundColorKey2.value
  )

  const textureColor1 = computed((): RGBA => paletteToRgba(primitivePalette.value[backgroundColorKey1.value]))
  const textureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[resolvedBackgroundColorKey2.value]))

  // ============================================================
  // Mask Layer Colors
  // ============================================================
  const maskColorKey1 = ref<PrimitiveKey | 'auto'>('auto')
  const maskColorKey2 = ref<PrimitiveKey | 'auto'>('auto')
  const maskSemanticContext = ref<ContextName>('canvas')

  const maskSurfaceKey = computed((): PrimitiveKey => CONTEXT_SURFACE_KEYS[themeMode.value][maskSemanticContext.value])

  const resolvedMaskColorKey2 = computed((): PrimitiveKey =>
    maskColorKey2.value === 'auto' ? maskSurfaceKey.value : maskColorKey2.value
  )

  const maskInnerColor = computed((): RGBA => paletteToRgba(primitivePalette.value[maskSurfaceKey.value], 0))
  const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value[maskSurfaceKey.value]))

  const midgroundTextureColor1 = computed((): RGBA => {
    if (maskColorKey1.value !== 'auto') {
      return paletteToRgba(primitivePalette.value[maskColorKey1.value])
    }
    // Use larger delta (0.12) to create visible contrast for patterns
    const surface = primitivePalette.value[maskSurfaceKey.value]
    const deltaL = isDark.value ? 0.12 : -0.12
    const shifted: Oklch = { L: surface.L + deltaL, C: surface.C, H: surface.H }
    return paletteToRgba(shifted)
  })

  const midgroundTextureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[resolvedMaskColorKey2.value]))

  // ============================================================
  // Ink Color Selection
  // ============================================================
  const getInkColorForSurface = (surfaceKey: PrimitiveKey, role: InkRole = 'body'): Oklch => {
    const surface = primitivePalette.value[surfaceKey]
    return selectInkForSurface(primitivePalette.value, surface, role)
  }

  const getInkRgbaForSurface = (surfaceKey: PrimitiveKey, role: InkRole = 'body'): RGBA => {
    return paletteToRgba(getInkColorForSurface(surfaceKey, role))
  }

  // ============================================================
  // Foreground Ink Colors
  // ============================================================
  const titleElementBounds = ref<ElementBounds | null>(null)
  const descriptionElementBounds = ref<ElementBounds | null>(null)

  const setElementBounds = (elementType: 'title' | 'description', bounds: ElementBounds | null) => {
    if (elementType === 'title') {
      titleElementBounds.value = bounds
    } else {
      descriptionElementBounds.value = bounds
    }
  }

  const resolvedMaskPrimaryColorOklch = computed((): Oklch => {
    if (maskColorKey1.value !== 'auto') {
      return primitivePalette.value[maskColorKey1.value]
    }
    // Use larger delta (0.12) to create visible contrast for patterns
    const surface = primitivePalette.value[maskSurfaceKey.value]
    const deltaL = isDark.value ? 0.12 : -0.12
    return { L: surface.L + deltaL, C: surface.C, H: surface.H }
  })

  const getNeutralEntries = (): NeutralEntry[] => {
    return NEUTRAL_KEYS.map(key => ({
      key,
      color: primitivePalette.value[key],
    }))
  }

  const selectInkByHistogram = (
    bounds: ElementBounds | null,
    targetLc: number
  ): Oklch | null => {
    const imageData = canvasImageData.value
    if (!imageData || !bounds) return null

    const luminanceMap = generateLuminanceMap(imageData)
    const region = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    }

    const result = selectNeutralByHistogram(
      getNeutralEntries(),
      luminanceMap,
      targetLc,
      region,
      2
    )

    return primitivePalette.value[result.key as NeutralKey]
  }

  const foregroundTitleInk = computed((): Oklch => {
    const histogramResult = selectInkByHistogram(titleElementBounds.value, APCA_INK_TARGETS.title)
    if (histogramResult) {
      return histogramResult
    }
    const surface = resolvedMaskPrimaryColorOklch.value
    return selectInkForSurface(primitivePalette.value, surface, 'title')
  })

  const foregroundBodyInk = computed((): Oklch => {
    const histogramResult = selectInkByHistogram(descriptionElementBounds.value, APCA_INK_TARGETS.body)
    if (histogramResult) {
      return histogramResult
    }
    const surface = resolvedMaskPrimaryColorOklch.value
    return selectInkForSurface(primitivePalette.value, surface, 'body')
  })

  const foregroundTitleColor = computed((): string => $Oklch.toCss(foregroundTitleInk.value))
  const foregroundBodyColor = computed((): string => $Oklch.toCss(foregroundBodyInk.value))

  const findMatchingNeutralKey = (color: Oklch): NeutralKey | null => {
    let bestKey: NeutralKey | null = null
    let bestDiff = Infinity

    for (const key of NEUTRAL_KEYS) {
      const neutralColor = primitivePalette.value[key]
      const diff = Math.abs(neutralColor.L - color.L)
      if (diff < bestDiff) {
        bestDiff = diff
        bestKey = key
      }
    }

    return bestKey
  }

  const foregroundTitleAutoKey = computed((): NeutralKey | null => {
    return findMatchingNeutralKey(foregroundTitleInk.value)
  })

  const foregroundBodyAutoKey = computed((): NeutralKey | null => {
    return findMatchingNeutralKey(foregroundBodyInk.value)
  })

  const resolveForegroundElementColor = (
    colorKey: HeroPrimitiveKey | 'auto' | undefined,
    elementType: 'title' | 'description'
  ): string => {
    if (colorKey === undefined || colorKey === 'auto') {
      return elementType === 'title' ? foregroundTitleColor.value : foregroundBodyColor.value
    }
    const color = primitivePalette.value[colorKey as PrimitiveKey]
    return $Oklch.toCss(color)
  }

  const foregroundElementColors = computed((): Map<string, string> => {
    const colorMap = new Map<string, string>()
    for (const el of foregroundConfig.value.elements) {
      const color = resolveForegroundElementColor(
        el.colorKey as HeroPrimitiveKey | 'auto' | undefined,
        el.type
      )
      colorMap.set(el.id, color)
    }
    return colorMap
  })

  // ============================================================
  // Return
  // ============================================================
  return {
    // Theme mode
    themeMode,

    // Background layer colors
    backgroundColorKey1,
    backgroundColorKey2,
    textureColor1,
    textureColor2,
    canvasSurfaceKey,

    // Mask layer colors
    maskColorKey1,
    maskColorKey2,
    maskSemanticContext,
    maskSurfaceKey,
    maskInnerColor,
    maskOuterColor,
    midgroundTextureColor1,
    midgroundTextureColor2,

    // Ink color selection
    getInkColorForSurface,
    getInkRgbaForSurface,

    // Foreground ink colors
    foregroundTitleColor,
    foregroundBodyColor,
    foregroundTitleAutoKey,
    foregroundBodyAutoKey,
    foregroundElementColors,

    // Element bounds
    setElementBounds,
  }
}
