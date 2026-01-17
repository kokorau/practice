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

/**
 * プリセットをHeroViewに適用する
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
  repository.set(preset.config)
}
