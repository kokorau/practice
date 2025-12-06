import type { DisplayP3 } from '../../../Color/Domain/ValueObject/DisplayP3'
import { $DisplayP3 } from '../../../Color/Domain/ValueObject/DisplayP3'
import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Srgb } from '../../../Color/Domain/ValueObject/Srgb'

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
  /**
   * Create a RenderedColor from source and P3 values
   */
  create: (source: Oklch, p3: DisplayP3, wasClipped = false): RenderedColor => ({
    source,
    p3,
    wasClipped,
  }),

  /**
   * Convert OKLCH to RenderedColor via sRGB -> Display-P3
   * In future phases, this will apply light source and filter
   */
  fromOklch: (source: Oklch): RenderedColor => {
    const srgb = $Oklch.toSrgb(source)
    const p3 = $DisplayP3.fromSrgb(srgb)

    // Check if any values were clipped during sRGB conversion
    const wasClipped = !$Oklch.isInGamut(source)

    return { source, p3, wasClipped }
  },

  /**
   * Convert to CSS color(display-p3 r g b) string
   */
  toCssP3: (color: RenderedColor): string => {
    const { r, g, b } = color.p3
    return `color(display-p3 ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)})`
  },

  /**
   * Get CSS with both P3 and sRGB fallback
   */
  toCssWithFallback: (color: RenderedColor): { p3: string; srgbFallback: string } => {
    const p3Css = $RenderedColor.toCssP3(color)
    const srgb = $DisplayP3.toSrgb(color.p3)
    const srgbCss = $Srgb.toCssRgb(srgb)
    return { p3: p3Css, srgbFallback: srgbCss }
  },
}

export const $RenderedPalette = {
  /**
   * Create a RenderedPalette
   */
  create: (
    colors: Map<string, RenderedColor>,
    lightSourceId: string,
    filterId: string
  ): RenderedPalette => ({
    colors,
    metadata: { lightSourceId, filterId },
  }),

  /**
   * Generate CSS custom properties from the palette
   */
  toCssVariables: (palette: RenderedPalette): string => {
    const lines: string[] = [':root {']
    palette.colors.forEach((color, token) => {
      const varName = `--color-${token.replace('.', '-')}`
      lines.push(`  ${varName}: ${$RenderedColor.toCssP3(color)};`)
    })
    lines.push('}')
    return lines.join('\n')
  },

  /**
   * Export palette as JSON
   */
  toJSON: (
    palette: RenderedPalette
  ): Record<string, { p3: string; srgb: string }> => {
    const result: Record<string, { p3: string; srgb: string }> = {}
    palette.colors.forEach((color, token) => {
      const { p3, srgbFallback } = $RenderedColor.toCssWithFallback(color)
      result[token] = { p3, srgb: srgbFallback }
    })
    return result
  },
}
