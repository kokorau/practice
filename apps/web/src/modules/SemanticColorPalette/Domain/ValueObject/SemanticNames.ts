import type { ActionState } from './SemanticColorPalette'

/**
 * Context names (places)
 */
export const CONTEXT_NAMES = {
  canvas: 'canvas',
  sectionNeutral: 'sectionNeutral',
  sectionTint: 'sectionTint',
  sectionContrast: 'sectionContrast',
} as const

export type ContextName = (typeof CONTEXT_NAMES)[keyof typeof CONTEXT_NAMES]

/**
 * Component names (stateless UI objects)
 */
export const COMPONENT_NAMES = {
  card: 'card',
  cardFlat: 'cardFlat',
} as const

export type ComponentName =
  (typeof COMPONENT_NAMES)[keyof typeof COMPONENT_NAMES]

/**
 * Stateful component names (interactive UI objects)
 */
export const STATEFUL_COMPONENT_NAMES = {
  action: 'action',
  actionQuiet: 'actionQuiet',
} as const

export type StatefulComponentName =
  (typeof STATEFUL_COMPONENT_NAMES)[keyof typeof STATEFUL_COMPONENT_NAMES]

/**
 * State names (for stateful components)
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
