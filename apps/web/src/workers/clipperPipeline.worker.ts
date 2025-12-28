/**
 * Image Clipper Pipeline Worker
 * マスク処理をバックグラウンドで実行
 */

export type PipelineParams = {
  erode: { radius: number; enabled: boolean }
  feather: { radius: number; enabled: boolean }
  decontaminate: {
    edgeLow: number
    edgeHigh: number
    searchRadius: number
    enabled: boolean
  }
  hairRefine: { opacity: number; enabled: boolean }
  applyAlpha: { enabled: boolean }
}

export type PipelineInput = {
  mask: Float32Array
  hairMask?: Float32Array  // 髪マスク（オプション）
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
      let minConf = mask[i] ?? 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          minConf = Math.min(minConf, mask[ni] ?? 0)
        }
      }

      result[i] = minConf
    }
  }

  return result
}

/** マスクエッジのぼかし（Feather） */
const applyFeather = (
  mask: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array => {
  const result = new Float32Array(mask.length)

  // ガウシアンカーネル生成
  const kernelSize = radius * 2 + 1
  const kernel: number[] = []
  let sum = 0
  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius
    const val = Math.exp(-(x * x) / (2 * radius * radius))
    kernel.push(val)
    sum += val
  }
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] = (kernel[i] ?? 0) / sum
  }

  // 水平方向のぼかし
  const temp = new Float32Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0
      for (let k = -radius; k <= radius; k++) {
        const nx = Math.min(Math.max(x + k, 0), width - 1)
        val += (mask[y * width + nx] ?? 0) * (kernel[k + radius] ?? 0)
      }
      temp[y * width + x] = val
    }
  }

  // 垂直方向のぼかし
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0
      for (let k = -radius; k <= radius; k++) {
        const ny = Math.min(Math.max(y + k, 0), height - 1)
        val += (temp[ny * width + x] ?? 0) * (kernel[k + radius] ?? 0)
      }
      result[y * width + x] = val
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
  searchRadius: number,
  hairMask?: Float32Array
): void => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const confidence = mask[i] ?? 0

      // 髪部分は広めのエッジ範囲と探索半径を使用
      const isHair = hairMask && (hairMask[i] ?? 0) > 0.5
      const effectiveEdgeLow = isHair ? Math.max(0.05, edgeLow - 0.1) : edgeLow
      const effectiveEdgeHigh = isHair ? Math.min(0.95, edgeHigh + 0.05) : edgeHigh
      const effectiveRadius = isHair ? searchRadius + 2 : searchRadius

      if (confidence > effectiveEdgeLow && confidence < effectiveEdgeHigh) {
        let sumR = 0, sumG = 0, sumB = 0, count = 0

        for (let dy = -effectiveRadius; dy <= effectiveRadius; dy++) {
          for (let dx = -effectiveRadius; dx <= effectiveRadius; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

            const ni = ny * width + nx
            const nConf = mask[ni] ?? 0

            if (nConf >= effectiveEdgeHigh) {
              const pi = ni * 4
              sumR += pixels[pi] ?? 0
              sumG += pixels[pi + 1] ?? 0
              sumB += pixels[pi + 2] ?? 0
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

/** 髪マスクのリファイン（透明度調整） */
const applyHairRefine = (
  mask: Float32Array,
  hairMask: Float32Array,
  opacity: number
): Float32Array => {
  const result = new Float32Array(mask.length)

  for (let i = 0; i < mask.length; i++) {
    const isHair = (hairMask[i] ?? 0) > 0.5
    const maskVal = mask[i] ?? 0
    if (isHair) {
      // 髪部分は透明度を調整（エッジをよりソフトに）
      result[i] = maskVal * opacity
    } else {
      result[i] = maskVal
    }
  }

  return result
}

/** マスクをアルファに適用 */
const applyMaskToAlpha = (
  pixels: Uint8ClampedArray,
  mask: Float32Array
): void => {
  for (let i = 0; i < mask.length; i++) {
    pixels[i * 4 + 3] = Math.round((mask[i] ?? 0) * 255)
  }
}

/** パイプライン実行 */
const runPipeline = (input: PipelineInput): PipelineOutput => {
  const startTime = performance.now()

  const { mask, hairMask, pixels, width, height, params } = input
  let currentMask = mask

  // Stage 1: Erode
  if (params.erode.enabled && params.erode.radius > 0) {
    currentMask = applyErode(currentMask, width, height, params.erode.radius)
  }

  // Stage 2: Feather
  if (params.feather.enabled && params.feather.radius > 0) {
    currentMask = applyFeather(currentMask, width, height, params.feather.radius)
  }

  // Stage 3: Decontaminate（髪マスクを渡す）
  if (params.decontaminate.enabled) {
    applyDecontaminate(
      pixels,
      currentMask,
      width,
      height,
      params.decontaminate.edgeLow,
      params.decontaminate.edgeHigh,
      params.decontaminate.searchRadius,
      hairMask
    )
  }

  // Stage 4: Hair Refine
  if (params.hairRefine.enabled && hairMask) {
    currentMask = applyHairRefine(currentMask, hairMask, params.hairRefine.opacity)
  }

  // Stage 5: Apply Alpha
  if (params.applyAlpha.enabled) {
    applyMaskToAlpha(pixels, currentMask)
  }

  const duration = performance.now() - startTime

  return { pixels, duration }
}

// Worker message handler
self.onmessage = (e: MessageEvent<PipelineInput>) => {
  const result = runPipeline(e.data)
  self.postMessage(result, { transfer: [result.pixels.buffer] })
}
