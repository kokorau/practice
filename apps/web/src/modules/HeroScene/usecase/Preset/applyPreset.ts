/**
 * ApplyPreset UseCase
 *
 * プリセットを適用する（レイアウト設定とカラー設定の両方）
 * ロード時にレガシー形式を新形式にマイグレーションする
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { HeroViewPreset } from '../../Domain/HeroViewPreset'
import { migrateHeroViewConfig } from '../../Domain/HeroViewConfig'

/**
 * プリセットをHeroViewに適用する
 *
 * プリセット内のレガシーEffectFilterConfigは自動的に
 * SingleEffectConfigにマイグレーションされる
 *
 * @param preset - 適用するプリセット
 * @param repository - HeroViewRepository
 */
export function applyPreset(
  preset: HeroViewPreset,
  repository: HeroViewRepository
): void {
  // Configをマイグレーションして適用
  const migratedConfig = migrateHeroViewConfig(preset.config)
  repository.set(migratedConfig)

  // カラープリセットがあれば適用
  if (preset.colorPreset) {
    repository.updateColors({
      brand: preset.colorPreset.brand,
      accent: preset.colorPreset.accent,
      foundation: preset.colorPreset.foundation,
    })
  }
}
