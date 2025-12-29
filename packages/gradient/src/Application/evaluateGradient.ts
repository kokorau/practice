import { $Oklab, type Oklab } from '@practice/color'
import type { GradientVO, Vec2, P3Color, ColorPoint } from '../Domain'

/**
 * Evaluate gradient color at a UV coordinate
 * Color flow: P3 → OKLab → weighted average → P3
 */
export function evaluateP3At(vo: GradientVO, uv: Vec2): P3Color {
  if (vo.points.length === 0) {
    return { rgba: [0, 0, 0, 0] }
  }

  // Apply domain warp
  const warpedUV = applyWarp(uv, vo.warp)

  // Calculate weights and blend in OKLab
  const { blendedLab, blendedAlpha, avgChroma } = blendColorsInOklab(
    vo.points,
    warpedUV,
    vo.mix.softness
  )

  // Apply chroma preservation
  const finalLab = applyChromaPreservation(
    blendedLab,
    avgChroma,
    vo.mix.preserveChroma
  )

  // Convert back to P3
  const p3 = $Oklab.toDisplayP3Clipped(finalLab)

  return {
    rgba: [p3.r, p3.g, p3.b, Math.max(0, Math.min(1, blendedAlpha))],
  }
}

/**
 * Simple 2D FBM noise (CPU reference implementation)
 */
function fbmNoise(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  lacunarity: number,
  gain: number
): number {
  let value = 0
  let amplitude = 1
  let frequency = 1

  for (let i = 0; i < octaves; i++) {
    // Simple hash-based noise
    const nx = (x * frequency + seed) * 12.9898
    const ny = (y * frequency + seed * 1.5) * 78.233
    const n = Math.sin(nx + ny) * 43758.5453
    value += (n - Math.floor(n) - 0.5) * 2 * amplitude

    amplitude *= gain
    frequency *= lacunarity
  }

  return value
}

/**
 * Apply FBM domain warp to UV
 * uv' = uv + noise(uv) * amplitude
 */
function applyWarp(uv: Vec2, warp: GradientVO['warp']): Vec2 {
  if (warp.amplitude === 0) {
    return uv
  }

  const noiseX = fbmNoise(
    uv.x * warp.frequency,
    uv.y * warp.frequency,
    warp.seed,
    warp.octaves,
    warp.lacunarity,
    warp.gain
  )

  const noiseY = fbmNoise(
    uv.x * warp.frequency + 100,
    uv.y * warp.frequency + 100,
    warp.seed + 17,
    warp.octaves,
    warp.lacunarity,
    warp.gain
  )

  return {
    x: uv.x + noiseX * warp.amplitude,
    y: uv.y + noiseY * warp.amplitude,
  }
}

/**
 * Calculate Gaussian weight based on distance
 * w = strength * exp(-d²/(2σ²))
 * σ is derived from radius and softness
 */
function gaussianWeight(
  distance: number,
  radius: number,
  softness: number,
  strength: number
): number {
  // Map softness to sigma: higher softness = wider falloff
  const sigma = radius * (0.3 + softness * 0.7)
  const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma))
  return weight * strength
}

/**
 * Calculate Euclidean distance between two Vec2
 */
function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Blend colors in OKLab space with distance-based weights
 */
function blendColorsInOklab(
  points: readonly ColorPoint[],
  uv: Vec2,
  softness: number
): { blendedLab: Oklab; blendedAlpha: number; avgChroma: number } {
  let totalWeight = 0
  let L = 0,
    a = 0,
    b = 0
  let alpha = 0
  let avgChroma = 0

  for (const point of points) {
    const dist = distance(uv, point.pos)
    const w = gaussianWeight(dist, point.radius, softness, point.strength)

    if (w > 1e-6) {
      // Convert P3 to OKLab
      const [r, g, bVal, aVal] = point.color.rgba
      const lab = $Oklab.fromDisplayP3({ r, g, b: bVal })

      // Accumulate weighted values
      L += w * lab.L
      a += w * lab.a
      b += w * lab.b
      alpha += w * aVal

      // Track chroma for preservation
      const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
      avgChroma += w * chroma

      totalWeight += w
    }
  }

  // Normalize
  if (totalWeight < 1e-6) {
    // Fallback: equal weights
    totalWeight = points.length
    for (const point of points) {
      const [r, g, bVal, aVal] = point.color.rgba
      const lab = $Oklab.fromDisplayP3({ r, g, b: bVal })
      L += lab.L
      a += lab.a
      b += lab.b
      alpha += aVal
      avgChroma += Math.sqrt(lab.a * lab.a + lab.b * lab.b)
    }
  }

  return {
    blendedLab: { L: L / totalWeight, a: a / totalWeight, b: b / totalWeight },
    blendedAlpha: alpha / totalWeight,
    avgChroma: avgChroma / totalWeight,
  }
}

/**
 * Apply chroma preservation to blended OKLab color
 */
function applyChromaPreservation(
  lab: Oklab,
  avgChroma: number,
  preserveChroma: number
): Oklab {
  if (preserveChroma <= 0) {
    return lab
  }

  const currentChroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b)

  if (currentChroma < 1e-6) {
    return lab
  }

  // Interpolate between current chroma and preserved chroma
  const targetChroma = currentChroma + (avgChroma - currentChroma) * preserveChroma
  const scale = targetChroma / currentChroma

  return {
    L: lab.L,
    a: lab.a * scale,
    b: lab.b * scale,
  }
}
