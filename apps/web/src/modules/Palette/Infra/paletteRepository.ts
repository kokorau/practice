import type { ProfiledPalette } from '../Domain'

let current: ProfiledPalette | null = null

export type PaletteRepository = {
  get: () => ProfiledPalette | null
  set: (palette: ProfiledPalette) => void
  clear: () => void
}

export const paletteRepository: PaletteRepository = {
  get: () => current,
  set: (palette: ProfiledPalette) => {
    current = palette
  },
  clear: () => {
    current = null
  },
}
