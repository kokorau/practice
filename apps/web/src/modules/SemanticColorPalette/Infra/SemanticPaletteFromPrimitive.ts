import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, NeutralKey, PrimitiveKey } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS } from '../Domain/ValueObject/PrimitivePalette'
import type { SemanticColorPalette, SemanticColorPaletteInput } from '../Domain/ValueObject/SemanticColorPalette'
import { $SemanticColorPalette } from '../Domain/ValueObject/SemanticColorPalette'
import type { ActionState } from '../Domain/ValueObject/SemanticNames'
import {
  selectNeutralByApca,
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
  border: string
  divider: string
}

type ApcaTargets = {
  readonly title: number
  readonly body: number
  readonly meta: number
  readonly linkText: number
  readonly border: number
  readonly divider: number
}

/**
 * Build ink colors for a given surface using APCA contrast selection.
 * All ink roles use the same search order based on surface lightness.
 */
const buildInkForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets: ApcaTargets = APCA_INK_TARGETS
): InkColors => {
  // All inks: find neutrals that just meet target APCA Lc (last-passing)
  const titleKey = findNeutralByApca(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByApca(p, surface, targets.body, isLight)
  const metaKey = findNeutralByApca(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByApca(p, surface, targets.linkText, isLight)
  const borderKey = findNeutralByApca(p, surface, targets.border, isLight)
  const dividerKey = findNeutralByApca(p, surface, targets.divider, isLight)

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
  sectionNeutral: 'F2',  // One step inside from canvas
  sectionTint: 'Bt',
  sectionContrast: 'Bf',
  card: 'B',             // Brand color
  cardFlat: 'N2',        // Light neutral surface
}

const SURFACE_KEYS_DARK: SurfaceKeys = {
  canvas: 'F8',
  sectionNeutral: 'F7',  // One step inside from canvas
  sectionTint: 'Bs',
  sectionContrast: 'Bf',
  card: 'B',             // Brand color
  cardFlat: 'N7',        // Dark neutral surface
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
  return {
    surface: css(surface),
    ink: buildInkForSurface(p, surface, surfaceIsLight),
  }
}

/**
 * Action button surface states
 */
const buildActionSurface = (p: PrimitivePalette, isLight: boolean) => {
  const b = p.B
  const disabledKey: PrimitiveKey = isLight ? 'N2' : 'N7'

  // Adjust lightness for hover/active states (ΔL = 0.03)
  const hoverL = isLight ? b.L - 0.03 : b.L + 0.03
  const activeL = isLight ? b.L - 0.06 : b.L + 0.06

  return {
    default: css(b),
    hover: css({ ...b, L: Math.max(0, Math.min(1, hoverL)) }),
    active: css({ ...b, L: Math.max(0, Math.min(1, activeL)) }),
    disabled: cssKey(p, disabledKey),
  }
}

/**
 * Action quiet button surface states
 * Uses N0/N9 as base (extreme neutrals) with ΔL adjustment for hover/active
 */
const buildActionQuietSurface = (p: PrimitivePalette, isLight: boolean) => {
  const base = isLight ? p.N0 : p.N9
  const disabledKey: PrimitiveKey = isLight ? 'N2' : 'N7'

  // Adjust lightness for hover/active states (ΔL = 0.03, same as Action)
  const hoverL = isLight ? base.L - 0.03 : base.L + 0.03
  const activeL = isLight ? base.L - 0.06 : base.L + 0.06

  return {
    default: css(base),
    hover: css({ ...base, L: Math.max(0, Math.min(1, hoverL)) }),
    active: css({ ...base, L: Math.max(0, Math.min(1, activeL)) }),
    disabled: cssKey(p, disabledKey),
  }
}

/**
 * Build stateful ink for action buttons.
 * Ink is fixed based on default surface (B) - does not change for hover/active.
 * Only disabled state has different ink.
 */
const buildActionStatefulInk = (
  p: PrimitivePalette,
  isLight: boolean
) => {
  const b = p.B
  const disabledSurface = isLight ? p.N2 : p.N7

  // Use default surface's lightness for ink search direction
  const bIsLight = b.L > 0.5

  // Ink is fixed based on default surface
  const defaultInk = buildInkForSurface(p, b, bIsLight)
  const disabledInk = buildInkForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS)

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
    border: buildStateMap(defaultInk.border, disabledInk.border),
    divider: buildStateMap(defaultInk.divider, disabledInk.divider),
  }
}

