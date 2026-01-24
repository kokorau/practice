/**
 * ConfigSyncer
 *
 * HeroViewConfig から View State を同期するユーティリティ
 * Repository変更をUI状態に反映するためのドメインロジック
 */

import type { RGBA } from '@practice/texture'
import type {
  HeroViewConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  GroupLayerNodeConfig,
  NormalizedSurfaceConfig,
  NormalizedMaskConfig,
} from '../Domain/HeroViewConfig'
import { getSurfaceAsNormalized, denormalizeSurfaceConfig, getMaskAsNormalized, denormalizeMaskConfig } from '../Domain/HeroViewConfig'
import { findProcessorWithMask, findLayerInTree, isMaskProcessorConfig, isSurfaceLayerConfig, isBaseLayerConfig } from '../Domain/LayerTreeOps'
import type { CustomBackgroundSurfaceParams, CustomSurfaceParams, CustomMaskShapeParams } from '../types/HeroSceneState'
import { toCustomBackgroundSurfaceParams, toCustomSurfaceParams } from '../Domain/SurfaceMapper'
import { toCustomMaskShapeParams } from '../Domain/MaskShapeMapper'
import { $PropertyValue } from '../Domain/SectionVisual'

/**
 * Check if a normalized config (surface or mask) has any RangeExpr values
 * If RangeExpr are present, the config cannot be denormalized for UI sync
 * (timeline-driven params are resolved at render time, not sync time)
 */
function hasRangeValues(config: NormalizedSurfaceConfig | NormalizedMaskConfig): boolean {
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
  _colorA: RGBA,
  _colorB: RGBA,
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
  const surfaceParams = toCustomBackgroundSurfaceParams(staticSurface)

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
 * @param _colorA - (unused) GradientGrain用のColor A
 * @param _colorB - (unused) GradientGrain用のColor B
 * @returns 同期結果
 */
export function syncMaskSurfaceParams(
  config: HeroViewConfig,
  _colorA: RGBA,
  _colorB: RGBA,
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
  const surfaceParams = toCustomSurfaceParams(staticSurface)

  return { surfaceParams }
}

/**
 * Mask Shape 同期結果
 */
export interface SyncMaskShapeResult {
  /** 同期されたマスク形状パラメータ (nullの場合は更新なし) */
  maskShapeParams: CustomMaskShapeParams | null
  /** Processorのレイヤー ID */
  processorId: string | null
}

/**
 * HeroViewConfig から Mask Shape パラメータを同期する
 *
 * Processor Layer の mask modifier から CustomMaskShapeParams に変換する。
 *
 * @param config - HeroViewConfig
 * @returns 同期結果
 */
export function syncMaskShapeParams(config: HeroViewConfig): SyncMaskShapeResult {
  const processor = findProcessorWithMask(config.layers)
  if (!processor) {
    return { maskShapeParams: null, processorId: null }
  }

  const maskModifier = processor.modifiers.find(isMaskProcessorConfig)
  if (!maskModifier) {
    return { maskShapeParams: null, processorId: processor.id }
  }

  // Normalize first (ensures consistent format), then extract static values for UI params
  const normalizedMask = getMaskAsNormalized(maskModifier.shape)

  // Skip if config has RangeExpr values (timeline-driven params can't be synced to UI)
  if (hasRangeValues(normalizedMask)) {
    return { maskShapeParams: null, processorId: processor.id }
  }

  const staticMask = denormalizeMaskConfig(normalizedMask)
  const maskShapeParams = toCustomMaskShapeParams(staticMask)

  return { maskShapeParams, processorId: processor.id }
}

/**
 * Surface Params for Layer 同期結果
 */
export interface SyncSurfaceParamsForLayerResult {
  /** 同期されたサーフェスパラメータ (nullの場合は更新なし) */
  surfaceParams: CustomSurfaceParams | null
  /** RawParams (PropertyValue preserved) for DSL display */
  rawParams: Record<string, unknown> | null
}

/**
 * 指定されたレイヤーIDのサーフェスパラメータを同期する
 *
 * @param config - HeroViewConfig
 * @param layerId - 対象レイヤーID
 * @returns 同期結果
 */
export function syncSurfaceParamsForLayer(
  config: HeroViewConfig,
  layerId: string
): SyncSurfaceParamsForLayerResult {
  const layer = findLayerInTree(config.layers, layerId)
  if (!layer || !isSurfaceLayerConfig(layer)) {
    return { surfaceParams: null, rawParams: null }
  }

  const surfaceLayer = layer as SurfaceLayerNodeConfig
  const normalizedSurface = getSurfaceAsNormalized(surfaceLayer.surface)
  const rawParams = normalizedSurface.params as Record<string, unknown>

  // Skip CustomParams extraction if config has RangeExpr values
  if (hasRangeValues(normalizedSurface)) {
    return { surfaceParams: null, rawParams }
  }

  const staticSurface = denormalizeSurfaceConfig(normalizedSurface)
  const surfaceParams = toCustomSurfaceParams(staticSurface)

  return { surfaceParams, rawParams }
}

/**
 * Raw Params 同期結果（DSL表示用）
 */
export interface SyncRawParamsResult {
  /** マスク形状のrawParams */
  maskShape: Record<string, unknown> | null
  /** 背景サーフェスのrawParams */
  backgroundSurface: Record<string, unknown> | null
}

/**
 * Raw Params を同期する（DSL表示用）
 *
 * @param config - HeroViewConfig
 * @returns 同期結果
 */
export function syncRawParams(config: HeroViewConfig): SyncRawParamsResult {
  // Mask Shape raw params
  let maskShape: Record<string, unknown> | null = null
  const processor = findProcessorWithMask(config.layers)
  if (processor) {
    const maskModifier = processor.modifiers.find(isMaskProcessorConfig)
    if (maskModifier) {
      const normalizedMask = getMaskAsNormalized(maskModifier.shape)
      maskShape = normalizedMask.params as Record<string, unknown>
    }
  }

  // Background Surface raw params
  let backgroundSurface: Record<string, unknown> | null = null
  const baseLayer = config.layers.find((l) => l.id === 'background')
  if (baseLayer && isBaseLayerConfig(baseLayer)) {
    const normalizedSurface = getSurfaceAsNormalized(baseLayer.surface)
    backgroundSurface = normalizedSurface.params as Record<string, unknown>
  }

  return { maskShape, backgroundSurface }
}
