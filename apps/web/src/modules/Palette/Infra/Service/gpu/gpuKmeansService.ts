/**
 * GPU K-means Service
 * WebGPU を使用した高速カラークラスタリング
 */

import { kmeansAssignShader, kmeansSumShader } from './kmeansShader.wgsl'

export type ClusterResult = {
  centroids: Array<{ r: number; g: number; b: number }>
  counts: Uint32Array
}

let device: GPUDevice | null = null
let assignPipeline: GPUComputePipeline | null = null
let sumPipeline: GPUComputePipeline | null = null
let initPromise: Promise<GPUDevice> | null = null

export const isWebGPUAvailable = (): boolean => {
  return 'gpu' in navigator
}

const initGPU = async (): Promise<GPUDevice> => {
  if (device && assignPipeline && sumPipeline) return device
  if (initPromise) return initPromise

  initPromise = (async () => {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new Error('No GPU adapter found')
    }

    device = await adapter.requestDevice()

    const assignModule = device.createShaderModule({ code: kmeansAssignShader })
    const sumModule = device.createShaderModule({ code: kmeansSumShader })

    assignPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: assignModule, entryPoint: 'main' },
    })

    sumPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: sumModule, entryPoint: 'main' },
    })

    return device
  })()

  return initPromise
}

/**
 * K-means クラスタリングをGPUで実行
 * @param imageData 入力画像
 * @param k クラスタ数 (デフォルト7)
 * @param maxIterations 最大イテレーション数
 */
