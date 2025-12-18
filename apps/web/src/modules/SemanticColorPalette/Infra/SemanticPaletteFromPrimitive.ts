import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, NeutralKey, PrimitiveKey } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS } from '../Domain/ValueObject/PrimitivePalette'
import type { SemanticColorPalette, SemanticColorPaletteInput } from '../Domain/ValueObject/SemanticColorPalette'
import { $SemanticColorPalette } from '../Domain/ValueObject/SemanticColorPalette'
import type { ActionState } from '../Domain/ValueObject/SemanticNames'
import {
  selectNeutralByApca,
  selectNeutralClosestToApca,
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

/**
 * Find neutral closest to target APCA Lc value (for subtle elements).
 */
const findNeutralClosestToApca = (
  p: PrimitivePalette,
  surface: Oklch,
  targetLc: number
): NeutralKey => {
  const neutrals = toNeutralEntries(p)
  const result = selectNeutralClosestToApca(neutrals, surface, targetLc)
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
 */
const buildInkForSurface = (
  p: PrimitivePalette,
  surface: Oklch,
  isLight: boolean,
  targets: ApcaTargets = APCA_INK_TARGETS
): InkColors => {
  // Text inks: find neutrals that meet or exceed target APCA Lc
  const titleKey = findNeutralByApca(p, surface, targets.title, isLight)
  const bodyKey = findNeutralByApca(p, surface, targets.body, isLight)
  const metaKey = findNeutralByApca(p, surface, targets.meta, isLight)
  const linkTextKey = findNeutralByApca(p, surface, targets.linkText, isLight)

  // Line inks: find neutrals closest to target Lc (not exceeding)
  const borderKey = findNeutralClosestToApca(p, surface, targets.border)
  const dividerKey = findNeutralClosestToApca(p, surface, targets.divider)

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
  cardFlat: 'N3',        // Two steps inside from canvas (Neutral)
}

const SURFACE_KEYS_DARK: SurfaceKeys = {
  canvas: 'F8',
  sectionNeutral: 'F7',  // One step inside from canvas
  sectionTint: 'Bs',
  sectionContrast: 'Bf',
  card: 'B',             // Brand color
  cardFlat: 'N6',        // Two steps inside from canvas (Neutral)
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
 * Uses B surface for default/hover/active, and calculates disabled separately.
 */
const buildActionStatefulInk = (
  p: PrimitivePalette,
  isLight: boolean
) => {
  const b = p.B
  const disabledSurface = isLight ? p.N2 : p.N7

  // Determine if B is light or dark for ink selection
  const bIsLight = b.L > 0.5

  const defaultInk = buildInkForSurface(p, b, bIsLight)
  const disabledInk = buildInkForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS)

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
  const disabledInk = buildInkForSurface(p, canvasSurface, isLight, APCA_DISABLED_TARGETS)

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

// Helper: Build ink refs for a given surface using APCA
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
  const borderKey = findNeutralClosestToApca(p, surface, targets.border)
  const dividerKey = findNeutralClosestToApca(p, surface, targets.divider)

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
    default: 'B',
    hover: 'computed', // B with adjusted lightness
    active: 'computed', // B with adjusted lightness
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
  const b = p.B
  const disabledSurface = isLight ? p.N2 : p.N7
  const bIsLight = b.L > 0.5

  const defaultInkRefs = buildInkRefsForSurface(p, b, bIsLight)
  const disabledInkRefs = buildInkRefsForSurface(p, disabledSurface, isLight, APCA_DISABLED_TARGETS)

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
  const disabledInkRefs = buildInkRefsForSurface(p, canvasSurface, isLight, APCA_DISABLED_TARGETS)

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
