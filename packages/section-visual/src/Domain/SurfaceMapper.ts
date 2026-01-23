/**
 * SurfaceMapper
 *
 * SurfaceConfig と CustomSurfaceParams/CustomBackgroundSurfaceParams の相互変換を行うドメインロジック
 */

import type { SurfaceConfig } from './HeroViewConfig'
import type { CustomSurfaceParams, CustomBackgroundSurfaceParams } from '../types/HeroSceneState'

/**
 * SurfaceConfig を CustomSurfaceParams に変換する
 *
 * @param config - SurfaceConfig (JSON serializable)
 * @returns CustomSurfaceParams (UI state)
 */
export function toCustomSurfaceParams(config: SurfaceConfig): CustomSurfaceParams {
  if (config.type === 'solid') {
    return { id: 'solid' }
  }
  if (config.type === 'stripe') {
    return { id: 'stripe', width1: config.width1, width2: config.width2, angle: config.angle }
  }
  if (config.type === 'grid') {
    return { id: 'grid', lineWidth: config.lineWidth, cellSize: config.cellSize }
  }
  if (config.type === 'polkaDot') {
    return { id: 'polkaDot', dotRadius: config.dotRadius, spacing: config.spacing, rowOffset: config.rowOffset }
  }
  if (config.type === 'gradientGrainLinear') {
    return {
      id: 'gradientGrainLinear',
      angle: config.angle,
      centerX: config.centerX,
      centerY: config.centerY,
      seed: config.seed,
      sparsity: config.sparsity,
    }
  }
  if (config.type === 'gradientGrainCircular') {
    return {
      id: 'gradientGrainCircular',
      centerX: config.centerX,
      centerY: config.centerY,
      circularInvert: config.circularInvert,
      seed: config.seed,
      sparsity: config.sparsity,
    }
  }
  if (config.type === 'gradientGrainRadial') {
    return {
      id: 'gradientGrainRadial',
      centerX: config.centerX,
      centerY: config.centerY,
      radialStartAngle: config.radialStartAngle,
      radialSweepAngle: config.radialSweepAngle,
      seed: config.seed,
      sparsity: config.sparsity,
    }
  }
  if (config.type === 'gradientGrainPerlin') {
    return {
      id: 'gradientGrainPerlin',
      perlinScale: config.perlinScale,
      perlinOctaves: config.perlinOctaves,
      perlinContrast: config.perlinContrast,
      perlinOffset: config.perlinOffset,
      seed: config.seed,
      sparsity: config.sparsity,
    }
  }
  if (config.type === 'gradientGrainCurl') {
    return {
      id: 'gradientGrainCurl',
      perlinScale: config.perlinScale,
      perlinOctaves: config.perlinOctaves,
      perlinContrast: config.perlinContrast,
      perlinOffset: config.perlinOffset,
      curlIntensity: config.curlIntensity,
      seed: config.seed,
      sparsity: config.sparsity,
    }
  }
  if (config.type === 'checker') {
    return { id: 'checker', cellSize: config.cellSize, angle: config.angle }
  }
  if (config.type === 'triangle') {
    return { id: 'triangle', size: config.size, angle: config.angle }
  }
  if (config.type === 'hexagon') {
    return { id: 'hexagon', size: config.size, angle: config.angle }
  }
  if (config.type === 'asanoha') {
    return { id: 'asanoha', size: config.size, lineWidth: config.lineWidth }
  }
  if (config.type === 'seigaiha') {
    return { id: 'seigaiha', radius: config.radius, rings: config.rings, lineWidth: config.lineWidth }
  }
  if (config.type === 'wave') {
    return { id: 'wave', amplitude: config.amplitude, wavelength: config.wavelength, thickness: config.thickness, angle: config.angle }
  }
  if (config.type === 'scales') {
    return { id: 'scales', size: config.size, overlap: config.overlap, angle: config.angle }
  }
  if (config.type === 'ogee') {
    return { id: 'ogee', width: config.width, height: config.height, lineWidth: config.lineWidth }
  }
  if (config.type === 'sunburst') {
    return { id: 'sunburst', rays: config.rays, centerX: config.centerX, centerY: config.centerY, twist: config.twist }
  }
  // fallback to solid (handles 'image' type)
  return { id: 'solid' }
}

