import type { DisplayP3 } from '../../../Color/Domain/ValueObject/DisplayP3'
import { $DisplayP3 } from '../../../Color/Domain/ValueObject/DisplayP3'
import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Srgb } from '../../../Color/Domain/ValueObject/Srgb'
import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'
import { $Lut1D } from '../../../Filter/Domain/ValueObject/Lut1D'
import { $Lut3D } from '../../../Filter/Domain/ValueObject/Lut3D'

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
   * Convert OKLCH to RenderedColor directly to Display-P3 (no sRGB intermediate)
   * This preserves wider gamut colors that would be clipped in sRGB.
   */
  fromOklch: (source: Oklch): RenderedColor => {
    // Direct OKLCH -> Display-P3 conversion (no sRGB intermediate)
    const p3 = $Oklch.toDisplayP3Clipped(source)

    // Check if any values were clipped during P3 conversion
    const wasClipped = !$Oklch.isInP3Gamut(source)

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

  /**
   * Convert OKLCH to RenderedColor with LUT applied
   * Path: OKLCH → sRGB → LUT → Display-P3
   *
   * LUT is applied in sRGB space (as is standard for photo filters),
   * then the result is converted to Display-P3 for wide gamut output.
   */
  fromOklchWithLut: (source: Oklch, lut: Lut | null): RenderedColor => {
    // No LUT - use direct conversion
    if (!lut) {
      return $RenderedColor.fromOklch(source)
    }

    // OKLCH → sRGB (for LUT application)
    const srgb = $Oklch.toSrgb(source)

    // Clamp to 0-1 range for LUT lookup
    const r = Math.max(0, Math.min(1, srgb.r))
    const g = Math.max(0, Math.min(1, srgb.g))
    const b = Math.max(0, Math.min(1, srgb.b))

    let lutR: number, lutG: number, lutB: number

    if ($Lut3D.is(lut)) {
      // 3D LUT: trilinear interpolation
      const [outR, outG, outB] = $Lut3D.lookup(lut, r, g, b)
      lutR = outR
      lutG = outG
      lutB = outB
    } else if ($Lut1D.is(lut)) {
      // 1D LUT: channel-independent lookup
      const ri = Math.round(r * 255)
      const gi = Math.round(g * 255)
      const bi = Math.round(b * 255)
      lutR = lut.r[ri]!
      lutG = lut.g[gi]!
      lutB = lut.b[bi]!
    } else {
      // Fallback: identity
      lutR = r
      lutG = g
      lutB = b
    }

    // Clamp LUT output
    const clampedSrgb = $Srgb.create(
      Math.max(0, Math.min(1, lutR)),
      Math.max(0, Math.min(1, lutG)),
      Math.max(0, Math.min(1, lutB))
    )

    // sRGB → Display-P3
    const p3 = $DisplayP3.fromSrgb(clampedSrgb)

    // Check if original was out of gamut
    const wasClipped = !$Oklch.isInP3Gamut(source)

    return { source, p3, wasClipped }
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
