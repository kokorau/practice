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
import type { BaseTokens, InkRoles, ColorValue } from './TokenRoles'
import type { StatefulComponentTokens, StatefulInkTokens } from './Tokens'
import type { SemanticColorPalette } from './SemanticColorPalette'

// ============================================================================
// Input Types
// ============================================================================

export type InkRolesInput = {
  title: ColorValue
  body: ColorValue
  meta: ColorValue
  linkText: ColorValue
  highlight: ColorValue
  border: ColorValue
  divider: ColorValue
}

export type BaseTokensInput = {
  surface: ColorValue
  ink: InkRolesInput
}

export type StatefulInkTokensInput = {
  title: Record<ActionState, ColorValue>
  body: Record<ActionState, ColorValue>
  meta: Record<ActionState, ColorValue>
  linkText: Record<ActionState, ColorValue>
  highlight: Record<ActionState, ColorValue>
  border: Record<ActionState, ColorValue>
  divider: Record<ActionState, ColorValue>
}

export type StatefulComponentTokensInput = {
  surface: Record<ActionState, ColorValue>
  ink: StatefulInkTokensInput
}

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

const freezeInk = (ink: InkRolesInput): InkRoles =>
  Object.freeze({
    title: ink.title,
    body: ink.body,
    meta: ink.meta,
    linkText: ink.linkText,
    highlight: ink.highlight,
    border: ink.border,
    divider: ink.divider,
  })

const freezeBaseTokens = (input: BaseTokensInput): BaseTokens =>
  Object.freeze({
    surface: input.surface,
    ink: freezeInk(input.ink),
  })

const freezeStatefulInk = (ink: StatefulInkTokensInput): StatefulInkTokens =>
  Object.freeze({
    title: freezeStateMap(ink.title),
    body: freezeStateMap(ink.body),
    meta: freezeStateMap(ink.meta),
    linkText: freezeStateMap(ink.linkText),
    highlight: freezeStateMap(ink.highlight),
    border: freezeStateMap(ink.border),
    divider: freezeStateMap(ink.divider),
  })

const freezeStatefulComponent = (
  input: StatefulComponentTokensInput
): StatefulComponentTokens =>
  Object.freeze({
    surface: freezeStateMap(input.surface),
    ink: freezeStatefulInk(input.ink),
  })

export const $SemanticColorPalette = {
  create: (input: SemanticColorPaletteInput): SemanticColorPalette => {
    return Object.freeze({
      context: Object.freeze({
        canvas: freezeBaseTokens(input.context.canvas),
        sectionNeutral: freezeBaseTokens(input.context.sectionNeutral),
        sectionTint: freezeBaseTokens(input.context.sectionTint),
        sectionContrast: freezeBaseTokens(input.context.sectionContrast),
      }),
      component: Object.freeze({
        card: freezeBaseTokens(input.component.card),
        cardFlat: freezeBaseTokens(input.component.cardFlat),
        action: freezeStatefulComponent(input.component.action),
        actionQuiet: freezeStatefulComponent(input.component.actionQuiet),
      }),
    })
  },
}
