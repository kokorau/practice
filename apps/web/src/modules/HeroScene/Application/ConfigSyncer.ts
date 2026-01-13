/**
 * ConfigSyncer
 *
 * HeroViewConfig から View State を同期するユーティリティ
 * Repository変更をUI状態に反映するためのドメインロジック
 */

import type { RGBA } from '@practice/texture'
import type { HeroViewConfig, BaseLayerNodeConfig, SurfaceLayerNodeConfig } from '../Domain/HeroViewConfig'
import type { CustomBackgroundSurfaceParams, CustomSurfaceParams } from '../types/HeroSceneState'
import { toCustomBackgroundSurfaceParams, toCustomSurfaceParams } from '../Domain/SurfaceMapper'

/**
 * Background Surface 同期結果
 */
export interface SyncBackgroundSurfaceResult {
  /** 同期されたサーフェスパラメータ (nullの場合は更新なし) */
  surfaceParams: CustomBackgroundSurfaceParams | null
}

/**
 * HeroViewConfig から Background Surface パラメータを同期する
 *
 * Base Layer の surface を CustomBackgroundSurfaceParams に変換する。
 * image タイプは null を返す（別途 customBackgroundImage で処理）。
 *
 * @param config - HeroViewConfig
 * @param colorA - GradientGrain用のColor A
 * @param colorB - GradientGrain用のColor B
 * @returns 同期結果
 */
export function syncBackgroundSurfaceParams(
  config: HeroViewConfig,
  colorA: RGBA,
  colorB: RGBA,
): SyncBackgroundSurfaceResult {
  // Find base layer
  const baseLayer = config.layers.find(
    (layer): layer is BaseLayerNodeConfig => layer.type === 'base'
  )

  if (!baseLayer) {
    return { surfaceParams: null }
  }

  const bgSurface = baseLayer.surface

  // Image type is handled separately via customBackgroundImage
  if (bgSurface.type === 'image') {
    return { surfaceParams: null }
  }

  // Convert SurfaceConfig to CustomBackgroundSurfaceParams
  const surfaceParams = toCustomBackgroundSurfaceParams(bgSurface, colorA, colorB)

  return { surfaceParams }
}

/**
 * Mask Surface 同期結果
 */
export interface SyncMaskSurfaceResult {
  /** 同期されたサーフェスパラメータ (nullの場合は更新なし) */
  surfaceParams: CustomSurfaceParams | null
}

/**
 * HeroViewConfig から Mask Surface パラメータを同期する
 *
 * Surface Layer の surface を CustomSurfaceParams に変換する。
 * image タイプは null を返す（別途 customMaskImage で処理）。
 *
 * @param config - HeroViewConfig
 * @param colorA - GradientGrain用のColor A
 * @param colorB - GradientGrain用のColor B
 * @returns 同期結果
 */
export function syncMaskSurfaceParams(
  config: HeroViewConfig,
  colorA: RGBA,
  colorB: RGBA,
): SyncMaskSurfaceResult {
  // Find surface layer (mask surface)
  const surfaceLayer = config.layers.find(
    (layer): layer is SurfaceLayerNodeConfig => layer.type === 'surface'
  )

  if (!surfaceLayer) {
    return { surfaceParams: null }
  }

  const maskSurface = surfaceLayer.surface

  // Image type is handled separately via customMaskImage
  if (maskSurface.type === 'image') {
    return { surfaceParams: null }
  }

  // Convert SurfaceConfig to CustomSurfaceParams
  const surfaceParams = toCustomSurfaceParams(maskSurface, colorA, colorB)

  return { surfaceParams }
}
