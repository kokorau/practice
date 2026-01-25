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
  SingleEffectConfig,
} from '../Domain/HeroViewConfig'
import { getSurfaceAsNormalized, safeDenormalizeSurfaceConfig, isSingleEffectConfig } from '../Domain/HeroViewConfig'
import { findProcessorWithMask, findAllProcessors, findLayerInTree, isMaskProcessorConfig, isSurfaceLayerConfig, isBaseLayerConfig } from '../Domain/LayerTreeOps'
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

  // Use safe denormalize to handle RangeExpr values (uses min value as fallback)
  // This allows the UI to show params even when timeline-driven
  const staticSurface = safeDenormalizeSurfaceConfig(normalizedSurface)
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

  // Use safe denormalize to handle RangeExpr values (uses min value as fallback)
  // This allows the UI to show params even when timeline-driven
  const staticSurface = safeDenormalizeSurfaceConfig(normalizedSurface)
  const surfaceParams = toCustomSurfaceParams(staticSurface)

  return { surfaceParams }
}

/**
 * Mask Shape 同期結果
 * @deprecated Shape-based masks are deprecated. New masks use children layers.
 */
export interface SyncMaskShapeResult {
  /** 同期されたマスク形状パラメータ (常にnull - 廃止) */
  maskShapeParams: null
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

  // NOTE: Shape-based masks are deprecated. New masks use children layers.
  // Return null for maskShapeParams as shape is no longer available.
  // The UI should use mask.children for displaying mask layers.
  return { maskShapeParams: null, processorId: processor.id }
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

  // Use safe denormalize to handle RangeExpr values (uses min value as fallback)
  // This allows the UI to show params even when timeline-driven
  const staticSurface = safeDenormalizeSurfaceConfig(normalizedSurface)
  const surfaceParams = toCustomSurfaceParams(staticSurface)

  return { surfaceParams, rawParams }
}

/**
 * Effect raw params entry (processor ID → effect configs)
 */
export interface EffectRawParams {
  /** Processor layer ID */
  processorId: string
  /** Effect configs with raw PropertyValue params */
  effects: SingleEffectConfig[]
}

/**
 * Raw Params 同期結果（DSL表示用）
 */
export interface SyncRawParamsResult {
  /** マスク形状のrawParams */
  maskShape: Record<string, unknown> | null
  /** 背景サーフェスのrawParams */
  backgroundSurface: Record<string, unknown> | null
  /** エフェクトのrawParams（全プロセッサから収集） */
  effects: EffectRawParams[]
}

/**
 * Raw Params を同期する（DSL表示用）
 *
 * Recursively searches all groups for processors and extracts raw params
 * for masks, surfaces, and effects.
 *
 * @param config - HeroViewConfig
 * @returns 同期結果
 */
export function syncRawParams(config: HeroViewConfig): SyncRawParamsResult {
  // NOTE: Shape-based masks are deprecated. New masks use children layers.
  // maskShape is always null as shape is no longer available.
  const maskShape: Record<string, unknown> | null = null

  // Background Surface raw params (search in background-group or fallback to base layer)
  let backgroundSurface: Record<string, unknown> | null = null
  const backgroundGroup = config.layers.find(
    (layer): layer is GroupLayerNodeConfig => layer.type === 'group' && layer.id === 'background-group'
  )
  if (backgroundGroup) {
    const surfaceLayer = backgroundGroup.children.find(
      (child): child is SurfaceLayerNodeConfig => child.type === 'surface' && child.id === 'background'
    )
    if (surfaceLayer) {
      const normalizedSurface = getSurfaceAsNormalized(surfaceLayer.surface)
      backgroundSurface = normalizedSurface.params as Record<string, unknown>
    }
  }
  // Fallback: legacy base layer
  if (!backgroundSurface) {
    const baseLayer = config.layers.find((l) => l.id === 'background')
    if (baseLayer && isBaseLayerConfig(baseLayer)) {
      const normalizedSurface = getSurfaceAsNormalized(baseLayer.surface)
      backgroundSurface = normalizedSurface.params as Record<string, unknown>
    }
  }

  // Effect raw params (from all processors, recursively)
  const effects: EffectRawParams[] = []
  const allProcessors = findAllProcessors(config.layers)
  for (const processor of allProcessors) {
    const effectModifiers = processor.modifiers.filter(isSingleEffectConfig)
    if (effectModifiers.length > 0) {
      effects.push({
        processorId: processor.id,
        effects: effectModifiers,
      })
    }
  }

  return { maskShape, backgroundSurface, effects }
}
