/**
 * SelectFilterType UseCase
 *
 * フィルタータイプの排他選択を行う
 * 選択されたフィルターのみenabledにし、他はdisabledにする
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type {
  LayerNodeConfig,
  EffectFilterConfig,
} from '../../Domain/HeroViewConfig'
import type { LayerEffectConfig } from '../../Domain/EffectSchema'
import { EFFECT_TYPES, type FilterType } from '../../Domain/EffectRegistry'

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
 * フィルタータイプを選択（排他選択）
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param filterType - 選択するフィルタータイプ
 */
export function selectFilterType(
  repository: HeroViewRepository,
  layerId: string,
  filterType: FilterType
): void {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('filters' in layer)) return

  const effectFilter = findEffectFilter(layer)
  if (!effectFilter) return

  const currentConfig = effectFilter.config

  // Registry-based: update all effects' enabled state dynamically
  const newEffectConfig = Object.fromEntries(
    EFFECT_TYPES.map((type) => [
      type,
      { ...currentConfig[type], enabled: filterType === type },
    ])
  ) as unknown as LayerEffectConfig

  const updatedFilters = updateFilters(layer.filters ?? [], (p) => ({
    ...p,
    config: newEffectConfig,
  }))

  repository.updateLayer(layerId, { filters: updatedFilters })
}

/**
 * 現在のフィルタータイプを取得
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @returns 現在のフィルタータイプ
 */
export function getFilterType(repository: HeroViewRepository, layerId: string): FilterType {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('filters' in layer)) return 'void'

  const effectFilter = findEffectFilter(layer)
  if (!effectFilter) return 'void'

  const effectConfig = effectFilter.config

  // Registry-based: check enabled state dynamically
  for (const type of EFFECT_TYPES) {
    if (effectConfig[type]?.enabled) {
      return type
    }
  }

  return 'void'
}
