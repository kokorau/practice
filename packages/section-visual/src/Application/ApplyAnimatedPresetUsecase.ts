/**
 * ApplyAnimatedPresetUsecase
 *
 * アニメーションプリセット適用時の特別な処理を行うユースケース
 * - Animated presetの判定とconfig設定
 * - foreground configの同期
 * - effectManagerのリセット
 *
 * Note: 通常のプリセット適用はuseHeroPresets.applyPresetで行われる。
 * このUsecaseは、selectedPresetIdが変更された後の追加処理を担当する。
 */

import type { HeroViewRepository } from './ports/HeroViewRepository'
import type { HeroViewPreset } from '../Domain/HeroViewPreset'
import type { ForegroundLayerConfig } from '../Domain/HeroViewConfig'
import { isAnimatedPreset, getPresetConfig } from '../Domain/HeroViewPreset'

// ============================================================
// Types
// ============================================================

/**
 * ForegroundConfig操作のためのPort
 */
export interface ForegroundConfigSyncPort {
  /** Set the foreground config */
  set(config: ForegroundLayerConfig): void
}

/**
 * EffectManager操作のためのPort（リセット用）
 */
export interface EffectManagerResetPort {
  /** Select a layer (used to reset to default layer) */
  selectLayer(layerId: string): void
}

/**
 * ApplyAnimatedPresetUsecaseの実行結果
 */
export interface ApplyAnimatedPresetResult {
  /** Whether the preset was an animated preset */
  isAnimated: boolean
  /** Whether config was applied */
  configApplied: boolean
  /** Whether foreground was synced */
  foregroundSynced: boolean
  /** Whether effect manager was reset */
  effectManagerReset: boolean
}

// ============================================================
// Interface
// ============================================================

/**
 * アニメーションプリセット適用のユースケースインターフェース
 */
export interface ApplyAnimatedPresetUsecase {
  /**
   * プリセット変更後の処理を実行
   *
   * @param preset 適用するプリセット
   * @param defaultLayerId effectManagerをリセットするデフォルトレイヤーID
   * @returns 実行結果
   */
  execute(
    preset: HeroViewPreset,
    defaultLayerId: string
  ): ApplyAnimatedPresetResult
}

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface ApplyAnimatedPresetUsecaseDeps {
  /** HeroView Repository */
  repository: HeroViewRepository
  /** ForegroundConfig操作のためのPort */
  foregroundConfig: ForegroundConfigSyncPort
  /** EffectManager操作のためのPort */
  effectManager: EffectManagerResetPort
}

/**
 * ApplyAnimatedPresetUsecaseを作成
 */
export const createApplyAnimatedPresetUsecase = (
  deps: ApplyAnimatedPresetUsecaseDeps
): ApplyAnimatedPresetUsecase => {
  const { repository, foregroundConfig, effectManager } = deps

  return {
    execute(
      preset: HeroViewPreset,
      defaultLayerId: string
    ): ApplyAnimatedPresetResult {
      const result: ApplyAnimatedPresetResult = {
        isAnimated: false,
        configApplied: false,
        foregroundSynced: false,
        effectManagerReset: false,
      }

      // Check if it's an animated preset
      if (isAnimatedPreset(preset)) {
        result.isAnimated = true

        // Get config from preset
        const config = getPresetConfig(preset)
        if (config) {
          // Set config directly (bypasses fromHeroViewConfig which can't handle $PropertyValue bindings)
          repository.set(config)
          result.configApplied = true

          // Sync foreground config (fromHeroViewConfig is skipped for animated presets)
          foregroundConfig.set(config.foreground)
          result.foregroundSynced = true
        }
      }

      // Reset effect manager selection to default layer
      // This ensures effect changes apply to the correct layer after preset switch
      effectManager.selectLayer(defaultLayerId)
      result.effectManagerReset = true

      return result
    },
  }
}
