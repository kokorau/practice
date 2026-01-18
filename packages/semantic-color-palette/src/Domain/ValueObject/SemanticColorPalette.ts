/**
 * Semantic Color Palette
 *
 * Main entry point for the semantic color system.
 * Re-exports all types for convenient access.
 */

import type {
  ContextTokensCollection,
  ComponentTokensCollection,
} from './Tokens'

// ============================================================================
// SemanticColorPalette
// ============================================================================

export interface SemanticColorPalette {
  readonly context: ContextTokensCollection
  readonly component: ComponentTokensCollection
}

// ============================================================================
// Re-exports
// ============================================================================

// Names
export type { ActionState } from './SemanticNames'
export {
  TEXT_TOKEN_NAMES,
  LINE_TOKEN_NAMES,
  SURFACE_TOKEN_NAMES,
  INK_TOKEN_NAMES,
  TOKEN_NAMES,
  CONTEXT_NAMES,
  COMPONENT_NAMES,
  STATELESS_COMPONENT_NAMES,
  STATEFUL_COMPONENT_NAMES,
  STATE_NAMES,
  SEMANTIC_NAMES,
  // CSS Names
  CSS_CLASS_PREFIX,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  TOKEN_CSS_PROPERTY_MAP,
  CSS_NAMES,
  type TextTokenName,
  type LineTokenName,
  type SurfaceTokenName,
  type InkTokenName,
  type TokenName,
  type ContextName,
  type ComponentName,
  type StatelessComponentName,
  type StatefulComponentName,
  type StateName,
  type TokenCSSProperty,
} from './SemanticNames'

// Token Roles
export type {
  ColorValue,
  InkRoles,
  BaseTokens,
} from './TokenRoles'

// Tokens
export type {
  ContextTokens,
  ComponentTokens,
  StatefulInkTokens,
  StatefulComponentTokens,
  ContextTokensCollection,
  StatelessComponentTokensCollection,
  StatefulComponentTokensCollection,
  ComponentTokensCollection,
} from './Tokens'

// Factory
export {
  $SemanticColorPalette,
  type InkRolesInput,
  type BaseTokensInput,
  type StatefulInkTokensInput,
  type StatefulComponentTokensInput,
  type SemanticColorPaletteInput,
} from './SemanticColorPaletteFactory'
