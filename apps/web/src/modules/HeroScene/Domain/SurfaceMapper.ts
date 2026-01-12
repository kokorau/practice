/**
 * SurfaceMapper
 *
 * SurfaceConfig と CustomSurfaceParams/CustomBackgroundSurfaceParams の相互変換を行うドメインロジック
 */

import { DEFAULT_GRADIENT_GRAIN_CURVE_POINTS, type RGBA } from '@practice/texture'
import type { SurfaceConfig } from './HeroViewConfig'
import type { CustomSurfaceParams, CustomBackgroundSurfaceParams } from '../types/HeroSceneState'

/**
 * SurfaceConfig を CustomSurfaceParams に変換する
 *
 * @param config - SurfaceConfig (JSON serializable)
 * @param colorA - Color A for gradientGrain (optional)
 * @param colorB - Color B for gradientGrain (optional)
 * @returns CustomSurfaceParams (UI state)
 */
export function toCustomSurfaceParams(
  config: SurfaceConfig,
  colorA?: RGBA,
  colorB?: RGBA,
): CustomSurfaceParams {
  if (config.type === 'solid') {
    return { type: 'solid' }
  }
  if (config.type === 'stripe') {
    return { type: 'stripe', width1: config.width1, width2: config.width2, angle: config.angle }
  }
  if (config.type === 'grid') {
    return { type: 'grid', lineWidth: config.lineWidth, cellSize: config.cellSize }
  }
  if (config.type === 'polkaDot') {
    return { type: 'polkaDot', dotRadius: config.dotRadius, spacing: config.spacing, rowOffset: config.rowOffset }
  }
  if (config.type === 'gradientGrain') {
    return {
      type: 'gradientGrain',
      depthMapType: config.depthMapType,
      angle: config.angle,
      centerX: config.centerX,
      centerY: config.centerY,
      radialStartAngle: config.radialStartAngle,
      radialSweepAngle: config.radialSweepAngle,
      perlinScale: config.perlinScale,
      perlinOctaves: config.perlinOctaves,
      perlinContrast: config.perlinContrast,
      perlinOffset: config.perlinOffset,
      seed: config.seed,
      sparsity: config.sparsity,
      colorA: colorA ?? [0, 0, 0, 1],
      colorB: colorB ?? [1, 1, 1, 1],
      curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
    }
  }
  if (config.type === 'checker') {
    return { type: 'checker', cellSize: config.cellSize, angle: config.angle }
  }
  if (config.type === 'triangle') {
    return { type: 'triangle', size: config.size, angle: config.angle }
  }
  if (config.type === 'hexagon') {
    return { type: 'hexagon', size: config.size, angle: config.angle }
  }
  if (config.type === 'asanoha') {
    return { type: 'asanoha', size: config.size, lineWidth: config.lineWidth }
  }
  if (config.type === 'seigaiha') {
    return { type: 'seigaiha', radius: config.radius, rings: config.rings, lineWidth: config.lineWidth }
  }
  if (config.type === 'wave') {
    return { type: 'wave', amplitude: config.amplitude, wavelength: config.wavelength, thickness: config.thickness, angle: config.angle }
  }
  if (config.type === 'scales') {
    return { type: 'scales', size: config.size, overlap: config.overlap, angle: config.angle }
  }
  if (config.type === 'ogee') {
    return { type: 'ogee', width: config.width, height: config.height, lineWidth: config.lineWidth }
  }
  if (config.type === 'sunburst') {
    return { type: 'sunburst', rays: config.rays, centerX: config.centerX, centerY: config.centerY, twist: config.twist }
  }
  // fallback to solid (handles 'image' type)
  return { type: 'solid' }
}

/**
 * SurfaceConfig を CustomBackgroundSurfaceParams に変換する
 *
 * @param config - SurfaceConfig (JSON serializable)
 * @param colorA - Color A for gradientGrain (optional)
 * @param colorB - Color B for gradientGrain (optional)
 * @returns CustomBackgroundSurfaceParams (UI state)
 */
export function toCustomBackgroundSurfaceParams(
  config: SurfaceConfig,
  colorA?: RGBA,
  colorB?: RGBA,
): CustomBackgroundSurfaceParams {
  // CustomBackgroundSurfaceParams has the same structure as CustomSurfaceParams
  return toCustomSurfaceParams(config, colorA, colorB) as CustomBackgroundSurfaceParams
}
