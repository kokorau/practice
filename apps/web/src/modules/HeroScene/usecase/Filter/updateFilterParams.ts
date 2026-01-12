/**
 * UpdateFilterParams UseCase
 *
 * 各フィルター（エフェクト）のパラメータを更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type {
  LayerNodeConfig,
  ProcessorConfig,
  EffectProcessorConfig,
} from '../../Domain/HeroViewConfig'
import type {
  VignetteEffectConfig,
  ChromaticAberrationEffectConfig,
  DotHalftoneEffectConfig,
  LineHalftoneEffectConfig,
} from '../../Domain/EffectSchema'

/**
 * エフェクトプロセッサを取得
 */
function findEffectProcessor(layer: LayerNodeConfig): EffectProcessorConfig | undefined {
  if (!('processors' in layer)) return undefined
  return (layer.processors ?? []).find((p): p is EffectProcessorConfig => p.type === 'effect')
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
 * Vignetteパラメータを更新
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param params - 更新するパラメータ
 */
export function updateVignetteParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<VignetteEffectConfig, 'enabled'>>
): void {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return

  const effectProcessor = findEffectProcessor(layer)
  if (!effectProcessor) return

  const updatedProcessors = updateProcessors(layer.processors ?? [], (p) => ({
    ...p,
    config: {
      ...p.config,
      vignette: { ...p.config.vignette, ...params },
    },
  }))

  repository.updateLayer(layerId, { processors: updatedProcessors })
}

/**
 * ChromaticAberrationパラメータを更新
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param params - 更新するパラメータ
 */
export function updateChromaticAberrationParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<ChromaticAberrationEffectConfig, 'enabled'>>
): void {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return

  const effectProcessor = findEffectProcessor(layer)
  if (!effectProcessor) return

  const updatedProcessors = updateProcessors(layer.processors ?? [], (p) => ({
    ...p,
    config: {
      ...p.config,
      chromaticAberration: { ...p.config.chromaticAberration, ...params },
    },
  }))

  repository.updateLayer(layerId, { processors: updatedProcessors })
}

/**
 * DotHalftoneパラメータを更新
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param params - 更新するパラメータ
 */
export function updateDotHalftoneParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<DotHalftoneEffectConfig, 'enabled'>>
): void {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return

  const effectProcessor = findEffectProcessor(layer)
  if (!effectProcessor) return

  const updatedProcessors = updateProcessors(layer.processors ?? [], (p) => ({
    ...p,
    config: {
      ...p.config,
      dotHalftone: { ...p.config.dotHalftone, ...params },
    },
  }))

  repository.updateLayer(layerId, { processors: updatedProcessors })
}

/**
 * LineHalftoneパラメータを更新
 *
 * @param repository - HeroViewRepository
 * @param layerId - 対象レイヤーID
 * @param params - 更新するパラメータ
 */
export function updateLineHalftoneParams(
  repository: HeroViewRepository,
  layerId: string,
  params: Partial<Omit<LineHalftoneEffectConfig, 'enabled'>>
): void {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return

  const effectProcessor = findEffectProcessor(layer)
  if (!effectProcessor) return

  const updatedProcessors = updateProcessors(layer.processors ?? [], (p) => ({
    ...p,
    config: {
      ...p.config,
      lineHalftone: { ...p.config.lineHalftone, ...params },
    },
  }))

  repository.updateLayer(layerId, { processors: updatedProcessors })
}

/**
 * 現在のVignetteパラメータを取得
 */
export function getVignetteParams(
  repository: HeroViewRepository,
  layerId: string
): VignetteEffectConfig | undefined {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return undefined

  const effectProcessor = findEffectProcessor(layer)
  return effectProcessor?.config.vignette
}

/**
 * 現在のChromaticAberrationパラメータを取得
 */
export function getChromaticAberrationParams(
  repository: HeroViewRepository,
  layerId: string
): ChromaticAberrationEffectConfig | undefined {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return undefined

  const effectProcessor = findEffectProcessor(layer)
  return effectProcessor?.config.chromaticAberration
}

/**
 * 現在のDotHalftoneパラメータを取得
 */
export function getDotHalftoneParams(
  repository: HeroViewRepository,
  layerId: string
): DotHalftoneEffectConfig | undefined {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return undefined

  const effectProcessor = findEffectProcessor(layer)
  return effectProcessor?.config.dotHalftone
}

/**
 * 現在のLineHalftoneパラメータを取得
 */
export function getLineHalftoneParams(
  repository: HeroViewRepository,
  layerId: string
): LineHalftoneEffectConfig | undefined {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)
  if (!layer || !('processors' in layer)) return undefined

  const effectProcessor = findEffectProcessor(layer)
  return effectProcessor?.config.lineHalftone
}
