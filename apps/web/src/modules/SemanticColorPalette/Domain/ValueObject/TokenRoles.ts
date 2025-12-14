/**
 * Token Role Types
 *
 * Defines the color roles (what colors are used for).
 * Derived from SemanticNames definitions.
 */

import {
  TEXT_TOKEN_NAMES,
  LINE_TOKEN_NAMES,
  SURFACE_TOKEN_NAMES,
} from './SemanticNames'

export type ColorValue = string

/** Text roles: title, body, meta, linkText */
export type TextRoles = Readonly<
  Record<keyof typeof TEXT_TOKEN_NAMES, ColorValue>
>

/** Line roles: border, divider */
export type LineRoles = Readonly<
  Record<keyof typeof LINE_TOKEN_NAMES, ColorValue>
>

/** Surface roles: surface, tintSurface */
export type SurfaceRoles = Readonly<
  Record<keyof typeof SURFACE_TOKEN_NAMES, ColorValue>
>

/** Base tokens = all roles combined */
export type BaseTokens = TextRoles &
  LineRoles &
  SurfaceRoles & {
    readonly accent?: ColorValue
  }
