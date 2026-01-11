/**
 * ApplyColorPreset UseCase
 *
 * カラープリセットを適用する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { ColorPreset } from '../../../SemanticColorPalette/Domain/ValueObject/ColorPreset'

/**
 * カラープリセットを適用する
 *
 * @param preset - 適用するカラープリセット
 * @param repository - HeroViewRepository
 */
export function applyColorPreset(
  preset: ColorPreset,
  repository: HeroViewRepository
): void {
  repository.updateColors({
    brand: preset.brand,
    accent: preset.accent,
    foundation: preset.foundation,
  })
}
