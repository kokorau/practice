/**
 * Photo Analysis Service
 * Web Worker を使用した非同期解析サービス
 */

import type { Photo, PhotoAnalysis } from '../../Domain'
import type { WorkerRequest, WorkerResponse } from './photoAnalysis.worker'
import PhotoAnalysisWorker from './photoAnalysis.worker?worker'

let worker: Worker | null = null
let requestId = 0
const pendingRequests = new Map<number, {
  resolve: (analysis: PhotoAnalysis) => void
  reject: (error: Error) => void
}>()

const getWorker = (): Worker => {
  if (!worker) {
    worker = new PhotoAnalysisWorker()
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, analysis } = e.data
      const pending = pendingRequests.get(id)
      if (pending) {
        pending.resolve(analysis)
        pendingRequests.delete(id)
      }
    }
    worker.onerror = (e) => {
      console.error('Worker error:', e)
      // すべてのペンディングリクエストをリジェクト
      pendingRequests.forEach((pending) => {
        pending.reject(new Error('Worker error'))
      })
      pendingRequests.clear()
    }
  }
  return worker
}

export const photoAnalysisService = {
  /**
   * 非同期で写真を解析
   */
  analyze: (photo: Photo): Promise<PhotoAnalysis> => {
    return new Promise((resolve, reject) => {
      const id = ++requestId
      const w = getWorker()

      pendingRequests.set(id, { resolve, reject })

      const request: WorkerRequest = {
        id,
        imageData: photo.imageData,
      }
      w.postMessage(request)
    })
  },

  /**
   * Worker を終了
   */
  terminate: () => {
    if (worker) {
      worker.terminate()
      worker = null
      pendingRequests.clear()
    }
  },
}
