/**
 * Photo Analysis Web Worker
 * 重い計算処理をメインスレッドから分離
 */

import { $Photo } from '../../Domain/ValueObject/Photo'
import { $PhotoAnalysis } from '../../Domain/ValueObject/PhotoAnalysis'

export type WorkerRequest = {
  id: number
  imageData: ImageData
}

export type WorkerResponse = {
  id: number
  analysis: ReturnType<typeof $PhotoAnalysis.create>
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, imageData } = e.data

  // Domain の純粋関数を使用
  const photo = $Photo.create(imageData)
  const analysis = $PhotoAnalysis.create(photo)

  const response: WorkerResponse = { id, analysis }
  self.postMessage(response)
}
