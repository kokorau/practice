/**
 * Semantic Names - The source of truth for all semantic token names
 *
 * This module defines the vocabulary of the semantic color system.
 * SemanticColorPalette derives its types from these definitions.
 */

// ============================================================================
// Token Role Names (what the color is for)
// ============================================================================

/** Text token names */
export const TEXT_TOKEN_NAMES = {
  title: 'title',
  body: 'body',
  meta: 'meta',
  linkText: 'linkText',
} as const

export type TextTokenName =
  (typeof TEXT_TOKEN_NAMES)[keyof typeof TEXT_TOKEN_NAMES]

/** Line token names */
export const LINE_TOKEN_NAMES = {
  border: 'border',
  divider: 'divider',
} as const

export type LineTokenName =
  (typeof LINE_TOKEN_NAMES)[keyof typeof LINE_TOKEN_NAMES]

/** Surface token names */
export const SURFACE_TOKEN_NAMES = {
  surface: 'surface',
  tintSurface: 'tintSurface',
} as const

export type SurfaceTokenName =
  (typeof SURFACE_TOKEN_NAMES)[keyof typeof SURFACE_TOKEN_NAMES]

/** Accent token name (optional in most contexts) */
export const ACCENT_TOKEN_NAME = 'accent' as const

export type AccentTokenName = typeof ACCENT_TOKEN_NAME

/** All base token names (without accent) */
export const BASE_TOKEN_NAMES = {
  ...TEXT_TOKEN_NAMES,
  ...LINE_TOKEN_NAMES,
  ...SURFACE_TOKEN_NAMES,
} as const

export type BaseTokenName =
  (typeof BASE_TOKEN_NAMES)[keyof typeof BASE_TOKEN_NAMES]

/** All token names (including accent) */
export const TOKEN_NAMES = {
  ...BASE_TOKEN_NAMES,
  accent: ACCENT_TOKEN_NAME,
} as const

export type TokenName = (typeof TOKEN_NAMES)[keyof typeof TOKEN_NAMES]

// ============================================================================
// Context Names (places)
// ============================================================================

export const CONTEXT_NAMES = {
  canvas: 'canvas',
  sectionNeutral: 'sectionNeutral',
  sectionTint: 'sectionTint',
  sectionContrast: 'sectionContrast',
} as const

export type ContextName = (typeof CONTEXT_NAMES)[keyof typeof CONTEXT_NAMES]

// ============================================================================
// Component Names (UI objects)
// ============================================================================

/** Stateless component names */
export const STATELESS_COMPONENT_NAMES = {
  card: 'card',
  cardFlat: 'cardFlat',
} as const

export type StatelessComponentName =
  (typeof STATELESS_COMPONENT_NAMES)[keyof typeof STATELESS_COMPONENT_NAMES]

/** Stateful component names (interactive) */
export const STATEFUL_COMPONENT_NAMES = {
  action: 'action',
  actionQuiet: 'actionQuiet',
} as const

export type StatefulComponentName =
  (typeof STATEFUL_COMPONENT_NAMES)[keyof typeof STATEFUL_COMPONENT_NAMES]

/** All component names */
export const COMPONENT_NAMES = {
  ...STATELESS_COMPONENT_NAMES,
  ...STATEFUL_COMPONENT_NAMES,
} as const

export type ComponentName =
  (typeof COMPONENT_NAMES)[keyof typeof COMPONENT_NAMES]

// ============================================================================
// State Names (for stateful components)
// ============================================================================

export const STATE_NAMES = {
  default: '',
  hover: 'hover',
  active: 'active',
  disabled: 'disabled',
} as const

export type ActionState = keyof typeof STATE_NAMES

export type StateName = (typeof STATE_NAMES)[keyof typeof STATE_NAMES]

// ============================================================================
// Aggregated Export
// ============================================================================

export const SEMANTIC_NAMES = {
  token: TOKEN_NAMES,
  context: CONTEXT_NAMES,
  component: COMPONENT_NAMES,
  statelessComponent: STATELESS_COMPONENT_NAMES,
  statefulComponent: STATEFUL_COMPONENT_NAMES,
  state: STATE_NAMES,
} as const
