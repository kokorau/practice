/**
 * LUT (Look-Up Table) application utilities for palette colors
 */
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { Lut } from '../../../modules/Filter/Domain'
import { $Lut3D } from '../../../modules/Filter/Domain'
import {
  type PrimitivePalette,
  NEUTRAL_KEYS,
  FOUNDATION_KEYS,
  BRAND_KEYS,
} from '../../../modules/SemanticColorPalette/Domain'

/**
 * Apply LUT to a single Oklch color (supports both 1D and 3D LUTs)
 */
export const applyLutToOklch = (color: Oklch, lut: Lut): Oklch => {
  const srgb = $Oklch.toSrgb(color)
  const r = Math.max(0, Math.min(1, srgb.r))
  const g = Math.max(0, Math.min(1, srgb.g))
  const b = Math.max(0, Math.min(1, srgb.b))

  let newR: number, newG: number, newB: number

  if ($Lut3D.is(lut)) {
    const [outR, outG, outB] = $Lut3D.lookup(lut, r, g, b)
    newR = outR
    newG = outG
    newB = outB
  } else {
    const rIdx = Math.round(r * 255)
    const gIdx = Math.round(g * 255)
    const bIdx = Math.round(b * 255)
    newR = lut.r[rIdx]!
    newG = lut.g[gIdx]!
    newB = lut.b[bIdx]!
  }

  return $Oklch.fromSrgb({ r: newR, g: newG, b: newB })
}

/**
 * Apply LUT to entire PrimitivePalette
 */
export const applyLutToPalette = (palette: PrimitivePalette, lut: Lut): PrimitivePalette => {
  const result = { ...palette }
  for (const key of NEUTRAL_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }
  for (const key of FOUNDATION_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }
  for (const key of BRAND_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }
  return result
}
