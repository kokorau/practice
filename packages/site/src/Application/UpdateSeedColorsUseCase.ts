/**
 * UpdateSeedColorsUseCase - SeedColors更新ユースケース
 */

import type { PaletteRepository } from '@practice/semantic-color-palette/Application'
import type { SeedColors } from '@practice/semantic-color-palette/Domain'

export interface UpdateSeedColorsUseCaseDeps {
  paletteRepository: PaletteRepository
}

export interface UpdateSeedColorsUseCase {
  /** SeedColorsを部分更新 */
  execute(colors: Partial<SeedColors>): void
}

export const createUpdateSeedColorsUseCase = (
  deps: UpdateSeedColorsUseCaseDeps
): UpdateSeedColorsUseCase => ({
  execute: (colors: Partial<SeedColors>) => {
    deps.paletteRepository.updateSeedColors(colors)
  },
})
