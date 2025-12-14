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
  BASE_TOKEN_NAMES,
  TOKEN_NAMES,
  ACCENT_TOKEN_NAME,
  CONTEXT_NAMES,
  COMPONENT_NAMES,
  STATELESS_COMPONENT_NAMES,
  STATEFUL_COMPONENT_NAMES,
  STATE_NAMES,
  SEMANTIC_NAMES,
  type TextTokenName,
  type LineTokenName,
  type SurfaceTokenName,
  type BaseTokenName,
  type TokenName,
  type AccentTokenName,
  type ContextName,
  type ComponentName,
  type StatelessComponentName,
  type StatefulComponentName,
  type StateName,
} from './SemanticNames'

// Token Roles
export type {
  ColorValue,
  TextRoles,
  LineRoles,
  SurfaceRoles,
  BaseTokens,
} from './TokenRoles'

// Tokens
export type {
  ContextTokens,
  ComponentTokens,
  StatefulComponentTokens,
  ContextTokensCollection,
  StatelessComponentTokensCollection,
  StatefulComponentTokensCollection,
  ComponentTokensCollection,
} from './Tokens'

// Factory
export {
  $SemanticColorPalette,
  type BaseTokensInput,
  type StatefulComponentTokensInput,
  type SemanticColorPaletteInput,
} from './SemanticColorPaletteFactory'
