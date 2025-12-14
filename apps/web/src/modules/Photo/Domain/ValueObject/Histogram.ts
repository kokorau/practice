import type { Photo } from './Photo'
import { $Oklab } from '@practice/color'

export type Histogram = {
  r: Uint32Array         // length: 256
  g: Uint32Array
  b: Uint32Array
  luminance: Uint32Array  // OKLAB L (perceptually uniform)
}

export const $Histogram = {
  create: (photo: Photo): Histogram => {
    const { data } = photo.imageData
    const r = new Uint32Array(256)
    const g = new Uint32Array(256)
    const b = new Uint32Array(256)
    const luminance = new Uint32Array(256)

    for (let i = 0; i < data.length; i += 4) {
      const ri = data[i] ?? 0
      const gi = data[i + 1] ?? 0
      const bi = data[i + 2] ?? 0

      r[ri] = (r[ri] ?? 0) + 1
      g[gi] = (g[gi] ?? 0) + 1
      b[bi] = (b[bi] ?? 0) + 1

      // OKLAB luminance (perceptually uniform)
      const L = $Oklab.lightness255({ r: ri, g: gi, b: bi })
      luminance[L] = (luminance[L] ?? 0) + 1
    }

    return { r, g, b, luminance }
  },
}
