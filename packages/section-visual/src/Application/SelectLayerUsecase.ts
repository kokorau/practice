/**
 * SelectLayerUsecase
 *
 * レイヤー選択時の同期処理を行うユースケース
 * - レイヤー選択
 * - EffectManagerへの同期
 */

import type { LayerNodeConfig } from '../Domain/HeroViewConfig'
import { findLayerInTree } from '../Domain/LayerTreeOps'

// ============================================================
// Types
// ============================================================

/**
 * EffectManager操作のためのPort
 * VueのcomposableをDIで注入するためのインターフェース
 */
export interface SelectLayerEffectManagerPort {
  /** Select a layer in the effect manager */
  selectLayer(layerId: string): void
}

/**
 * SelectLayerUsecaseの実行結果
 */
export interface SelectLayerResult {
  /** 選択されたレイヤー */
  layer: LayerNodeConfig | null
  /** Effect同期が実行されたかどうか */
  effectSynced: boolean
}

// ============================================================
// Interface
// ============================================================

/**
 * レイヤー選択のユースケースインターフェース
 */
export interface SelectLayerUsecase {
  /**
   * レイヤーを選択し、EffectManagerと同期
   *
   * @param layers レイヤーツリー
   * @param layerId 選択するレイヤーID
   * @returns 選択結果
   */
  execute(
    layers: LayerNodeConfig[],
    layerId: string
  ): SelectLayerResult
}

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface SelectLayerUsecaseDeps {
  /** EffectManager操作のためのPort */
  effectManager: SelectLayerEffectManagerPort
}

/**
 * SelectLayerUsecaseを作成
 */
export const createSelectLayerUsecase = (
  deps: SelectLayerUsecaseDeps
): SelectLayerUsecase => {
  const { effectManager } = deps

  return {
    execute(
      layers: LayerNodeConfig[],
      layerId: string
    ): SelectLayerResult {
      const result: SelectLayerResult = {
        layer: null,
        effectSynced: false,
      }

      // Find the layer
      const layer = findLayerInTree(layers, layerId)
      if (!layer) {
        return result
      }

      result.layer = layer

      // Sync to EffectManager
      effectManager.selectLayer(layerId)
      result.effectSynced = true

      return result
    },
  }
}
