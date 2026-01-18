/**
 * ProcessorUsecase
 *
 * Processor（Effect/Mask）の操作を行うユースケース
 * - modifierの追加・削除
 * - Processorノードの自動作成・削除
 */

import type { HeroViewRepository } from './ports/HeroViewRepository'
import type { ProcessorConfig } from '../Domain/HeroViewConfig'
import {
  createSingleEffectConfig,
  createDefaultMaskProcessorConfig,
} from '../Domain/HeroViewConfig'
import {
  ensureProcessorForLayer,
  addModifierToProcessor,
  removeModifierFromProcessor,
  removeLayerFromTree,
  findLayerInTree,
  isProcessorLayerConfig,
} from '../Domain/LayerTreeOps'

// ============================================================
// Types
// ============================================================

/** Processor modifier type */
export type ProcessorModifierType = 'effect' | 'mask'

// ============================================================
// Interface
// ============================================================

/**
 * Processor操作のユースケースインターフェース
 */
export interface ProcessorUsecase {
  /**
   * レイヤーにmodifierを追加
   * Processorノードがなければ自動作成
   *
   * @param layerId ターゲットのレイヤーID
   * @param type 追加するmodifierのタイプ
   */
  addModifier(layerId: string, type: ProcessorModifierType): void

  /**
   * Processorノードからmodifierを削除
   * modifiersが空になったらProcessorノードも削除
   *
   * @param processorNodeId ProcessorノードのID
   * @param modifierIndex 削除するmodifierのインデックス
   */
  removeModifier(processorNodeId: string, modifierIndex: number): void

  /**
   * Processorノードを削除（すべてのmodifierを含む）
   *
   * @param processorNodeId ProcessorノードのID
   */
  removeProcessor(processorNodeId: string): void
}

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface ProcessorUsecaseDeps {
  repository: HeroViewRepository
}

/**
 * ProcessorUsecaseを作成
 */
export const createProcessorUsecase = (deps: ProcessorUsecaseDeps): ProcessorUsecase => {
  const { repository } = deps

  /**
   * modifierを作成するヘルパー
   */
  const createModifier = (type: ProcessorModifierType): ProcessorConfig => {
    if (type === 'effect') {
      // デフォルトでvignetteエフェクトを追加
      return createSingleEffectConfig('vignette')
    }
    return createDefaultMaskProcessorConfig()
  }

  return {
    addModifier(layerId: string, type: ProcessorModifierType): void {
      const config = repository.get()
      if (!config) return

      // レイヤーの存在確認
      const layer = findLayerInTree(config.layers, layerId)
      if (!layer) return

      // Processorノードがなければ作成
      const [layersWithProcessor, processorId] = ensureProcessorForLayer(config.layers, layerId)

      // modifierを作成
      const modifier = createModifier(type)

      // Processorにmodifierを追加
      const newLayers = addModifierToProcessor(layersWithProcessor, processorId, modifier)

      // リポジトリを更新
      repository.set({
        ...config,
        layers: newLayers,
      })
    },

    removeModifier(processorNodeId: string, modifierIndex: number): void {
      const config = repository.get()
      if (!config) return

      // Processorノードを検索
      const processorNode = findLayerInTree(config.layers, processorNodeId)
      if (!processorNode || !isProcessorLayerConfig(processorNode)) return

      // modifierを削除
      const newLayers = removeModifierFromProcessor(config.layers, processorNodeId, modifierIndex)

      // 更新後のProcessorノードを取得してmodifiersが空か確認
      const updatedProcessor = findLayerInTree(newLayers, processorNodeId)
      if (updatedProcessor && isProcessorLayerConfig(updatedProcessor) && updatedProcessor.modifiers.length === 0) {
        // modifiersが空ならProcessorノードも削除
        const finalLayers = removeLayerFromTree(newLayers, processorNodeId)
        repository.set({
          ...config,
          layers: finalLayers,
        })
      } else {
        repository.set({
          ...config,
          layers: newLayers,
        })
      }
    },

    removeProcessor(processorNodeId: string): void {
      const config = repository.get()
      if (!config) return

      // Processorノードの存在確認
      const processorNode = findLayerInTree(config.layers, processorNodeId)
      if (!processorNode || !isProcessorLayerConfig(processorNode)) return

      // Processorノードを削除
      const newLayers = removeLayerFromTree(config.layers, processorNodeId)

      repository.set({
        ...config,
        layers: newLayers,
      })
    },
  }
}
