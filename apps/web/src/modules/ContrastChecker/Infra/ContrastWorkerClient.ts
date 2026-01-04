/**
 * Client for contrast analysis web worker
 * Provides async interface to offload CPU-intensive contrast calculations
 */

import type { ContrastAnalysisResult } from '../Domain'
import type { ContrastRegion } from '../Application/checkCanvasContrast'

interface WorkerRequest {
  id: number
  imageData: ImageData
  textColor: string
  region: ContrastRegion
}

interface WorkerResponse {
  id: number
  result: ContrastAnalysisResult | null
}

let worker: Worker | null = null
let requestId = 0
const pendingRequests = new Map<number, {
  resolve: (result: ContrastAnalysisResult | null) => void
  reject: (error: Error) => void
}>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./contrastWorker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, result } = event.data
      const pending = pendingRequests.get(id)
      if (pending) {
        pendingRequests.delete(id)
        pending.resolve(result)
      }
    }
    worker.onerror = (error) => {
      console.error('[ContrastWorker] Error:', error)
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        pendingRequests.delete(id)
        pending.reject(new Error('Worker error'))
      }
    }
  }
  return worker
}

/**
 * Check contrast using web worker (async, non-blocking)
 */
export function checkContrastAsync(
  imageData: ImageData,
  textColor: string,
  region: ContrastRegion
): Promise<ContrastAnalysisResult | null> {
  return new Promise((resolve, reject) => {
    const id = ++requestId
    pendingRequests.set(id, { resolve, reject })

    const w = getWorker()
    const request: WorkerRequest = { id, imageData, textColor, region }
    w.postMessage(request)
  })
}

/**
 * Terminate the worker (cleanup)
 */
export function terminateContrastWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
    pendingRequests.clear()
  }
}

export const $ContrastWorkerClient = {
  checkAsync: checkContrastAsync,
  terminate: terminateContrastWorker,
}
