/**
 * ApplyPreset UseCase
 *
 * プリセットを適用する（レイアウト設定とカラー設定の両方）
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { HeroViewPreset } from '../../Domain/HeroViewPreset'

/**
 * プリセットをHeroViewに適用する
 *
 * @param preset - 適用するプリセット
 * @param repository - HeroViewRepository
 */
export function applyPreset(
  preset: HeroViewPreset,
  repository: HeroViewRepository
): void {
  // Configを一括適用
  repository.set(preset.config)

  // カラープリセットがあれば適用
  if (preset.colorPreset) {
    repository.updateColors({
      brand: preset.colorPreset.brand,
      accent: preset.colorPreset.accent,
      foundation: preset.colorPreset.foundation,
    })
  }
}
