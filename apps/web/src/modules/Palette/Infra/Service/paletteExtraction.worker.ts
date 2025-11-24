/**
 * Palette Extraction Web Worker
 * 重い計算処理をメインスレッドから分離
 */

import { extractPalette } from './paletteExtractionService'
import type { Palette } from '../../Domain'

export type WorkerRequest = {
  id: number
  imageData: ImageData
}

export type WorkerResponse = {
  id: number
  palette: Palette
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, imageData } = e.data

  const palette = await extractPalette(imageData)

  const response: WorkerResponse = { id, palette }
  self.postMessage(response)
}
