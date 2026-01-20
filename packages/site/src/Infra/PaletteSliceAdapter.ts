/**
 * PaletteSliceAdapter - SiteRepositoryからPaletteへのスライスビュー
 *
 * SiteRepositoryのpaletteフィールドに対するPaletteRepository互換のアダプター
 */

import type {
  PaletteRepository,
  PaletteSubscriber,
  PaletteUnsubscribe,
} from '@practice/semantic-color-palette/Application'
import type { Palette, SeedColors } from '@practice/semantic-color-palette/Domain'
import type { SiteRepository } from '../Application/ports/SiteRepository'

export const createPaletteSlice = (siteRepository: SiteRepository): PaletteRepository => {
  return {
    get: (): Palette => {
      return siteRepository.get().palette
    },

    set: (palette: Palette): void => {
      const site = siteRepository.get()
      siteRepository.set({
        ...site,
        palette,
      })
    },

    subscribe: (subscriber: PaletteSubscriber): PaletteUnsubscribe => {
      let lastPalette = siteRepository.get().palette

      return siteRepository.subscribe((site) => {
        // Only notify if palette actually changed
        if (site.palette !== lastPalette) {
          lastPalette = site.palette
          subscriber(site.palette)
        }
      })
    },

    updateSeedColors: (colors: Partial<SeedColors>): void => {
      siteRepository.updateSeedColors(colors)
    },
  }
}
