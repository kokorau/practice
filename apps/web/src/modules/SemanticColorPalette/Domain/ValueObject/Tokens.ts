/**
 * Context & Component Token Types
 *
 * Defines token structures for contexts (places) and components (UI objects).
 */

import {
  CONTEXT_NAMES,
  STATELESS_COMPONENT_NAMES,
  STATEFUL_COMPONENT_NAMES,
  type ActionState,
} from './SemanticNames'
import { type BaseTokens, type ColorValue } from './TokenRoles'

// ============================================================================
// Token Types
// ============================================================================

/** Context tokens: define places (canvas, sections). No states. */
export type ContextTokens = BaseTokens

/** Component tokens: define nestable UI objects (cards). No states. */
export type ComponentTokens = BaseTokens

/** Stateful component tokens: each role has per-state values */
export type StatefulComponentTokens = Readonly<{
  [K in keyof BaseTokens]-?: K extends 'accent'
    ? Readonly<Record<ActionState, ColorValue>> | undefined
    : Readonly<Record<ActionState, ColorValue>>
}>

// ============================================================================
// Collection Types
// ============================================================================

export type ContextTokensCollection = Readonly<
  Record<keyof typeof CONTEXT_NAMES, ContextTokens>
>

export type StatelessComponentTokensCollection = Readonly<
  Record<keyof typeof STATELESS_COMPONENT_NAMES, ComponentTokens>
>

export type StatefulComponentTokensCollection = Readonly<
  Record<keyof typeof STATEFUL_COMPONENT_NAMES, StatefulComponentTokens>
>

export type ComponentTokensCollection = StatelessComponentTokensCollection &
  StatefulComponentTokensCollection
