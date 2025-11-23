/**
 * Photo Analysis Service
 * WebGPU (優先) / Web Worker (フォールバック) を使用した非同期解析
 */

import type { Photo, PhotoAnalysis } from '../../Domain'
import { $HistogramStats } from '../../Domain/ValueObject/HistogramStats'
import { isWebGPUAvailable, computeHistogramGPU } from './gpu'
import type { WorkerRequest, WorkerResponse } from './photoAnalysis.worker'
import PhotoAnalysisWorker from './photoAnalysis.worker?worker'

// Worker 関連
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
      pendingRequests.forEach((pending) => {
        pending.reject(new Error('Worker error'))
      })
      pendingRequests.clear()
    }
  }
  return worker
}

/**
 * Worker で解析
 */
const analyzeWithWorker = (photo: Photo): Promise<PhotoAnalysis> => {
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
}

/**
 * GPU で解析
 */
const analyzeWithGPU = async (photo: Photo): Promise<PhotoAnalysis> => {
  const histogram = await computeHistogramGPU(photo.imageData)
  const stats = $HistogramStats.create(histogram)
  return { histogram, stats }
}

// GPU 利用可能フラグ (初回チェック後にキャッシュ)
let useGPU: boolean | null = null

export const photoAnalysisService = {
  /**
   * 非同期で写真を解析
   * WebGPU が使えれば GPU、なければ Worker にフォールバック
   */
  analyze: async (photo: Photo): Promise<PhotoAnalysis> => {
    // 初回のみ GPU 利用可能かチェック
    if (useGPU === null) {
      useGPU = isWebGPUAvailable()
      console.log(`PhotoAnalysis: Using ${useGPU ? 'WebGPU' : 'Web Worker'}`)
    }

    if (useGPU) {
      try {
        return await analyzeWithGPU(photo)
      } catch (e) {
        console.warn('GPU analysis failed, falling back to Worker:', e)
        useGPU = false
        return analyzeWithWorker(photo)
      }
    }

    return analyzeWithWorker(photo)
  },

  /**
   * 現在の実行モードを取得
   */
  getMode: (): 'gpu' | 'worker' | 'unknown' => {
    if (useGPU === null) return 'unknown'
    return useGPU ? 'gpu' : 'worker'
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
