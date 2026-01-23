/**
 * ApplyPreset UseCase
 *
 * プリセットを適用する（レイアウト設定のみ）
 *
 * Note: colorPreset (brand/accent/foundation HSV values) is returned to the caller
 * for UI state updates via useSiteColors. It's no longer stored in config.colors.
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { HeroViewPreset } from '../../Domain/HeroViewPreset'
import { getPresetConfig } from '../../Domain/HeroViewPreset'
import { migrateToNormalizedFormat, validateHeroViewConfig } from '../../Domain/HeroViewConfig'

/**
 * プリセットをHeroViewに適用する
 *
 * レガシー形式のプリセットは自動的に正規化形式に変換される。
 * 変換後にバリデーションを実行し、エラーがあればコンソールに警告を出力する。
 *
 * Note: colorPreset is available on the preset object for the caller to apply
 * to UI state (useSiteColors). This function only applies the layout config.
 *
 * @param preset - 適用するプリセット
 * @param repository - HeroViewRepository
 */
export function applyPreset(
  preset: HeroViewPreset,
  repository: HeroViewRepository
): void {
  // Get config from preset (supports both static and animated presets)
  const config = getPresetConfig(preset)
  if (!config) {
    console.warn('Preset has no config:', preset.id)
    return
  }

  // Migrate legacy format to normalized format
  const normalizedConfig = migrateToNormalizedFormat(config)

  // Validate at I/O boundary
  const validationResult = validateHeroViewConfig(normalizedConfig)
  if (!validationResult.valid) {
    console.warn('Preset validation errors:', validationResult.errors)
  }

  repository.set(normalizedConfig)
}