export const computeKmeansGPU = async (
  imageData: ImageData,
  k: number = 7,
  maxIterations: number = 10
): Promise<ClusterResult> => {
  const dev = await initGPU()
  if (!assignPipeline || !sumPipeline) throw new Error('Pipelines not initialized')

  const { data, width, height } = imageData
  const pixelCount = width * height
  const pixels = new Uint32Array(data.buffer)

  // 初期セントロイドをランダムに選択
  const centroids = new Float32Array(k * 3)
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * pixelCount)
    const packed = pixels[idx] ?? 0
    centroids[i * 3] = packed & 0xff
    centroids[i * 3 + 1] = (packed >> 8) & 0xff
    centroids[i * 3 + 2] = (packed >> 16) & 0xff
  }

  // GPU バッファ作成
  const pixelBuffer = dev.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  })
  dev.queue.writeBuffer(pixelBuffer, 0, pixels)

  const centroidBuffer = dev.createBuffer({
    size: centroids.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  })

  const assignmentBuffer = dev.createBuffer({
    size: pixelCount * 4,
    usage: GPUBufferUsage.STORAGE,
  })

  const sumsBuffer = dev.createBuffer({
    size: k * 3 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })

  const countsBuffer = dev.createBuffer({
    size: k * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })

  const numCentroidsBuffer = dev.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  dev.queue.writeBuffer(numCentroidsBuffer, 0, new Uint32Array([k]))

  const readSumsBuffer = dev.createBuffer({
    size: k * 3 * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })

  const readCountsBuffer = dev.createBuffer({
    size: k * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })

  const workgroupCount = Math.ceil(pixelCount / 256)

  // K-means iterations
  for (let iter = 0; iter < maxIterations; iter++) {
    dev.queue.writeBuffer(centroidBuffer, 0, centroids)

    // Phase 1: Assign pixels to centroids
    const assignBindGroup = dev.createBindGroup({
      layout: assignPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pixelBuffer } },
        { binding: 1, resource: { buffer: centroidBuffer } },
        { binding: 2, resource: { buffer: assignmentBuffer } },
        { binding: 3, resource: { buffer: numCentroidsBuffer } },
      ],
    })

    // Phase 2: Sum colors per cluster
    // Reset sums and counts
    dev.queue.writeBuffer(sumsBuffer, 0, new Uint32Array(k * 3))
    dev.queue.writeBuffer(countsBuffer, 0, new Uint32Array(k))

    const sumBindGroup = dev.createBindGroup({
      layout: sumPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pixelBuffer } },
        { binding: 1, resource: { buffer: assignmentBuffer } },
        { binding: 2, resource: { buffer: sumsBuffer } },
        { binding: 3, resource: { buffer: countsBuffer } },
      ],
    })

    const commandEncoder = dev.createCommandEncoder()

    const assignPass = commandEncoder.beginComputePass()
    assignPass.setPipeline(assignPipeline)
    assignPass.setBindGroup(0, assignBindGroup)
    assignPass.dispatchWorkgroups(workgroupCount)
    assignPass.end()

    const sumPass = commandEncoder.beginComputePass()
    sumPass.setPipeline(sumPipeline)
    sumPass.setBindGroup(0, sumBindGroup)
    sumPass.dispatchWorkgroups(workgroupCount)
    sumPass.end()

    commandEncoder.copyBufferToBuffer(sumsBuffer, 0, readSumsBuffer, 0, k * 3 * 4)
    commandEncoder.copyBufferToBuffer(countsBuffer, 0, readCountsBuffer, 0, k * 4)

    dev.queue.submit([commandEncoder.finish()])

    // Read results and update centroids
    await Promise.all([
      readSumsBuffer.mapAsync(GPUMapMode.READ),
      readCountsBuffer.mapAsync(GPUMapMode.READ),
    ])

    const sums = new Uint32Array(readSumsBuffer.getMappedRange().slice(0))
    const counts = new Uint32Array(readCountsBuffer.getMappedRange().slice(0))

    readSumsBuffer.unmap()
    readCountsBuffer.unmap()

    // Update centroids
    for (let i = 0; i < k; i++) {
      const count = counts[i] ?? 0
      if (count > 0) {
        centroids[i * 3] = (sums[i * 3] ?? 0) / count
        centroids[i * 3 + 1] = (sums[i * 3 + 1] ?? 0) / count
        centroids[i * 3 + 2] = (sums[i * 3 + 2] ?? 0) / count
      }
    }
  }

  // Final read for counts
  dev.queue.writeBuffer(sumsBuffer, 0, new Uint32Array(k * 3))
  dev.queue.writeBuffer(countsBuffer, 0, new Uint32Array(k))

  const finalEncoder = dev.createCommandEncoder()
  const finalSumBindGroup = dev.createBindGroup({
    layout: sumPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: pixelBuffer } },
      { binding: 1, resource: { buffer: assignmentBuffer } },
      { binding: 2, resource: { buffer: sumsBuffer } },
      { binding: 3, resource: { buffer: countsBuffer } },
    ],
  })

  const finalPass = finalEncoder.beginComputePass()
  finalPass.setPipeline(sumPipeline)
  finalPass.setBindGroup(0, finalSumBindGroup)
  finalPass.dispatchWorkgroups(workgroupCount)
  finalPass.end()

  finalEncoder.copyBufferToBuffer(countsBuffer, 0, readCountsBuffer, 0, k * 4)
  dev.queue.submit([finalEncoder.finish()])

  await readCountsBuffer.mapAsync(GPUMapMode.READ)
  const finalCounts = new Uint32Array(readCountsBuffer.getMappedRange().slice(0))
  readCountsBuffer.unmap()

  // Cleanup
  pixelBuffer.destroy()
  centroidBuffer.destroy()
  assignmentBuffer.destroy()
  sumsBuffer.destroy()
  countsBuffer.destroy()
  numCentroidsBuffer.destroy()
  readSumsBuffer.destroy()
  readCountsBuffer.destroy()

  // Build result
  const result: ClusterResult = {
    centroids: [],
    counts: finalCounts,
  }

  for (let i = 0; i < k; i++) {
    result.centroids.push({
      r: Math.round(centroids[i * 3] ?? 0),
      g: Math.round(centroids[i * 3 + 1] ?? 0),
      b: Math.round(centroids[i * 3 + 2] ?? 0),
    })
  }

  return result
}
