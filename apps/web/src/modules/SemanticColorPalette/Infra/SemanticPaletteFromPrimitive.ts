import { $Oklch, contrastRatio } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, NeutralKey, PrimitiveKey } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS } from '../Domain/ValueObject/PrimitivePalette'
import type { SemanticColorPalette, SemanticColorPaletteInput } from '../Domain/ValueObject/SemanticColorPalette'
import { $SemanticColorPalette } from '../Domain/ValueObject/SemanticColorPalette'
import type { ActionState } from '../Domain/ValueObject/SemanticNames'

/**
 * SemanticPaletteFromPrimitive
 *
 * Generates a SemanticColorPalette from a PrimitivePalette.
 * Ink colors are selected based on WCAG contrast ratios against surfaces.
 */

// ============================================================================
// Target Contrast Ratios (WCAG-based)
// ============================================================================

/**
 * Ink contrast targets:
 * - title: AA Large (3:1) - strong emphasis
 * - body: AAA (7:1) - maximum readability
 * - meta: AA (4.5:1) - secondary text, can be weaker than body
 * - linkText: same as body (7:1) - underline provides affordance, hue = N
 * - border: ~2:1 - low contrast for subtle UI elements
 * - divider: ~1.5:1 - even more subtle than border
 */
type ContrastTargets = {
  title: number
  body: number
  meta: number
  linkText: number
  border: number
  divider: number
}

const INK_CONTRAST_TARGETS: ContrastTargets = {
  title: 3.0,      // AA Large
  body: 7.0,       // AAA
  meta: 4.5,       // AA
  linkText: 7.0,   // Same as body
  border: 2.0,     // Low contrast
  divider: 1.5,    // Very subtle
}

// For disabled states, use much lower contrast
const DISABLED_CONTRAST_TARGETS: ContrastTargets = {
  title: 2.5,
  body: 2.5,
  meta: 2.0,
  linkText: 2.5,
  border: 1.5,
  divider: 1.3,
}

// ============================================================================
// Helpers
// ============================================================================

// Helper: convert Oklch to CSS string
const css = (color: Oklch): string => $Oklch.toCss(color)
const cssKey = (p: PrimitivePalette, key: PrimitiveKey): string => css(p[key])

/**
 * Find the best neutral (N0-N9) that meets or exceeds target contrast.
 *
 * Strategy:
 * - Light mode: search from darkest (N9) to lightest (N0)
 * - Dark mode: search from lightest (N0) to darkest (N9)
 *
 * Returns the first neutral that meets the target, or the extreme if none meet it.
 */
const findNeutralByContrast = (
  p: PrimitivePalette,
  surface: Oklch,
  targetContrast: number,
  isLight: boolean
): NeutralKey => {
  // Search order: dark mode searches light→dark, light mode searches dark→light
  const searchOrder: NeutralKey[] = isLight
    ? [...NEUTRAL_KEYS].reverse() // N9, N8, ..., N0
    : [...NEUTRAL_KEYS]           // N0, N1, ..., N9

  for (const key of searchOrder) {
    const neutral = p[key]
    const ratio = contrastRatio(neutral, surface)
    if (ratio >= targetContrast) {
      return key
    }
  }

  // Fallback: return the extreme (most contrasting)
  return isLight ? 'N9' : 'N0'
}

/**
 * Find neutral that is closest to target contrast (for subtle elements).
 * Used for border/divider where we want exactly the target, not maximum.
 */
const findNeutralClosestToContrast = (
  p: PrimitivePalette,
  surface: Oklch,
  targetContrast: number
): NeutralKey => {
  let bestKey: NeutralKey = 'N5'
  let bestDiff = Infinity

  for (const key of NEUTRAL_KEYS) {
    const neutral = p[key]
    const ratio = contrastRatio(neutral, surface)
    const diff = Math.abs(ratio - targetContrast)
    if (diff < bestDiff) {
      bestDiff = diff
      bestKey = key
    }
  }

  return bestKey
}

