/**
 * SelectFilterType UseCase
 *
 * フィルタータイプの排他選択を行う
 * 選択されたフィルターのみenabledにし、他はdisabledにする
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type {
  LayerNodeConfig,
  ProcessorConfig,
  EffectProcessorConfig,
} from '../../Domain/HeroViewConfig'
import type { LayerEffectConfig } from '../../Domain/EffectSchema'

/**
 * フィルタータイプ
 * 'void' = すべてのフィルターを無効化
 */
export type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone'

/**
 * エフェクトプロセッサを取得
 */
function findEffectProcessor(layer: LayerNodeConfig): EffectProcessorConfig | undefined {
  if (!('processors' in layer)) return undefined
  return layer.processors.find((p): p is EffectProcessorConfig => p.type === 'effect')
}

/**
 * レイヤーのプロセッサを更新
 */
function updateProcessors(
  processors: ProcessorConfig[],
  updater: (processor: EffectProcessorConfig) => EffectProcessorConfig
): ProcessorConfig[] {
  return processors.map((p) => (p.type === 'effect' ? updater(p) : p))
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
  if (!layer || !('processors' in layer)) return

  const effectProcessor = findEffectProcessor(layer)
  if (!effectProcessor) return

  const currentConfig = effectProcessor.config

  // 排他選択: 選択されたフィルターのみenabled
  const newEffectConfig: LayerEffectConfig = {
    vignette: { ...currentConfig.vignette, enabled: filterType === 'vignette' },
    chromaticAberration: { ...currentConfig.chromaticAberration, enabled: filterType === 'chromaticAberration' },
    dotHalftone: { ...currentConfig.dotHalftone, enabled: filterType === 'dotHalftone' },
    lineHalftone: { ...currentConfig.lineHalftone, enabled: filterType === 'lineHalftone' },
  }

  const updatedProcessors = updateProcessors(layer.processors, (p) => ({
    ...p,
    config: newEffectConfig,
  }))

  repository.updateLayer(layerId, { processors: updatedProcessors })
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
  if (!layer || !('processors' in layer)) return 'void'

  const effectProcessor = findEffectProcessor(layer)
  if (!effectProcessor) return 'void'

  const effectConfig = effectProcessor.config
  if (effectConfig.vignette.enabled) return 'vignette'
  if (effectConfig.chromaticAberration.enabled) return 'chromaticAberration'
  if (effectConfig.dotHalftone.enabled) return 'dotHalftone'
  if (effectConfig.lineHalftone.enabled) return 'lineHalftone'

  return 'void'
}
