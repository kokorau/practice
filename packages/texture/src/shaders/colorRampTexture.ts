/**
 * Color Ramp Texture Generator
 *
 * Generates a 1×1024 RGBA8 texture for gradient color lookup.
 * Uses OKLAB color space interpolation for perceptually correct gradients.
 */

// ============================================================
// Types
// ============================================================

export interface ColorStop {
  color: [number, number, number, number]  // RGBA (0-1)
  position: number  // 0-1
}

// ============================================================
// Constants
// ============================================================

export const COLOR_RAMP_WIDTH = 1024

// ============================================================
// OKLAB Color Space Utilities (TypeScript version)
// ============================================================

/**
 * sRGB to Linear RGB (remove gamma)
 */
function srgbToLinear(c: number): number {
  if (c <= 0.04045) {
    return c / 12.92
  }
  return Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * Linear RGB to sRGB (apply gamma)
 */
function linearToSrgb(c: number): number {
  if (c <= 0.0031308) {
    return c * 12.92
  }
  return 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055
}

/**
 * Linear RGB to OKLAB
 */
function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ]
}

/**
 * OKLAB to Linear RGB
 */
function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

/**
 * Mix two sRGB colors in OKLAB space
 */
function mixOklab(
  colorA: [number, number, number, number],
  colorB: [number, number, number, number],
  t: number
): [number, number, number, number] {
  // Convert sRGB to linear RGB
  const linearA = [
    srgbToLinear(colorA[0]),
    srgbToLinear(colorA[1]),
    srgbToLinear(colorA[2]),
  ] as const
  const linearB = [
    srgbToLinear(colorB[0]),
    srgbToLinear(colorB[1]),
    srgbToLinear(colorB[2]),
  ] as const

  // Convert to OKLAB
  const labA = linearRgbToOklab(linearA[0], linearA[1], linearA[2])
  const labB = linearRgbToOklab(linearB[0], linearB[1], linearB[2])

  // Mix in OKLAB space
  const labMixed: [number, number, number] = [
    labA[0] + (labB[0] - labA[0]) * t,
    labA[1] + (labB[1] - labA[1]) * t,
    labA[2] + (labB[2] - labA[2]) * t,
  ]

  // Convert back to linear RGB
  const linearMixed = oklabToLinearRgb(labMixed[0], labMixed[1], labMixed[2])

  // Convert to sRGB and clamp
  const srgbMixed: [number, number, number, number] = [
    Math.max(0, Math.min(1, linearToSrgb(linearMixed[0]))),
    Math.max(0, Math.min(1, linearToSrgb(linearMixed[1]))),
    Math.max(0, Math.min(1, linearToSrgb(linearMixed[2]))),
    colorA[3] + (colorB[3] - colorA[3]) * t,  // Linear alpha interpolation
  ]

  return srgbMixed
}

// ============================================================
// Color Ramp Generation
// ============================================================

/**
 * Generate color ramp data for GPU texture.
 * Produces a 1×1024 RGBA8 array using OKLAB interpolation.
 *
 * @param stops - Array of color stops (position 0-1, color RGBA 0-1)
 * @returns Uint8Array of RGBA8 data (1024 × 4 = 4096 bytes)
 */
export function generateColorRampData(stops: ColorStop[]): Uint8Array<ArrayBuffer> {
  if (stops.length === 0) {
    throw new Error('At least one color stop is required')
  }

  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position)

  // Ensure we have stops at 0 and 1
  const firstStop = sortedStops[0]!
  const lastStop = sortedStops[sortedStops.length - 1]!
  if (firstStop.position > 0) {
    sortedStops.unshift({ color: firstStop.color, position: 0 })
  }
  if (lastStop.position < 1) {
    sortedStops.push({ color: lastStop.color, position: 1 })
  }

  const data = new Uint8Array(COLOR_RAMP_WIDTH * 4)

  for (let i = 0; i < COLOR_RAMP_WIDTH; i++) {
    const t = i / (COLOR_RAMP_WIDTH - 1)  // 0 to 1

    // Find surrounding stops
    let stopIndex = 0
    for (let j = 1; j < sortedStops.length; j++) {
      const stop = sortedStops[j]!
      if (stop.position >= t) {
        stopIndex = j - 1
        break
      }
      stopIndex = j - 1
    }

    const stop0 = sortedStops[stopIndex]!
    const stop1 = sortedStops[Math.min(stopIndex + 1, sortedStops.length - 1)]!

    // Calculate local t between stops
    let localT = 0
    const range = stop1.position - stop0.position
    if (range > 0) {
      localT = (t - stop0.position) / range
    }

    // Interpolate in OKLAB space
    const color = mixOklab(stop0.color, stop1.color, localT)

    // Write to data (RGBA8)
    const offset = i * 4
    data[offset] = Math.round(color[0] * 255)
    data[offset + 1] = Math.round(color[1] * 255)
    data[offset + 2] = Math.round(color[2] * 255)
    data[offset + 3] = Math.round(color[3] * 255)
  }

  return data
}