// ============================================================================
// Ink Selection (Contrast-based)
// ============================================================================

type InkColors = {
  title: string
  body: string
  meta: string
  linkText: string
  border: string
  divider: string
}

/**
 * Build ink colors for a given surface using contrast-based selection.
 */
const buildInkForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets = INK_CONTRAST_TARGETS
): InkColors => {
  // Text inks: find neutrals that meet or exceed target contrast
  const titleKey = findNeutralByContrast(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByContrast(p, surface, targets.body, isLight)
  const metaKey = findNeutralByContrast(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByContrast(p, surface, targets.linkText, isLight)

  // Line inks: find neutrals closest to target (not exceeding)
  const borderKey = findNeutralClosestToContrast(p, surface, targets.border)
  const dividerKey = findNeutralClosestToContrast(p, surface, targets.divider)

  return {
    title: css(p[titleKey]),
    body: css(p[bodyKey]),
    meta: css(p[metaKey]),
    linkText: css(p[linkTextKey]),
    border: css(p[borderKey]),
    divider: css(p[dividerKey]),
  }
}

// ============================================================================
// Surface Mapping
// ============================================================================

type SurfaceKeys = {
  canvas: PrimitiveKey
  sectionNeutral: PrimitiveKey
  sectionTint: PrimitiveKey
  sectionContrast: PrimitiveKey
  card: PrimitiveKey
  cardFlat: PrimitiveKey
}

const SURFACE_KEYS_LIGHT: SurfaceKeys = {
  canvas: 'F1',
  sectionNeutral: 'F1',
  sectionTint: 'Bt',
  sectionContrast: 'Bf',
  card: 'Bt',       // Same as sectionTint
  cardFlat: 'F2',   // One step inside from canvas
}

const SURFACE_KEYS_DARK: SurfaceKeys = {
  canvas: 'F8',
  sectionNeutral: 'F8',
  sectionTint: 'Bs',
  sectionContrast: 'Bf',
  card: 'Bs',       // Same as sectionTint
  cardFlat: 'F7',   // One step inside from canvas
}

// ============================================================================
// Token Builders
// ============================================================================

// Build base tokens (surface + ink) with contrast-based ink selection
const buildBaseTokens = (
  p: PrimitivePalette,
  surfaceKey: PrimitiveKey,
  isLight: boolean
) => {
  const surface = p[surfaceKey]
  return {
    surface: css(surface),
    ink: buildInkForSurface(p, surface, isLight),
  }
}

/**
 * Action button surface states
 */
const buildActionSurface = (p: PrimitivePalette, isLight: boolean) => {
  const bf = p.Bf
  const disabledKey: PrimitiveKey = isLight ? 'N2' : 'N7'

  // Adjust lightness for hover/active states
  const hoverL = isLight ? bf.L - 0.05 : bf.L + 0.05
  const activeL = isLight ? bf.L - 0.10 : bf.L + 0.10

  return {
    default: css(bf),
    hover: css({ ...bf, L: Math.max(0, Math.min(1, hoverL)) }),
    active: css({ ...bf, L: Math.max(0, Math.min(1, activeL)) }),
    disabled: cssKey(p, disabledKey),
  }
}

/**
 * Action quiet button surface states
 */
const buildActionQuietSurface = (p: PrimitivePalette, isLight: boolean) => {
  const hoverKey: PrimitiveKey = isLight ? 'F2' : 'F7'
  const activeKey: PrimitiveKey = isLight ? 'F3' : 'F6'

  return {
    default: 'transparent',
    hover: cssKey(p, hoverKey),
    active: cssKey(p, activeKey),
    disabled: 'transparent',
  }
}

/**
 * Build stateful ink for action buttons.
 * Uses Bf surface for default/hover/active, and calculates disabled separately.
 */
const buildActionStatefulInk = (
  p: PrimitivePalette,
  isLight: boolean
) => {
  const bf = p.Bf
  const disabledSurface = isLight ? p.N2 : p.N7

  // Determine if Bf is light or dark for ink selection
  const bfIsLight = bf.L > 0.5

  const defaultInk = buildInkForSurface(p, bf, bfIsLight)
  const disabledInk = buildInkForSurface(p, disabledSurface, isLight, DISABLED_CONTRAST_TARGETS)

  const buildStateMap = (defaultVal: string, disabledVal: string) => ({
    default: defaultVal,
    hover: defaultVal,
    active: defaultVal,
    disabled: disabledVal,
  })

  return {
    title: buildStateMap(defaultInk.title, disabledInk.title),
    body: buildStateMap(defaultInk.body, disabledInk.body),
    meta: buildStateMap(defaultInk.meta, disabledInk.meta),
    linkText: buildStateMap(defaultInk.linkText, disabledInk.linkText),
    border: buildStateMap(defaultInk.border, disabledInk.border),
    divider: buildStateMap(defaultInk.divider, disabledInk.divider),
  }
}

/**
 * Build stateful ink for quiet action buttons.
 * Uses canvas surface for default, F2/F7 for hover/active.
 */
const buildActionQuietStatefulInk = (
  p: PrimitivePalette,
  isLight: boolean
) => {
  const canvasSurface = isLight ? p.F1 : p.F8
  const hoverSurface = isLight ? p.F2 : p.F7
  const activeSurface = isLight ? p.F3 : p.F6

  const defaultInk = buildInkForSurface(p, canvasSurface, isLight)
  const hoverInk = buildInkForSurface(p, hoverSurface, isLight)
  const activeInk = buildInkForSurface(p, activeSurface, isLight)
  const disabledInk = buildInkForSurface(p, canvasSurface, isLight, DISABLED_CONTRAST_TARGETS)

  const buildStateMap = (d: string, h: string, a: string, dis: string) => ({
    default: d,
    hover: h,
    active: a,
    disabled: dis,
  })

  return {
    title: buildStateMap(defaultInk.title, hoverInk.title, activeInk.title, disabledInk.title),
    body: buildStateMap(defaultInk.body, hoverInk.body, activeInk.body, disabledInk.body),
    meta: buildStateMap(defaultInk.meta, hoverInk.meta, activeInk.meta, disabledInk.meta),
    linkText: buildStateMap(defaultInk.linkText, hoverInk.linkText, activeInk.linkText, disabledInk.linkText),
    border: buildStateMap(defaultInk.border, hoverInk.border, activeInk.border, disabledInk.border),
    divider: buildStateMap(defaultInk.divider, hoverInk.divider, activeInk.divider, disabledInk.divider),
  }
}

// ============================================================================
// Main Factory
// ============================================================================

/**
 * Create SemanticColorPalette from PrimitivePalette
 */
export const createSemanticFromPrimitive = (
  p: PrimitivePalette
): SemanticColorPalette => {
  const isLight = p.theme === 'light'
  const surfaceKeys = isLight ? SURFACE_KEYS_LIGHT : SURFACE_KEYS_DARK

  const input: SemanticColorPaletteInput = {
    context: {
      canvas: buildBaseTokens(p, surfaceKeys.canvas, isLight),
      sectionNeutral: buildBaseTokens(p, surfaceKeys.sectionNeutral, isLight),
      sectionTint: buildBaseTokens(p, surfaceKeys.sectionTint, isLight),
      sectionContrast: buildBaseTokens(p, surfaceKeys.sectionContrast, isLight),
    },
    component: {
      card: buildBaseTokens(p, surfaceKeys.card, isLight),
      cardFlat: buildBaseTokens(p, surfaceKeys.cardFlat, isLight),
      action: {
        surface: buildActionSurface(p, isLight),
        ink: buildActionStatefulInk(p, isLight),
      },
      actionQuiet: {
        surface: buildActionQuietSurface(p, isLight),
        ink: buildActionQuietStatefulInk(p, isLight),
      },
    },
  }

  return $SemanticColorPalette.create(input)
}

// ============================================================================
// Primitive Reference Map (for debugging / visualization)
// ============================================================================

/**
 * Primitive reference: tracks which primitive key was used for each token.
 * Special values: 'computed' for dynamically calculated colors, 'transparent' for transparent.
 */
export type PrimitiveRef = PrimitiveKey | 'computed' | 'transparent'

/** Ink references (which primitive was used for each ink role) */
export type InkRefs = {
  title: PrimitiveRef
  body: PrimitiveRef
  meta: PrimitiveRef
  linkText: PrimitiveRef
  border: PrimitiveRef
  divider: PrimitiveRef
}

/** Base token references */
export type BaseTokenRefs = {
  surface: PrimitiveRef
  ink: InkRefs
}

/** Stateful surface references */
export type StatefulSurfaceRefs = Record<ActionState, PrimitiveRef>

/** Stateful ink references */
export type StatefulInkRefs = {
  [K in keyof InkRefs]: Record<ActionState, PrimitiveRef>
}

/** Stateful token references */
export type StatefulTokenRefs = {
  surface: StatefulSurfaceRefs
  ink: StatefulInkRefs
}

/** Complete primitive reference map */
export type PrimitiveRefMap = {
  context: {
    canvas: BaseTokenRefs
    sectionNeutral: BaseTokenRefs
    sectionTint: BaseTokenRefs
    sectionContrast: BaseTokenRefs
  }
  component: {
    card: BaseTokenRefs
    cardFlat: BaseTokenRefs
    action: StatefulTokenRefs
    actionQuiet: StatefulTokenRefs
  }
}

// Helper: Build ink refs for a given surface
const buildInkRefsForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets = INK_CONTRAST_TARGETS
): InkRefs => {
  const titleKey = findNeutralByContrast(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByContrast(p, surface, targets.body, isLight)
  const metaKey = findNeutralByContrast(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByContrast(p, surface, targets.linkText, isLight)
  const borderKey = findNeutralClosestToContrast(p, surface, targets.border)
  const dividerKey = findNeutralClosestToContrast(p, surface, targets.divider)

  return {
    title: titleKey,
    body: bodyKey,
    meta: metaKey,
    linkText: linkTextKey,
    border: borderKey,
    divider: dividerKey,
  }
}

// Helper: Build base token refs
const buildBaseTokenRefs = (
  p: PrimitivePalette,
  surfaceKey: PrimitiveKey,
  isLight: boolean
): BaseTokenRefs => {
  const surface = p[surfaceKey]
  return {
    surface: surfaceKey,
    ink: buildInkRefsForSurface(p, surface, isLight),
  }
}

// Helper: Build action surface refs
const buildActionSurfaceRefs = (isLight: boolean): StatefulSurfaceRefs => {
  const disabledKey: PrimitiveKey = isLight ? 'N2' : 'N7'
  return {
    default: 'Bf',
    hover: 'computed', // Bf with adjusted lightness
    active: 'computed', // Bf with adjusted lightness
    disabled: disabledKey,
  }
}

// Helper: Build action quiet surface refs
const buildActionQuietSurfaceRefs = (isLight: boolean): StatefulSurfaceRefs => {
  const hoverKey: PrimitiveKey = isLight ? 'F2' : 'F7'
  const activeKey: PrimitiveKey = isLight ? 'F3' : 'F6'
  return {
    default: 'transparent',
    hover: hoverKey,
    active: activeKey,
    disabled: 'transparent',
  }
}

// Helper: Build action stateful ink refs
const buildActionStatefulInkRefs = (
  p: PrimitivePalette,
  isLight: boolean
): StatefulInkRefs => {
  const bf = p.Bf
  const disabledSurface = isLight ? p.N2 : p.N7
  const bfIsLight = bf.L > 0.5

  const defaultInkRefs = buildInkRefsForSurface(p, bf, bfIsLight)
  const disabledInkRefs = buildInkRefsForSurface(p, disabledSurface, isLight, DISABLED_CONTRAST_TARGETS)

  const buildStateMap = (defaultVal: PrimitiveRef, disabledVal: PrimitiveRef): Record<ActionState, PrimitiveRef> => ({
    default: defaultVal,
    hover: defaultVal,
    active: defaultVal,
    disabled: disabledVal,
  })

  return {
    title: buildStateMap(defaultInkRefs.title, disabledInkRefs.title),
    body: buildStateMap(defaultInkRefs.body, disabledInkRefs.body),
    meta: buildStateMap(defaultInkRefs.meta, disabledInkRefs.meta),
    linkText: buildStateMap(defaultInkRefs.linkText, disabledInkRefs.linkText),
    border: buildStateMap(defaultInkRefs.border, disabledInkRefs.border),
    divider: buildStateMap(defaultInkRefs.divider, disabledInkRefs.divider),
  }
}

// Helper: Build action quiet stateful ink refs
const buildActionQuietStatefulInkRefs = (
  p: PrimitivePalette,
  isLight: boolean
): StatefulInkRefs => {
  const canvasSurface = isLight ? p.F1 : p.F8
  const hoverSurface = isLight ? p.F2 : p.F7
  const activeSurface = isLight ? p.F3 : p.F6

  const defaultInkRefs = buildInkRefsForSurface(p, canvasSurface, isLight)
  const hoverInkRefs = buildInkRefsForSurface(p, hoverSurface, isLight)
  const activeInkRefs = buildInkRefsForSurface(p, activeSurface, isLight)
  const disabledInkRefs = buildInkRefsForSurface(p, canvasSurface, isLight, DISABLED_CONTRAST_TARGETS)

  const buildStateMap = (d: PrimitiveRef, h: PrimitiveRef, a: PrimitiveRef, dis: PrimitiveRef): Record<ActionState, PrimitiveRef> => ({
    default: d,
    hover: h,
    active: a,
    disabled: dis,
  })

  return {
    title: buildStateMap(defaultInkRefs.title, hoverInkRefs.title, activeInkRefs.title, disabledInkRefs.title),
    body: buildStateMap(defaultInkRefs.body, hoverInkRefs.body, activeInkRefs.body, disabledInkRefs.body),
    meta: buildStateMap(defaultInkRefs.meta, hoverInkRefs.meta, activeInkRefs.meta, disabledInkRefs.meta),
    linkText: buildStateMap(defaultInkRefs.linkText, hoverInkRefs.linkText, activeInkRefs.linkText, disabledInkRefs.linkText),
    border: buildStateMap(defaultInkRefs.border, hoverInkRefs.border, activeInkRefs.border, disabledInkRefs.border),
    divider: buildStateMap(defaultInkRefs.divider, hoverInkRefs.divider, activeInkRefs.divider, disabledInkRefs.divider),
  }
}

/**
 * Create PrimitiveRefMap from PrimitivePalette
 * Shows which primitive key is used for each semantic token
 */
export const createPrimitiveRefMap = (
  p: PrimitivePalette
): PrimitiveRefMap => {
  const isLight = p.theme === 'light'
  const surfaceKeys = isLight ? SURFACE_KEYS_LIGHT : SURFACE_KEYS_DARK

  return {
    context: {
      canvas: buildBaseTokenRefs(p, surfaceKeys.canvas, isLight),
      sectionNeutral: buildBaseTokenRefs(p, surfaceKeys.sectionNeutral, isLight),
      sectionTint: buildBaseTokenRefs(p, surfaceKeys.sectionTint, isLight),
      sectionContrast: buildBaseTokenRefs(p, surfaceKeys.sectionContrast, isLight),
    },
    component: {
      card: buildBaseTokenRefs(p, surfaceKeys.card, isLight),
      cardFlat: buildBaseTokenRefs(p, surfaceKeys.cardFlat, isLight),
      action: {
        surface: buildActionSurfaceRefs(isLight),
        ink: buildActionStatefulInkRefs(p, isLight),
      },
      actionQuiet: {
        surface: buildActionQuietSurfaceRefs(isLight),
        ink: buildActionQuietStatefulInkRefs(p, isLight),
      },
    },
  }
}
