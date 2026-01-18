/**
 * Token Role Types
 *
 * Defines the color roles (what colors are used for).
 * Derived from SemanticNames definitions.
 */

import { INK_TOKEN_NAMES } from './SemanticNames'

export type ColorValue = string

/** Ink roles: text (title, body, meta, linkText) + line (border, divider) */
export type InkRoles = Readonly<Record<keyof typeof INK_TOKEN_NAMES, ColorValue>>

/** Base tokens: surface + ink */
export type BaseTokens = Readonly<{
  surface: ColorValue
  ink: InkRoles
}>