/**
 * CustomSurfaceParams を SurfaceConfig に変換する (逆変換)
 *
 * @param params - CustomSurfaceParams (UI state)
 * @returns SurfaceConfig (JSON serializable)
 */
export function fromCustomSurfaceParams(params: CustomSurfaceParams): SurfaceConfig {
  if (params.id === 'solid') {
    return { type: 'solid' }
  }
  if (params.id === 'stripe') {
    return { type: 'stripe', width1: params.width1, width2: params.width2, angle: params.angle }
  }
  if (params.id === 'grid') {
    return { type: 'grid', lineWidth: params.lineWidth, cellSize: params.cellSize }
  }
  if (params.id === 'polkaDot') {
    return { type: 'polkaDot', dotRadius: params.dotRadius, spacing: params.spacing, rowOffset: params.rowOffset }
  }
  if (params.id === 'checker') {
    return { type: 'checker', cellSize: params.cellSize, angle: params.angle }
  }
  if (params.id === 'triangle') {
    return { type: 'triangle', size: params.size, angle: params.angle }
  }
  if (params.id === 'hexagon') {
    return { type: 'hexagon', size: params.size, angle: params.angle }
  }
  if (params.id === 'gradientGrainLinear') {
    return {
      type: 'gradientGrainLinear',
      angle: params.angle,
      centerX: params.centerX,
      centerY: params.centerY,
      seed: params.seed,
      sparsity: params.sparsity,
    }
  }
  if (params.id === 'gradientGrainCircular') {
    return {
      type: 'gradientGrainCircular',
      centerX: params.centerX,
      centerY: params.centerY,
      circularInvert: params.circularInvert,
      seed: params.seed,
      sparsity: params.sparsity,
    }
  }
  if (params.id === 'gradientGrainRadial') {
    return {
      type: 'gradientGrainRadial',
      centerX: params.centerX,
      centerY: params.centerY,
      radialStartAngle: params.radialStartAngle,
      radialSweepAngle: params.radialSweepAngle,
      seed: params.seed,
      sparsity: params.sparsity,
    }
  }
  if (params.id === 'gradientGrainPerlin') {
    return {
      type: 'gradientGrainPerlin',
      perlinScale: params.perlinScale,
      perlinOctaves: params.perlinOctaves,
      perlinContrast: params.perlinContrast,
      perlinOffset: params.perlinOffset,
      seed: params.seed,
      sparsity: params.sparsity,
    }
  }
  if (params.id === 'gradientGrainCurl') {
    return {
      type: 'gradientGrainCurl',
      perlinScale: params.perlinScale,
      perlinOctaves: params.perlinOctaves,
      perlinContrast: params.perlinContrast,
      perlinOffset: params.perlinOffset,
      curlIntensity: params.curlIntensity,
      seed: params.seed,
      sparsity: params.sparsity,
    }
  }
  if (params.id === 'asanoha') {
    return { type: 'asanoha', size: params.size, lineWidth: params.lineWidth }
  }
  if (params.id === 'seigaiha') {
    return { type: 'seigaiha', radius: params.radius, rings: params.rings, lineWidth: params.lineWidth }
  }
  if (params.id === 'wave') {
    return { type: 'wave', amplitude: params.amplitude, wavelength: params.wavelength, thickness: params.thickness, angle: params.angle }
  }
  if (params.id === 'scales') {
    return { type: 'scales', size: params.size, overlap: params.overlap, angle: params.angle }
  }
  if (params.id === 'ogee') {
    return { type: 'ogee', width: params.width, height: params.height, lineWidth: params.lineWidth }
  }
  if (params.id === 'sunburst') {
    return { type: 'sunburst', rays: params.rays, centerX: params.centerX, centerY: params.centerY, twist: params.twist }
  }
  // fallback to solid
  return { type: 'solid' }
}

/**
 * SurfaceConfig を CustomBackgroundSurfaceParams に変換する
 *
 * @param config - SurfaceConfig (JSON serializable)
 * @returns CustomBackgroundSurfaceParams (UI state)
 */
export function toCustomBackgroundSurfaceParams(config: SurfaceConfig): CustomBackgroundSurfaceParams {
  // CustomBackgroundSurfaceParams has the same structure as CustomSurfaceParams
  return toCustomSurfaceParams(config) as CustomBackgroundSurfaceParams
}
