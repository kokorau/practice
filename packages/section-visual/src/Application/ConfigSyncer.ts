/**
 * ConfigSyncer
 *
 * HeroViewConfig から View State を同期するユーティリティ
 * Repository変更をUI状態に反映するためのドメインロジック
 */

import type { RGBA } from '@practice/texture'
import type { HeroViewConfig, BaseLayerNodeConfig, SurfaceLayerNodeConfig, GroupLayerNodeConfig, NormalizedSurfaceConfig } from '../Domain/HeroViewConfig'
import { getSurfaceAsNormalized, denormalizeSurfaceConfig } from '../Domain/HeroViewConfig'
import type { CustomBackgroundSurfaceParams, CustomSurfaceParams } from '../types/HeroSceneState'
import { toCustomBackgroundSurfaceParams, toCustomSurfaceParams } from '../Domain/SurfaceMapper'
import { $PropertyValue } from '../Domain/SectionVisual'

/**
 * Check if a normalized surface config has any RangeExpr values
 * If RangeExpr are present, the config cannot be denormalized for UI sync
 * (timeline-driven params are resolved at render time, not sync time)
 */
function hasRangeValues(config: NormalizedSurfaceConfig): boolean {
  return Object.values(config.params).some((prop) => $PropertyValue.isRange(prop))
}

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
  // Find background surface layer (new structure: inside background-group)
  let bgSurface: SurfaceLayerNodeConfig['surface'] | undefined

  // New structure: look for background-group and find surface layer inside
  const backgroundGroup = config.layers.find(
    (layer): layer is GroupLayerNodeConfig => layer.type === 'group' && layer.id === 'background-group'
  )
  if (backgroundGroup) {
    const surfaceLayer = backgroundGroup.children.find(
      (child): child is SurfaceLayerNodeConfig => child.type === 'surface' && child.id === 'background'
    )
    if (surfaceLayer) {
      bgSurface = surfaceLayer.surface
    }
  }

  // Fallback: legacy base layer structure
  if (!bgSurface) {
    const baseLayer = config.layers.find(
      (layer): layer is BaseLayerNodeConfig => layer.type === 'base'
    )
    if (baseLayer) {
      bgSurface = baseLayer.surface
    }
  }

  if (!bgSurface) {
    return { surfaceParams: null }
  }

  // Normalize first (ensures consistent format), then extract static values for UI params
  const normalizedSurface = getSurfaceAsNormalized(bgSurface)

  // Skip if config has RangeExpr values (timeline-driven params can't be synced to UI)
  if (hasRangeValues(normalizedSurface)) {
    return { surfaceParams: null }
  }

  const staticSurface = denormalizeSurfaceConfig(normalizedSurface)
  const surfaceParams = toCustomBackgroundSurfaceParams(staticSurface, colorA, colorB)

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
  // Find mask surface layer (new structure: inside clip-group)
  let maskSurface: SurfaceLayerNodeConfig['surface'] | undefined

  // New structure: look for clip-group and find surface-mask layer inside
  const clipGroup = config.layers.find(
    (layer): layer is GroupLayerNodeConfig => layer.type === 'group' && layer.id === 'clip-group'
  )
  if (clipGroup) {
    const surfaceLayer = clipGroup.children.find(
      (child): child is SurfaceLayerNodeConfig => child.type === 'surface' && child.id === 'surface-mask'
    )
    if (surfaceLayer) {
      maskSurface = surfaceLayer.surface
    }
  }

  // Fallback: legacy top-level surface layer
  if (!maskSurface) {
    const surfaceLayer = config.layers.find(
      (layer): layer is SurfaceLayerNodeConfig => layer.type === 'surface'
    )
    if (surfaceLayer) {
      maskSurface = surfaceLayer.surface
    }
  }

  if (!maskSurface) {
    return { surfaceParams: null }
  }

  // Normalize first (ensures consistent format), then extract static values for UI params
  const normalizedSurface = getSurfaceAsNormalized(maskSurface)

  // Skip if config has RangeExpr values (timeline-driven params can't be synced to UI)
  if (hasRangeValues(normalizedSurface)) {
    return { surfaceParams: null }
  }

  const staticSurface = denormalizeSurfaceConfig(normalizedSurface)
  const surfaceParams = toCustomSurfaceParams(staticSurface, colorA, colorB)

  return { surfaceParams }
}
