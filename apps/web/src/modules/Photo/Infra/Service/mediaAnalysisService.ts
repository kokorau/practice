/**
 * Media Analysis Service
 * Worker を使った非同期解析（LUT 適用 + 解析を Worker 内で一括処理）
 */

import type { PhotoAnalysis } from '../../Domain'
import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'
import type { AnalysisRequest, AnalysisResponse } from './mediaAnalysis.worker'
import MediaAnalysisWorker from './mediaAnalysis.worker?worker'

// Worker プール（複数リクエストを並列処理）
const WORKER_POOL_SIZE = 2
let workers: Worker[] = []
let currentWorkerIndex = 0
let requestId = 0
const pendingRequests = new Map<number, {
  resolve: (analysis: PhotoAnalysis) => void
  reject: (error: Error) => void
}>()

const initWorkers = (): void => {
  if (workers.length > 0) return

  for (let i = 0; i < WORKER_POOL_SIZE; i++) {
    const worker = new MediaAnalysisWorker()
    worker.onmessage = (e: MessageEvent<AnalysisResponse>) => {
      const { id, analysis } = e.data
      const pending = pendingRequests.get(id)
      if (pending) {
        pending.resolve(analysis)
        pendingRequests.delete(id)
      }
    }
    worker.onerror = (e) => {
      console.error('MediaAnalysis Worker error:', e)
    }
    workers.push(worker)
  }
}

const getNextWorker = (): Worker => {
  initWorkers()
  const worker = workers[currentWorkerIndex]!
  currentWorkerIndex = (currentWorkerIndex + 1) % WORKER_POOL_SIZE
  return worker
}

export type AnalyzeOptions = {
  lut?: Lut
  vibrance?: number
  hueRotation?: number
  /** ダウンサンプルスケール (0.5 = 半分, 0.25 = 1/4) */
  downsampleScale?: number
}

export const mediaAnalysisService = {
  /**
   * ImageData を解析（LUT 適用 + エフェクト適用 + 解析を Worker で一括処理）
   */
  analyze: (imageData: ImageData, options: AnalyzeOptions = {}): Promise<PhotoAnalysis> => {
    return new Promise((resolve, reject) => {
      const id = ++requestId
      const worker = getNextWorker()

      pendingRequests.set(id, { resolve, reject })

      const request: AnalysisRequest = {
        id,
        type: 'analyze',
        imageData,
        lut: options.lut,
        vibrance: options.vibrance,
        hueRotation: options.hueRotation,
        downsampleScale: options.downsampleScale ?? 0.5, // デフォルト 1/2 サイズ
      }

      worker.postMessage(request)
    })
  },

  /**
   * Worker を終了
   */
  terminate: () => {
    workers.forEach(w => w.terminate())
    workers = []
    pendingRequests.clear()
  },
}
