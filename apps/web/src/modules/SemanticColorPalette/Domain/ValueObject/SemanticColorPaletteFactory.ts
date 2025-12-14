/**
 * SemanticColorPalette Factory
 *
 * Input types and factory for creating SemanticColorPalette instances.
 */

import {
  CONTEXT_NAMES,
  STATELESS_COMPONENT_NAMES,
  STATEFUL_COMPONENT_NAMES,
  type ActionState,
} from './SemanticNames'
import type { BaseTokens, ColorValue } from './TokenRoles'
import type { StatefulComponentTokens } from './Tokens'
import type { SemanticColorPalette } from './SemanticColorPalette'

// ============================================================================
// Input Types
// ============================================================================

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

type MutableDeep<T> = {
  -readonly [K in keyof T]: T[K] extends Readonly<Record<string, infer V>>
    ? Record<string, V>
    : T[K]
}

export type BaseTokensInput = Mutable<BaseTokens>

export type StatefulComponentTokensInput = MutableDeep<StatefulComponentTokens>

export type SemanticColorPaletteInput = {
  context: Record<keyof typeof CONTEXT_NAMES, BaseTokensInput>
  component: {
    [K in keyof typeof STATELESS_COMPONENT_NAMES]: BaseTokensInput
  } & {
    [K in keyof typeof STATEFUL_COMPONENT_NAMES]: StatefulComponentTokensInput
  }
}

// ============================================================================
// Factory
// ============================================================================

const freezeStateMap = (
  map: Record<ActionState, ColorValue>
): Readonly<Record<ActionState, ColorValue>> => Object.freeze({ ...map })

const freezeStatefulComponent = (
  input: StatefulComponentTokensInput
): StatefulComponentTokens => {
  return Object.freeze({
    title: freezeStateMap(input.title),
    body: freezeStateMap(input.body),
    meta: freezeStateMap(input.meta),
    linkText: freezeStateMap(input.linkText),
    border: freezeStateMap(input.border),
    divider: freezeStateMap(input.divider),
    surface: freezeStateMap(input.surface),
    tintSurface: freezeStateMap(input.tintSurface),
    accent: input.accent ? freezeStateMap(input.accent) : undefined,
  }) as StatefulComponentTokens
}

export const $SemanticColorPalette = {
  create: (input: SemanticColorPaletteInput): SemanticColorPalette => {
    return Object.freeze({
      context: Object.freeze({
        canvas: Object.freeze({ ...input.context.canvas }),
        sectionNeutral: Object.freeze({ ...input.context.sectionNeutral }),
        sectionTint: Object.freeze({ ...input.context.sectionTint }),
        sectionContrast: Object.freeze({ ...input.context.sectionContrast }),
      }),
      component: Object.freeze({
        card: Object.freeze({ ...input.component.card }),
        cardFlat: Object.freeze({ ...input.component.cardFlat }),
        action: freezeStatefulComponent(input.component.action),
        actionQuiet: freezeStatefulComponent(input.component.actionQuiet),
      }),
    })
  },
}
