/**
 * GetPaletteUseCase - パレット取得ユースケース
 */

import type { PaletteRepository, PaletteSubscriber, PaletteUnsubscribe } from './ports/PaletteRepository'
import type { Palette } from '../Domain/ValueObject/Palette'

export interface GetPaletteUseCaseDeps {
  paletteRepository: PaletteRepository
}

export interface GetPaletteUseCase {
  /** 現在のパレットを取得 */
  execute(): Palette
  /** パレット変更を購読 */
  subscribe(subscriber: PaletteSubscriber): PaletteUnsubscribe
}

export const createGetPaletteUseCase = (
  deps: GetPaletteUseCaseDeps
): GetPaletteUseCase => ({
  execute: () => deps.paletteRepository.get(),
  subscribe: (subscriber: PaletteSubscriber) => deps.paletteRepository.subscribe(subscriber),
})
