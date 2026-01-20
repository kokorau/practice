/**
 * PaletteInMemoryRepository - パレットのインメモリ実装
 */

import type {
  PaletteRepository,
  PaletteSubscriber,
  PaletteUnsubscribe,
} from '../Application/ports/PaletteRepository'
import type { Palette } from '../Domain/ValueObject/Palette'
import type { SeedColors } from '../Domain/ValueObject/SeedColors'

export interface CreatePaletteInMemoryRepositoryOptions {
  initialPalette: Palette
}

export const createPaletteInMemoryRepository = (
  options: CreatePaletteInMemoryRepositoryOptions
): PaletteRepository => {
  let palette = options.initialPalette
  const subscribers = new Set<PaletteSubscriber>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(palette)
    }
  }

  return {
    get: () => palette,

    set: (newPalette: Palette) => {
      palette = newPalette
      notifySubscribers()
    },

    subscribe: (subscriber: PaletteSubscriber): PaletteUnsubscribe => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    updateSeedColors: (colors: Partial<SeedColors>) => {
      palette = {
        ...palette,
        seedColors: {
          ...palette.seedColors,
          ...colors,
        },
      }
      notifySubscribers()
    },
  }
}
