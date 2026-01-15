/**
 * Media Analysis Web Worker
 * OffscreenCanvas を使って video フレーム取得 → LUT 適用 → 解析 を一括処理
 */

import { $Photo } from '../../Domain/ValueObject/Photo'
import { $PhotoAnalysis } from '../../Domain/ValueObject/PhotoAnalysis'
import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'
import {
  applyLutInPlace,
  applyEffectsInPlace,
  downsampleImageData,
} from '../../../Filter/Domain/ValueObject/lutWorkerUtils'

export type AnalysisRequest = {
  id: number
  type: 'analyze'
  imageData: ImageData
  lut?: Lut
  // pixelEffects の一部（Worker で処理可能なもの）
  vibrance?: number
  hueRotation?: number
  /** 解析用にダウンサンプルするスケール (0.25 = 1/4 サイズ) */
  downsampleScale?: number
}

export type AnalysisResponse = {
  id: number
  analysis: ReturnType<typeof $PhotoAnalysis.create>
}

self.onmessage = (e: MessageEvent<AnalysisRequest>) => {
  const { id, type, imageData, lut, vibrance, hueRotation, downsampleScale } = e.data

  if (type !== 'analyze') return

  let processedData = imageData

  // 1. ダウンサンプリング（解析精度は多少落ちるが高速化）
  if (downsampleScale && downsampleScale < 1) {
    processedData = downsampleImageData(processedData, downsampleScale)
  }

  // 2. LUT 適用
  if (lut) {
    applyLutInPlace(processedData, lut)
  }

  // 3. エフェクト適用
  if ((vibrance && Math.abs(vibrance) > 0.01) || (hueRotation && Math.abs(hueRotation) > 0.01)) {
    applyEffectsInPlace(processedData, vibrance ?? 0, hueRotation ?? 0)
  }

  // 4. 解析
  const photo = $Photo.create(processedData)
  const analysis = $PhotoAnalysis.create(photo)

  const response: AnalysisResponse = { id, analysis }
  self.postMessage(response)
}
