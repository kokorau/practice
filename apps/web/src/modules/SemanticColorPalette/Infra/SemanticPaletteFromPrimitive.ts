import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, NeutralKey, PrimitiveKey } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS } from '../Domain/ValueObject/PrimitivePalette'
import type { SemanticColorPalette, SemanticColorPaletteInput } from '../Domain/ValueObject/SemanticColorPalette'
import { $SemanticColorPalette } from '../Domain/ValueObject/SemanticColorPalette'
import type { ActionState } from '../Domain/ValueObject/SemanticNames'
import {
  selectNeutralByApca,
  selectNeutralByReverseApca,
  APCA_INK_TARGETS,
  APCA_DISABLED_TARGETS,
  type NeutralEntry,
  type SearchOrder,
} from '../Domain/NeutralSelection'

/**
 * SemanticPaletteFromPrimitive
 *
 * Generates a SemanticColorPalette from a PrimitivePalette.
 * Ink colors are selected based on APCA (Advanced Perceptual Contrast Algorithm).
 */

// ============================================================================
// Helpers
// ============================================================================

// Helper: convert Oklch to CSS string
const css = (color: Oklch): string => $Oklch.toCss(color)
const cssKey = (p: PrimitivePalette, key: PrimitiveKey): string => css(p[key])

/**
 * Convert PrimitivePalette neutrals to NeutralEntry array for APCA selection
 */
const toNeutralEntries = (p: PrimitivePalette): NeutralEntry[] =>
  NEUTRAL_KEYS.map(key => ({ key, color: p[key] }))

/**
 * Find the best neutral using APCA contrast algorithm.
 * Wrapper that converts PrimitivePalette to the Domain function interface.
 */
const findNeutralByApca = (
  p: PrimitivePalette,
  surface: Oklch,
  targetLc: number,
  isLight: boolean
): NeutralKey => {
  const neutrals = toNeutralEntries(p)
  const order: SearchOrder = isLight ? 'dark-first' : 'light-first'
  const result = selectNeutralByApca(neutrals, surface, targetLc, order)
  return result.key as NeutralKey
}

// ============================================================================
// Ink Selection (APCA-based)
// ============================================================================

type InkColors = {
  title: string
  body: string
  meta: string
  linkText: string
  highlight: string
  border: string
  divider: string
}

type ApcaTargets = {
  readonly title: number
  readonly body: number
  readonly meta: number
  readonly linkText: number
  readonly highlight: number
  readonly border: number
  readonly divider: number
}

/**
 * Build ink colors for a given surface using APCA contrast selection.
 * All ink roles use the same search order based on surface lightness.
 */
/** ΔL adjustment for border/divider (shift toward surface for subtlety) */
const BORDER_DELTA_L = 0.05
const DIVIDER_DELTA_L = 0.1

const buildInkForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets: ApcaTargets = APCA_INK_TARGETS,
  useAccentHighlight: boolean = true
): InkColors => {
  // All inks: find neutrals that just meet target APCA Lc (last-passing)
  const titleKey = findNeutralByApca(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByApca(p, surface, targets.body, isLight)
  const metaKey = findNeutralByApca(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByApca(p, surface, targets.linkText, isLight)
  const borderKey = findNeutralByApca(p, surface, targets.border, isLight)
  const dividerKey = findNeutralByApca(p, surface, targets.divider, isLight)

  // Adjust border/divider L toward surface (more subtle)
  const direction = isLight ? 1 : -1
  const adjustL = (color: Oklch, delta: number): Oklch => ({
    ...color,
    L: Math.max(0, Math.min(1, color.L + delta * direction)),
  })

  // Highlight: Accent on F-series surfaces, body color on B-series surfaces
  const highlightColor = useAccentHighlight ? css(p.A) : css(p[bodyKey])

  return {
    title: css(p[titleKey]),
    body: css(p[bodyKey]),
    meta: css(p[metaKey]),
    linkText: css(p[linkTextKey]),
    highlight: highlightColor,
    border: css(adjustL(p[borderKey], BORDER_DELTA_L)),
    divider: css(adjustL(p[dividerKey], DIVIDER_DELTA_L)),
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
  sectionNeutral: 'F2',  // One step inside from canvas
  sectionTint: 'Bt',
  sectionContrast: 'Bf',
  card: 'B',             // Brand color
  cardFlat: 'BN2',        // Light neutral surface
}

const SURFACE_KEYS_DARK: SurfaceKeys = {
  canvas: 'F8',          // Now L=0.16 (dark) with 0=white, 9=black ordering
  sectionNeutral: 'F7',  // Now L=0.24 (one step lighter from canvas)
  sectionTint: 'Bs',
  sectionContrast: 'Bf',
  card: 'B',             // Brand color
  cardFlat: 'BN7',        // Now L=0.24 (dark neutral surface)
}

// ============================================================================
// Token Builders
// ============================================================================

// Build base tokens (surface + ink) with APCA-based ink selection
// Uses surface lightness (not global theme) for search direction
const buildBaseTokens = (
  p: PrimitivePalette,
  surfaceKey: PrimitiveKey,
  _isLight: boolean  // Kept for API compatibility, but not used for ink selection
) => {
  const surface = p[surfaceKey]
  // Use surface's actual lightness to determine search direction
  const surfaceIsLight = surface.L > 0.5
  // Accent highlight on F-series surfaces, body color on B-series surfaces
  const useAccentHighlight = surfaceKey.startsWith('F')
  return {
    surface: css(surface),
    ink: buildInkForSurface(p, surface, surfaceIsLight, APCA_INK_TARGETS, useAccentHighlight),
  }
}

/**
 * Generic stateful surface builder for action buttons.
 * Creates default/hover/active/disabled states with ΔL adjustments.
 */
const buildStatefulSurface = (
  base: Oklch,
  disabledColor: string,
  isLight: boolean
) => {
  // Adjust lightness for hover/active states (ΔL = 0.03)
  const hoverL = isLight ? base.L - 0.03 : base.L + 0.03
  const activeL = isLight ? base.L - 0.06 : base.L + 0.06

  return {
    default: css(base),
    hover: css({ ...base, L: Math.max(0, Math.min(1, hoverL)) }),
    active: css({ ...base, L: Math.max(0, Math.min(1, activeL)) }),
    disabled: disabledColor,
  }
}

/** Action button surface states */
const buildActionSurface = (p: PrimitivePalette, isLight: boolean) =>
  buildStatefulSurface(p.B, cssKey(p, isLight ? 'BN2' : 'BN7'), isLight)

/** Action quiet button surface states (uses lightest neutral as base) */
const buildActionQuietSurface = (p: PrimitivePalette, isLight: boolean) =>
  buildStatefulSurface(p.BN0, cssKey(p, isLight ? 'BN2' : 'BN7'), isLight)

/**
 * Generic stateful ink builder for action buttons.
 * Ink is fixed based on default surface - does not change for hover/active.
 * Only disabled state has different ink.
 * Action buttons use B-series surfaces, so highlight uses body color (not accent).
 */
const buildStatefulInk = (
  p: PrimitivePalette,
  defaultSurface: Oklch,
  disabledSurface: Oklch,
  isLight: boolean
) => {
  // Use surface's actual lightness for ink search direction
  const defaultIsLight = defaultSurface.L > 0.5

  // Action buttons are B-series surfaces, so useAccentHighlight = false
  const defaultInk = buildInkForSurface(p, defaultSurface, defaultIsLight, APCA_INK_TARGETS, false)
  const disabledInk = buildInkForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS, false)

  const buildStateMap = (base: string, dis: string) => ({
    default: base,
    hover: base,
    active: base,
    disabled: dis,
  })

  return {
    title: buildStateMap(defaultInk.title, disabledInk.title),
    body: buildStateMap(defaultInk.body, disabledInk.body),
    meta: buildStateMap(defaultInk.meta, disabledInk.meta),
    linkText: buildStateMap(defaultInk.linkText, disabledInk.linkText),
    highlight: buildStateMap(defaultInk.highlight, disabledInk.highlight),
    border: buildStateMap(defaultInk.border, disabledInk.border),
    divider: buildStateMap(defaultInk.divider, disabledInk.divider),
  }
}

/** Stateful ink for action buttons (based on brand color B) */
const buildActionStatefulInk = (p: PrimitivePalette, isLight: boolean) =>
  buildStatefulInk(p, p.B, isLight ? p.BN2 : p.BN7, isLight)

/** Stateful ink for quiet action buttons (based on BN0 - lightest neutral) */
const buildActionQuietStatefulInk = (p: PrimitivePalette, isLight: boolean) =>
  buildStatefulInk(p, p.BN0, isLight ? p.BN2 : p.BN7, isLight)

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
  highlight: PrimitiveRef
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

// Helper: Build ink refs for a given surface using APCA
// All ink roles use the same search order based on surface lightness
const buildInkRefsForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets: ApcaTargets = APCA_INK_TARGETS,
  useAccentHighlight: boolean = true
): InkRefs => {
  const titleKey = findNeutralByApca(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByApca(p, surface, targets.body, isLight)
  const metaKey = findNeutralByApca(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByApca(p, surface, targets.linkText, isLight)
  // border/divider use APCA selection + ΔL adjustment, so they're computed

  return {
    title: titleKey,
    body: bodyKey,
    meta: metaKey,
    linkText: linkTextKey,
    highlight: useAccentHighlight ? 'A' : bodyKey, // Accent on F-series, body on B-series
    border: 'computed',
    divider: 'computed',
  }
}

// Helper: Build base token refs (uses surface lightness for search direction)
const buildBaseTokenRefs = (
  p: PrimitivePalette,
  surfaceKey: PrimitiveKey,
  _isLight: boolean  // Kept for API compatibility
): BaseTokenRefs => {
  const surface = p[surfaceKey]
  const surfaceIsLight = surface.L > 0.5
  // Accent highlight on F-series surfaces, body color on B-series surfaces
  const useAccentHighlight = surfaceKey.startsWith('F')
  return {
    surface: surfaceKey,
    ink: buildInkRefsForSurface(p, surface, surfaceIsLight, APCA_INK_TARGETS, useAccentHighlight),
  }
}

// Helper: Build stateful surface refs (generic)
const buildStatefulSurfaceRefs = (
  defaultKey: PrimitiveKey,
  disabledKey: PrimitiveKey
): StatefulSurfaceRefs => ({
  default: defaultKey,
  hover: 'computed',
  active: 'computed',
  disabled: disabledKey,
})

// Helper: Build action surface refs
const buildActionSurfaceRefs = (isLight: boolean): StatefulSurfaceRefs =>
  buildStatefulSurfaceRefs('B', isLight ? 'BN2' : 'BN7')

// Helper: Build action quiet surface refs (always uses BN0 - lightest neutral)
const buildActionQuietSurfaceRefs = (isLight: boolean): StatefulSurfaceRefs =>
  buildStatefulSurfaceRefs('BN0', isLight ? 'BN2' : 'BN7')

// Helper: Build stateful ink refs (generic)
// Ink refs are fixed based on default surface - does not change for hover/active
// Action buttons are B-series surfaces, so useAccentHighlight = false
const buildStatefulInkRefs = (
  p: PrimitivePalette,
  defaultSurface: Oklch,
  disabledSurface: Oklch,
  isLight: boolean
): StatefulInkRefs => {
  const defaultIsLight = defaultSurface.L > 0.5

  // Action buttons are B-series surfaces, so useAccentHighlight = false
  const defaultInkRefs = buildInkRefsForSurface(p, defaultSurface, defaultIsLight, APCA_INK_TARGETS, false)
  const disabledInkRefs = buildInkRefsForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS, false)

  const buildStateMap = (base: PrimitiveRef, dis: PrimitiveRef): Record<ActionState, PrimitiveRef> => ({
    default: base,
    hover: base,
    active: base,
    disabled: dis,
  })

  return {
    title: buildStateMap(defaultInkRefs.title, disabledInkRefs.title),
    body: buildStateMap(defaultInkRefs.body, disabledInkRefs.body),
    meta: buildStateMap(defaultInkRefs.meta, disabledInkRefs.meta),
    linkText: buildStateMap(defaultInkRefs.linkText, disabledInkRefs.linkText),
    highlight: buildStateMap(defaultInkRefs.highlight, disabledInkRefs.highlight),
    border: buildStateMap(defaultInkRefs.border, disabledInkRefs.border),
    divider: buildStateMap(defaultInkRefs.divider, disabledInkRefs.divider),
  }
}

// Helper: Build action stateful ink refs
const buildActionStatefulInkRefs = (p: PrimitivePalette, isLight: boolean): StatefulInkRefs =>
  buildStatefulInkRefs(p, p.B, isLight ? p.BN2 : p.BN7, isLight)

// Helper: Build action quiet stateful ink refs (always uses BN0 - lightest neutral)
const buildActionQuietStatefulInkRefs = (p: PrimitivePalette, isLight: boolean): StatefulInkRefs =>
  buildStatefulInkRefs(p, p.BN0, isLight ? p.BN2 : p.BN7, isLight)

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

// ============================================================================
// Ink Selection for Arbitrary Surfaces (for Hero/Canvas rendering)
// ============================================================================

/**
 * Ink role types for text/UI elements
 */
export type InkRole = 'title' | 'body' | 'meta' | 'linkText' | 'highlight'

/**
 * Select an appropriate ink color for a given surface using APCA contrast.
 * This is useful for Hero/Canvas rendering where surfaces are chosen from
 * PrimitivePalette but text needs appropriate contrast.
 *
 * @param p - PrimitivePalette to select neutrals from
 * @param surface - The surface color (background) in Oklch
 * @param role - The ink role determining the required contrast level
 * @returns The selected ink color as Oklch
 */
export const selectInkForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  role: InkRole
): Oklch => {
  const surfaceIsLight = surface.L > 0.5
  const target = APCA_INK_TARGETS[role]
  const neutralKey = findNeutralByApca(p, surface, target, surfaceIsLight)

  // Special case: highlight uses accent color (A) for emphasis
  if (role === 'highlight') {
    return p.A
  }

  return p[neutralKey]
}

/**
 * Select all ink colors for a given surface.
 * Returns a complete set of ink colors (title, body, meta, linkText, highlight).
 *
 * @param p - PrimitivePalette to select neutrals from
 * @param surface - The surface color (background) in Oklch
 * @returns Object containing all ink colors as Oklch
 */
export const selectAllInksForSurface = (
  p: PrimitivePalette,
  surface: Oklch
): Record<InkRole, Oklch> => {
  return {
    title: selectInkForSurface(p, surface, 'title'),
    body: selectInkForSurface(p, surface, 'body'),
    meta: selectInkForSurface(p, surface, 'meta'),
    linkText: selectInkForSurface(p, surface, 'linkText'),
    highlight: selectInkForSurface(p, surface, 'highlight'),
  }
}

/**
 * Select ink color for text using background luminance Y value.
 * This uses reverse APCA calculation for more accurate color selection
 * when the actual background luminance is known (e.g., from image analysis).
 *
 * @param p - PrimitivePalette to select neutrals from
 * @param bgY - Background luminance Y value (0-1)
 * @param role - InkRole to determine target Lc
 * @returns Oklch color for the text
 */
export const selectInkForSurfaceWithBgY = (
  p: PrimitivePalette,
  bgY: number,
  role: InkRole
): Oklch => {
  // Special case: highlight uses accent color (A) for emphasis
  if (role === 'highlight') {
    return p.A
  }

  const neutrals = toNeutralEntries(p)
  const target = APCA_INK_TARGETS[role]
  const result = selectNeutralByReverseApca(neutrals, bgY, target)

  return p[result.key as NeutralKey]
}
