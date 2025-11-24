/**
 * Media Palette Service
 * Worker を使った非同期パレット抽出
 */

import type { ProfiledPalette } from '../../Domain'
import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'
import type { PaletteRequest, PaletteResponse } from './mediaPalette.worker'
import MediaPaletteWorker from './mediaPalette.worker?worker'

let worker: Worker | null = null
let requestId = 0
const pendingRequests = new Map<number, {
  resolve: (palette: ProfiledPalette) => void
  reject: (error: Error) => void
}>()

const getWorker = (): Worker => {
  if (!worker) {
    worker = new MediaPaletteWorker()
    worker.onmessage = (e: MessageEvent<PaletteResponse>) => {
      const { id, palette } = e.data
      const pending = pendingRequests.get(id)
      if (pending) {
        pending.resolve(palette)
        pendingRequests.delete(id)
      }
    }
    worker.onerror = (e) => {
      console.error('MediaPalette Worker error:', e)
    }
  }
  return worker
}

export type ExtractOptions = {
  lut?: Lut
  vibrance?: number
  hueRotation?: number
  downsampleScale?: number
}

export const mediaPaletteService = {
  /**
   * ImageData からパレットを抽出
   */
  extract: (imageData: ImageData, options: ExtractOptions = {}): Promise<ProfiledPalette> => {
    return new Promise((resolve, reject) => {
      const id = ++requestId
      const w = getWorker()

      pendingRequests.set(id, { resolve, reject })

      const request: PaletteRequest = {
        id,
        type: 'extract',
        imageData,
        lut: options.lut,
        vibrance: options.vibrance,
        hueRotation: options.hueRotation,
        downsampleScale: options.downsampleScale ?? 0.25, // デフォルト 1/4 サイズ
      }

      w.postMessage(request)
    })
  },

  terminate: () => {
    if (worker) {
      worker.terminate()
      worker = null
      pendingRequests.clear()
    }
  },
}
