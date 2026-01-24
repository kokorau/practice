/**
 * GetProcessorWithTargetUsecase
 *
 * Processorノードとそのターゲットサーフェスをレイヤーツリーから取得するクエリ
 * - processorLayerIdからProcessorNodeを検索
 * - Processorが適用されるターゲットサーフェスを特定
 */

import type { LayerNodeConfig, ProcessorNodeConfig, SurfaceLayerNodeConfig } from '../Domain/HeroViewConfig'
import {
  findLayerInTree,
  isProcessorLayerConfig,
  findProcessorTargetSurface,
} from '../Domain/LayerTreeOps'

// ============================================================
// Types
// ============================================================

/**
 * GetProcessorWithTargetUsecaseの結果
 */
export interface ProcessorWithTarget {
  /** 選択されたProcessor（見つからない場合はundefined） */
  processor: ProcessorNodeConfig | undefined
  /** Processorが適用されるターゲットサーフェス（見つからない場合はundefined） */
  targetSurface: SurfaceLayerNodeConfig | undefined
}

// ============================================================
// Interface
// ============================================================

/**
 * Processorとターゲットサーフェスを取得するクエリインターフェース
 */
export interface GetProcessorWithTargetUsecase {
  /**
   * ProcessorLayerIdからProcessorとターゲットサーフェスを取得
   *
   * @param layers レイヤーツリー
   * @param processorLayerId ProcessorのレイヤーID
   * @returns Processorとターゲットサーフェス
   */
  execute(
    layers: LayerNodeConfig[],
    processorLayerId: string | null
  ): ProcessorWithTarget
}

// ============================================================
// Implementation
// ============================================================

/**
 * GetProcessorWithTargetUsecaseを作成
 *
 * このUsecaseは依存性を持たない純粋なクエリです
 */
export const createGetProcessorWithTargetUsecase = (): GetProcessorWithTargetUsecase => {
  return {
    execute(
      layers: LayerNodeConfig[],
      processorLayerId: string | null
    ): ProcessorWithTarget {
      const result: ProcessorWithTarget = {
        processor: undefined,
        targetSurface: undefined,
      }

      // Early return if no processorLayerId
      if (!processorLayerId) {
        return result
      }

      // Find the processor layer in tree
      const layer = findLayerInTree(layers, processorLayerId)
      if (!layer || !isProcessorLayerConfig(layer)) {
        return result
      }

      const processor = layer as ProcessorNodeConfig
      result.processor = processor

      // Find the target surface that this processor applies to
      const targetSurface = findProcessorTargetSurface(layers, processor.id)
      if (targetSurface) {
        result.targetSurface = targetSurface
      }

      return result
    },
  }
}

/**
 * シングルトンインスタンス（依存性がないため）
 */
export const getProcessorWithTargetUsecase = createGetProcessorWithTargetUsecase()
