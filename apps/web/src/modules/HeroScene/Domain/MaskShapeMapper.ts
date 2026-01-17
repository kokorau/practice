/**
 * MaskShapeMapper
 *
 * MaskShapeConfig と CustomMaskShapeParams の相互変換を行うドメインロジック
 */

import type { MaskShapeConfig as TextureMaskShapeConfig } from '@practice/texture'
import type { MaskShapeConfig as HeroMaskShapeConfig } from './HeroViewConfig'
import type { CustomMaskShapeParams } from '../types/HeroSceneState'

/**
 * Input type for toCustomMaskShapeParams
 * Accepts both @practice/texture MaskShapeConfig (cutout optional) and
 * HeroViewConfig MaskShapeConfig (cutout required)
 */
type MaskShapeConfigInput = TextureMaskShapeConfig | HeroMaskShapeConfig

/**
 * MaskShapeConfig を CustomMaskShapeParams に変換する
 *
 * @param maskConfig - MaskShapeConfig (from @practice/texture or HeroViewConfig)
 * @returns CustomMaskShapeParams (UI state)
 */
export function toCustomMaskShapeParams(maskConfig: MaskShapeConfigInput): CustomMaskShapeParams {
  if (maskConfig.type === 'circle') {
    return {
      type: 'circle',
      centerX: maskConfig.centerX,
      centerY: maskConfig.centerY,
      radius: maskConfig.radius,
      cutout: maskConfig.cutout ?? true,
    }
  }
  if (maskConfig.type === 'rect') {
    return {
      type: 'rect',
      left: maskConfig.left,
      right: maskConfig.right,
      top: maskConfig.top,
      bottom: maskConfig.bottom,
      radiusTopLeft: maskConfig.radiusTopLeft ?? 0,
      radiusTopRight: maskConfig.radiusTopRight ?? 0,
      radiusBottomLeft: maskConfig.radiusBottomLeft ?? 0,
      radiusBottomRight: maskConfig.radiusBottomRight ?? 0,
      rotation: maskConfig.rotation ?? 0,
      perspectiveX: maskConfig.perspectiveX ?? 0,
      perspectiveY: maskConfig.perspectiveY ?? 0,
      cutout: maskConfig.cutout ?? true,
    }
  }
  if (maskConfig.type === 'perlin') {
    return {
      type: 'perlin',
      seed: maskConfig.seed,
      threshold: maskConfig.threshold,
      scale: maskConfig.scale,
      octaves: maskConfig.octaves,
      cutout: maskConfig.cutout ?? true,
    }
  }
  if (maskConfig.type === 'linearGradient') {
    return {
      type: 'linearGradient',
      angle: maskConfig.angle,
      startOffset: maskConfig.startOffset,
      endOffset: maskConfig.endOffset,
      cutout: maskConfig.cutout ?? false,
    }
  }
  if (maskConfig.type === 'radialGradient') {
    return {
      type: 'radialGradient',
      centerX: maskConfig.centerX,
      centerY: maskConfig.centerY,
      innerRadius: maskConfig.innerRadius,
      outerRadius: maskConfig.outerRadius,
      aspectRatio: maskConfig.aspectRatio,
      cutout: maskConfig.cutout ?? false,
    }
  }
  if (maskConfig.type === 'boxGradient') {
    return {
      type: 'boxGradient',
      left: maskConfig.left,
      right: maskConfig.right,
      top: maskConfig.top,
      bottom: maskConfig.bottom,
      cornerRadius: maskConfig.cornerRadius,
      curve: maskConfig.curve,
      cutout: maskConfig.cutout ?? false,
    }
  }
  if (maskConfig.type === 'wavyLine') {
    return {
      type: 'wavyLine',
      position: maskConfig.position,
      direction: maskConfig.direction,
      amplitude: maskConfig.amplitude,
      frequency: maskConfig.frequency,
      octaves: maskConfig.octaves,
      seed: maskConfig.seed,
      cutout: maskConfig.cutout ?? false,
    }
  }
  // blob (default)
  return {
    type: 'blob',
    centerX: maskConfig.centerX,
    centerY: maskConfig.centerY,
    baseRadius: maskConfig.baseRadius,
    amplitude: maskConfig.amplitude,
    octaves: maskConfig.octaves,
    seed: maskConfig.seed,
    cutout: maskConfig.cutout ?? true,
  }
}

/**
 * CustomMaskShapeParams を MaskShapeConfig に変換する (逆変換)
 *
 * @param params - CustomMaskShapeParams (UI state)
 * @returns MaskShapeConfig (JSON serializable)
 */
export function fromCustomMaskShapeParams(params: CustomMaskShapeParams): HeroMaskShapeConfig {
  if (params.type === 'circle') {
    return {
      type: 'circle',
      centerX: params.centerX,
      centerY: params.centerY,
      radius: params.radius,
      cutout: params.cutout,
    }
  }
  if (params.type === 'rect') {
    return {
      type: 'rect',
      left: params.left,
      right: params.right,
      top: params.top,
      bottom: params.bottom,
      radiusTopLeft: params.radiusTopLeft,
      radiusTopRight: params.radiusTopRight,
      radiusBottomLeft: params.radiusBottomLeft,
      radiusBottomRight: params.radiusBottomRight,
      rotation: params.rotation,
      perspectiveX: params.perspectiveX,
      perspectiveY: params.perspectiveY,
      cutout: params.cutout,
    }
  }
  if (params.type === 'perlin') {
    return {
      type: 'perlin',
      seed: params.seed,
      threshold: params.threshold,
      scale: params.scale,
      octaves: params.octaves,
      cutout: params.cutout,
    }
  }
  if (params.type === 'linearGradient') {
    return {
      type: 'linearGradient',
      angle: params.angle,
      startOffset: params.startOffset,
      endOffset: params.endOffset,
      cutout: params.cutout,
    }
  }
  if (params.type === 'radialGradient') {
    return {
      type: 'radialGradient',
      centerX: params.centerX,
      centerY: params.centerY,
      innerRadius: params.innerRadius,
      outerRadius: params.outerRadius,
      aspectRatio: params.aspectRatio,
      cutout: params.cutout,
    }
  }
  if (params.type === 'boxGradient') {
    return {
      type: 'boxGradient',
      left: params.left,
      right: params.right,
      top: params.top,
      bottom: params.bottom,
      cornerRadius: params.cornerRadius,
      curve: params.curve as 'linear' | 'smooth' | 'easeIn' | 'easeOut',
      cutout: params.cutout,
    }
  }
  if (params.type === 'wavyLine') {
    return {
      type: 'wavyLine',
      position: params.position,
      direction: params.direction,
      amplitude: params.amplitude,
      frequency: params.frequency,
      octaves: params.octaves,
      seed: params.seed,
      cutout: params.cutout,
    }
  }
  // blob (default)
  return {
    type: 'blob',
    centerX: params.centerX,
    centerY: params.centerY,
    baseRadius: params.baseRadius,
    amplitude: params.amplitude,
    octaves: params.octaves,
    seed: params.seed,
    cutout: params.cutout,
  }
}
