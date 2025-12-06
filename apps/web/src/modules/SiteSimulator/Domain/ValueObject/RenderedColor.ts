import type { DisplayP3 } from '../../../Color/Domain/ValueObject/DisplayP3'
import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'

/**
 * RenderedColor represents the final output color after applying
 * light source and filter to an OKLCH color.
 */
export type RenderedColor = {
  /** The original OKLCH color */
  readonly source: Oklch
  /** The rendered color in Display-P3 space */
  readonly p3: DisplayP3
  /** Whether the color was clipped during rendering */
  readonly wasClipped: boolean
}

/**
 * A complete rendered palette ready for CSS export.
 */
export type RenderedPalette = {
  readonly colors: ReadonlyMap<string, RenderedColor>
  readonly metadata: {
    readonly lightSourceId: string
    readonly filterId: string
  }
}

export const $RenderedColor = {
  create: undefined as unknown as (source: Oklch, p3: DisplayP3, wasClipped?: boolean) => RenderedColor,
  toCssP3: undefined as unknown as (color: RenderedColor) => string,
  toCssWithFallback: undefined as unknown as (color: RenderedColor) => { p3: string; srgbFallback: string },
}

export const $RenderedPalette = {
  create: undefined as unknown as (
    colors: Map<string, RenderedColor>,
    lightSourceId: string,
    filterId: string
  ) => RenderedPalette,
  toCssVariables: undefined as unknown as (palette: RenderedPalette) => string,
  toJSON: undefined as unknown as (
    palette: RenderedPalette
  ) => Record<string, { p3: string; srgb: string }>,
}