/**
 * Build stateful ink for quiet action buttons.
 * Ink is fixed based on default surface (N0/N9) - does not change for hover/active.
 * Only disabled state has different ink.
 */
const buildActionQuietStatefulInk = (
  p: PrimitivePalette,
  isLight: boolean
) => {
  const base = isLight ? p.N0 : p.N9
  const disabledSurface = isLight ? p.N2 : p.N7

  // Use default surface's lightness for ink search direction
  const baseIsLight = base.L > 0.5

  // Ink is fixed based on default surface
  const defaultInk = buildInkForSurface(p, base, baseIsLight)
  const disabledInk = buildInkForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS)

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
    border: buildStateMap(defaultInk.border, disabledInk.border),
    divider: buildStateMap(defaultInk.divider, disabledInk.divider),
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

// Helper: Build ink refs for a given surface using APCA
// All ink roles use the same search order based on surface lightness
const buildInkRefsForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets: ApcaTargets = APCA_INK_TARGETS
): InkRefs => {
  const titleKey = findNeutralByApca(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByApca(p, surface, targets.body, isLight)
  const metaKey = findNeutralByApca(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByApca(p, surface, targets.linkText, isLight)
  const borderKey = findNeutralByApca(p, surface, targets.border, isLight)
  const dividerKey = findNeutralByApca(p, surface, targets.divider, isLight)

  return {
    title: titleKey,
    body: bodyKey,
    meta: metaKey,
    linkText: linkTextKey,
    border: borderKey,
    divider: dividerKey,
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
  return {
    surface: surfaceKey,
    ink: buildInkRefsForSurface(p, surface, surfaceIsLight),
  }
}

// Helper: Build action surface refs
const buildActionSurfaceRefs = (isLight: boolean): StatefulSurfaceRefs => {
  const disabledKey: PrimitiveKey = isLight ? 'N2' : 'N7'
  return {
    default: 'B',
    hover: 'computed', // B with adjusted lightness
    active: 'computed', // B with adjusted lightness
    disabled: disabledKey,
  }
}

// Helper: Build action quiet surface refs
const buildActionQuietSurfaceRefs = (isLight: boolean): StatefulSurfaceRefs => {
  const baseKey: PrimitiveKey = isLight ? 'N0' : 'N9'
  const disabledKey: PrimitiveKey = isLight ? 'N2' : 'N7'
  return {
    default: baseKey,
    hover: 'computed', // N0/N9 with ΔL adjustment
    active: 'computed', // N0/N9 with ΔL adjustment
    disabled: disabledKey,
  }
}

// Helper: Build action stateful ink refs
// Ink refs are fixed based on default surface (B)
const buildActionStatefulInkRefs = (
  p: PrimitivePalette,
  isLight: boolean
): StatefulInkRefs => {
  const b = p.B
  const disabledSurface = isLight ? p.N2 : p.N7

  const bIsLight = b.L > 0.5

  const defaultInkRefs = buildInkRefsForSurface(p, b, bIsLight)
  const disabledInkRefs = buildInkRefsForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS)

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
    border: buildStateMap(defaultInkRefs.border, disabledInkRefs.border),
    divider: buildStateMap(defaultInkRefs.divider, disabledInkRefs.divider),
  }
}

// Helper: Build action quiet stateful ink refs
// Ink refs are fixed based on default surface (N0/N9)
const buildActionQuietStatefulInkRefs = (
  p: PrimitivePalette,
  isLight: boolean
): StatefulInkRefs => {
  const base = isLight ? p.N0 : p.N9
  const disabledSurface = isLight ? p.N2 : p.N7

  const baseIsLight = base.L > 0.5

  const defaultInkRefs = buildInkRefsForSurface(p, base, baseIsLight)
  const disabledInkRefs = buildInkRefsForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS)

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
    border: buildStateMap(defaultInkRefs.border, disabledInkRefs.border),
    divider: buildStateMap(defaultInkRefs.divider, disabledInkRefs.divider),
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
