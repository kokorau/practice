import type {
  ActionState,
  ContextTokensCollection,
  StatelessComponentTokensCollection,
  StatefulComponentTokensCollection,
} from './SemanticColorPalette'

/**
 * Context names (places)
 * Keys must match ContextTokensCollection
 */
export const CONTEXT_NAMES = {
  canvas: 'canvas',
  sectionNeutral: 'sectionNeutral',
  sectionTint: 'sectionTint',
  sectionContrast: 'sectionContrast',
} as const satisfies Record<keyof ContextTokensCollection, string>

export type ContextName = (typeof CONTEXT_NAMES)[keyof typeof CONTEXT_NAMES]

/**
 * Component names (stateless UI objects)
 * Keys must match StatelessComponentTokensCollection
 */
export const COMPONENT_NAMES = {
  card: 'card',
  cardFlat: 'cardFlat',
} as const satisfies Record<keyof StatelessComponentTokensCollection, string>

export type ComponentName =
  (typeof COMPONENT_NAMES)[keyof typeof COMPONENT_NAMES]

/**
 * Stateful component names (interactive UI objects)
 * Keys must match StatefulComponentTokensCollection
 */
export const STATEFUL_COMPONENT_NAMES = {
  action: 'action',
  actionQuiet: 'actionQuiet',
} as const satisfies Record<keyof StatefulComponentTokensCollection, string>

export type StatefulComponentName =
  (typeof STATEFUL_COMPONENT_NAMES)[keyof typeof STATEFUL_COMPONENT_NAMES]

/**
 * State names (for stateful components)
 * Keys must match ActionState
 */
export const STATE_NAMES = {
  default: '',
  hover: 'hover',
  active: 'active',
  disabled: 'disabled',
} as const satisfies Record<ActionState, string>

export type StateName = (typeof STATE_NAMES)[keyof typeof STATE_NAMES]

/**
 * All semantic names
 */
export const SEMANTIC_NAMES = {
  context: CONTEXT_NAMES,
  component: COMPONENT_NAMES,
  statefulComponent: STATEFUL_COMPONENT_NAMES,
  state: STATE_NAMES,
} as const
