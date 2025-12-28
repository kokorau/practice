/**
 * Image Clipper Pipeline Worker
 * マスク処理をバックグラウンドで実行
 */

export type PipelineParams = {
  erode: { radius: number; enabled: boolean }
  decontaminate: {
    edgeLow: number
    edgeHigh: number
    searchRadius: number
    enabled: boolean
  }
}

export type PipelineInput = {
  mask: Float32Array
  pixels: Uint8ClampedArray
  width: number
  height: number
  params: PipelineParams
}

export type PipelineOutput = {
  pixels: Uint8ClampedArray
  duration: number
}

/** マスク収縮（Erode） */
const applyErode = (
  mask: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array => {
  const result = new Float32Array(mask.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      let minConf = mask[i]

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          minConf = Math.min(minConf, mask[ni])
        }
      }

      result[i] = minConf
    }
  }

  return result
}

/** カラーデコンタミネーション */
const applyDecontaminate = (
  pixels: Uint8ClampedArray,
  mask: Float32Array,
  width: number,
  height: number,
  edgeLow: number,
  edgeHigh: number,
  searchRadius: number
): void => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const confidence = mask[i]

      if (confidence > edgeLow && confidence < edgeHigh) {
        let sumR = 0, sumG = 0, sumB = 0, count = 0

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

            const ni = ny * width + nx
            const nConf = mask[ni]

            if (nConf >= edgeHigh) {
              const pi = ni * 4
              sumR += pixels[pi]
              sumG += pixels[pi + 1]
              sumB += pixels[pi + 2]
              count++
            }
          }
        }

        if (count > 0) {
          const pi = i * 4
          pixels[pi] = Math.round(sumR / count)
          pixels[pi + 1] = Math.round(sumG / count)
          pixels[pi + 2] = Math.round(sumB / count)
        }
      }
    }
  }
}

/** マスクをアルファに適用 */
const applyMaskToAlpha = (
  pixels: Uint8ClampedArray,
  mask: Float32Array
): void => {
  for (let i = 0; i < mask.length; i++) {
    pixels[i * 4 + 3] = Math.round(mask[i] * 255)
  }
}

/** パイプライン実行 */
const runPipeline = (input: PipelineInput): PipelineOutput => {
  const startTime = performance.now()

  const { mask, pixels, width, height, params } = input
  let currentMask = mask

  // Stage 1: Erode
  if (params.erode.enabled && params.erode.radius > 0) {
    currentMask = applyErode(currentMask, width, height, params.erode.radius)
  }

  // Stage 2: Decontaminate
  if (params.decontaminate.enabled) {
    applyDecontaminate(
      pixels,
      currentMask,
      width,
      height,
      params.decontaminate.edgeLow,
      params.decontaminate.edgeHigh,
      params.decontaminate.searchRadius
    )
  }

  // Apply mask to alpha
  applyMaskToAlpha(pixels, currentMask)

  const duration = performance.now() - startTime

  return { pixels, duration }
}

// Worker message handler
self.onmessage = (e: MessageEvent<PipelineInput>) => {
  const result = runPipeline(e.data)
  self.postMessage(result, [result.pixels.buffer])
}
