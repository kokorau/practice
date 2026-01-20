/**
 * UpdateSeedColorsUseCase - SeedColors更新ユースケース
 */

import type { PaletteRepository } from './ports/PaletteRepository'
import type { SeedColors } from '../Domain/ValueObject/SeedColors'

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
