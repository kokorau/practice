/**
 * ConfigSyncer
 *
 * HeroViewConfig から View State を同期するユーティリティ
 * Repository変更をUI状態に反映するためのドメインロジック
 */

import type { RGBA } from '@practice/texture'
import type { HeroViewConfig, BaseLayerNodeConfig } from '../Domain/HeroViewConfig'
import type { CustomBackgroundSurfaceParams } from '../types/HeroSceneState'
import { toCustomBackgroundSurfaceParams } from '../Domain/SurfaceMapper'

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
