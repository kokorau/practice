/**
 * UpdateFilterParams UseCase
 *
 * エフェクトパラメータを更新する汎用関数
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type {
  LayerNodeConfig,
  EffectFilterConfig,
} from '../../Domain/HeroViewConfig'
import type { LayerEffectConfig } from '../../Domain/EffectSchema'
import { type EffectType } from '../../Domain/EffectRegistry'

/**
 * エフェクトフィルターを取得
 */
function findEffectFilter(layer: LayerNodeConfig): EffectFilterConfig | undefined {
  if (!('filters' in layer)) return undefined
  return (layer.filters ?? []).find((p): p is EffectFilterConfig => p.type === 'effect')
}

/**
 * レイヤーのフィルターを更新
 */
function updateFilters(
  filters: EffectFilterConfig[],
  updater: (filter: EffectFilterConfig) => EffectFilterConfig
): EffectFilterConfig[] {
  return filters.map((p) => (p.type === 'effect' ? updater(p) : p))
}

/**
 * 汎用エフェクトパラメータ更新
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param effectType - エフェクトタイプ
 * @param params - 更新するパラメータ
 */
export function updateEffectParams<T extends EffectType>(
  repository: HeroViewRepository,
  layerId: string,
  effectType: T,
  params: Partial<Omit<LayerEffectConfig[T], 'enabled'>>
): void {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('filters' in layer)) return

  const effectFilter = findEffectFilter(layer)
  if (!effectFilter) return

  const updatedFilters = updateFilters(layer.filters ?? [], (p) => ({
    ...p,
    config: {
      ...p.config,
      [effectType]: { ...p.config[effectType], ...params },
    },
  }))

  repository.updateLayer(layerId, { filters: updatedFilters })
}

/**
 * 汎用エフェクトパラメータ取得
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param effectType - エフェクトタイプ
 * @returns エフェクト設定
 */
export function getEffectParams<T extends EffectType>(
  repository: HeroViewRepository,
  layerId: string,
  effectType: T
): LayerEffectConfig[T] | undefined {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('filters' in layer)) return undefined

  const effectFilter = findEffectFilter(layer)
  return effectFilter?.config[effectType]
}

// ============================================================
// Legacy Aliases (for backward compatibility)
// ============================================================

import type {
  VignetteEffectConfig,
  VignetteConfig,
  ChromaticAberrationEffectConfig,
  DotHalftoneEffectConfig,
  LineHalftoneEffectConfig,
  BlurEffectConfig,
} from '../../Domain/EffectSchema'

/** @deprecated Use updateEffectParams(repo, id, 'vignette', params) instead */
export function updateVignetteParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<VignetteEffectConfig, 'enabled'>>
): void {
  updateEffectParams(repository, layerId, 'vignette', params)
}

/** @deprecated Use updateEffectParams(repo, id, 'chromaticAberration', params) instead */
export function updateChromaticAberrationParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<ChromaticAberrationEffectConfig, 'enabled'>>
): void {
  updateEffectParams(repository, layerId, 'chromaticAberration', params)
}

/** @deprecated Use updateEffectParams(repo, id, 'dotHalftone', params) instead */
export function updateDotHalftoneParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<DotHalftoneEffectConfig, 'enabled'>>
): void {
  updateEffectParams(repository, layerId, 'dotHalftone', params)
}

/** @deprecated Use updateEffectParams(repo, id, 'lineHalftone', params) instead */
export function updateLineHalftoneParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<LineHalftoneEffectConfig, 'enabled'>>
): void {
  updateEffectParams(repository, layerId, 'lineHalftone', params)
}

/** @deprecated Use updateEffectParams(repo, id, 'blur', params) instead */
export function updateBlurParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<BlurEffectConfig, 'enabled'>>
): void {
  updateEffectParams(repository, layerId, 'blur', params)
}

/** @deprecated Use getEffectParams(repo, id, 'vignette') instead */
export function getVignetteParams(
  repository: HeroViewRepository,
  layerId: string
): VignetteConfig | undefined {
  return getEffectParams(repository, layerId, 'vignette')
}

/** @deprecated Use getEffectParams(repo, id, 'chromaticAberration') instead */
export function getChromaticAberrationParams(
  repository: HeroViewRepository,
  layerId: string
): ChromaticAberrationEffectConfig | undefined {
  return getEffectParams(repository, layerId, 'chromaticAberration')
}

/** @deprecated Use getEffectParams(repo, id, 'dotHalftone') instead */
export function getDotHalftoneParams(
  repository: HeroViewRepository,
  layerId: string
): DotHalftoneEffectConfig | undefined {
  return getEffectParams(repository, layerId, 'dotHalftone')
}

/** @deprecated Use getEffectParams(repo, id, 'lineHalftone') instead */
export function getLineHalftoneParams(
  repository: HeroViewRepository,
  layerId: string
): LineHalftoneEffectConfig | undefined {
  return getEffectParams(repository, layerId, 'lineHalftone')
}

/** @deprecated Use getEffectParams(repo, id, 'blur') instead */
export function getBlurParams(
  repository: HeroViewRepository,
  layerId: string
): BlurEffectConfig | undefined {
  return getEffectParams(repository, layerId, 'blur')
}
