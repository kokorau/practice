/**
 * SelectProcessorUsecase
 *
 * Processor（Effect/Mask）選択時の同期処理を行うユースケース
 * - Processor選択
 * - ターゲットサーフェスの特定
 * - EffectManagerへの同期
 */

import type { LayerNodeConfig, ProcessorNodeConfig, SurfaceLayerNodeConfig, SingleEffectConfig } from '../Domain/HeroViewConfig'
import type { SelectableProcessorType } from '../Domain/EditorTypes'
import {
  findLayerInTree,
  isProcessorLayerConfig,
  findProcessorTargetSurface,
} from '../Domain/LayerTreeOps'

// Re-export for backward compatibility
export type { SelectableProcessorType } from '../Domain/EditorTypes'

// ============================================================
// Types
// ============================================================

/**
 * EffectManager操作のためのPort
 * VueのcomposableをDIで注入するためのインターフェース
 */
export interface EffectManagerPort {
  /** Select a layer in the effect manager */
  selectLayer(layerId: string): void
  /** Set the effect pipeline for a layer */
  setEffectPipeline(layerId: string, effects: SingleEffectConfig[]): void
}

/**
 * SelectProcessorUsecaseの実行結果
 */
export interface SelectProcessorResult {
  /** 選択されたProcessor */
  processor: ProcessorNodeConfig | null
  /** Processorが適用されるターゲットサーフェス */
  targetSurface: SurfaceLayerNodeConfig | null
  /** Effect同期が実行されたかどうか */
  effectSynced: boolean
}

// ============================================================
// Interface
// ============================================================

/**
 * Processor選択のユースケースインターフェース
 */
export interface SelectProcessorUsecase {
  /**
   * Processorを選択し、必要に応じてEffectManagerと同期
   *
   * @param layers レイヤーツリー
   * @param processorLayerId 選択するProcessorのレイヤーID
   * @param processorType Processorのタイプ（effect/mask）
   * @returns 選択結果
   */
  execute(
    layers: LayerNodeConfig[],
    processorLayerId: string,
    processorType: SelectableProcessorType
  ): SelectProcessorResult
}

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface SelectProcessorUsecaseDeps {
  /** EffectManager操作のためのPort */
  effectManager: EffectManagerPort
}

/**
 * SelectProcessorUsecaseを作成
 */
export const createSelectProcessorUsecase = (
  deps: SelectProcessorUsecaseDeps
): SelectProcessorUsecase => {
  const { effectManager } = deps

  return {
    execute(
      layers: LayerNodeConfig[],
      processorLayerId: string,
      processorType: SelectableProcessorType
    ): SelectProcessorResult {
      const result: SelectProcessorResult = {
        processor: null,
        targetSurface: null,
        effectSynced: false,
      }

      // Find the processor layer
      const processorLayer = findLayerInTree(layers, processorLayerId)
      if (!processorLayer || !isProcessorLayerConfig(processorLayer)) {
        return result
      }

      const processor = processorLayer as ProcessorNodeConfig
      result.processor = processor

      // Find the target surface that this processor applies to
      const targetSurface = findProcessorTargetSurface(layers, processor.id)
      if (targetSurface) {
        result.targetSurface = targetSurface
      }

      // Sync effects to EffectManager when selecting an effect processor
      if (processorType === 'effect' && targetSurface) {
        // Select the target surface layer in effectManager
        effectManager.selectLayer(targetSurface.id)

        // Sync effect from processor modifiers to effectManager
        const effectModifier = processor.modifiers.find((m) => m.type === 'effect')
        if (effectModifier && effectModifier.type === 'effect') {
          effectManager.setEffectPipeline(targetSurface.id, [effectModifier])
          result.effectSynced = true
        }
      }

      return result
    },
  }
}
