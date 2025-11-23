/**
 * GPU Histogram Service
 * WebGPU を使用した高速ヒストグラム計算
 */

import type { Histogram } from '../../../Domain'
import { histogramShader } from './histogramShader.wgsl'

let device: GPUDevice | null = null
let pipeline: GPUComputePipeline | null = null

/**
 * WebGPU が利用可能かチェック
 */
export const isWebGPUAvailable = (): boolean => {
  return 'gpu' in navigator
}

/**
 * GPU デバイスを初期化
 */
const initGPU = async (): Promise<GPUDevice> => {
  if (device) return device

  if (!navigator.gpu) {
    throw new Error('WebGPU not supported')
  }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error('No GPU adapter found')
  }

  device = await adapter.requestDevice()

  // Compute pipeline 作成
  const shaderModule = device.createShaderModule({
    code: histogramShader,
  })

  pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  })

  return device
}

/**
 * GPU でヒストグラム計算
 */
export const computeHistogramGPU = async (imageData: ImageData): Promise<Histogram> => {
  const dev = await initGPU()
  if (!pipeline) throw new Error('Pipeline not initialized')

  const { data, width, height } = imageData
  const pixelCount = width * height

  // ImageData を Uint32Array に変換 (RGBA packed)
  const pixels = new Uint32Array(data.buffer)

  // GPU バッファ作成
  const pixelBuffer = dev.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  })
  dev.queue.writeBuffer(pixelBuffer, 0, pixels)

  // Histogram バッファ (各256 * 4bytes = 1024 bytes)
  const histogramSize = 256 * 4
  const histogramRBuffer = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
  const histogramGBuffer = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
  const histogramBBuffer = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
  const histogramLBuffer = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })

  // 読み取り用バッファ
  const readBufferR = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })
  const readBufferG = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })
  const readBufferB = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })
  const readBufferL = dev.createBuffer({
    size: histogramSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })

  // Bind group
  const bindGroup = dev.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: pixelBuffer } },
      { binding: 1, resource: { buffer: histogramRBuffer } },
      { binding: 2, resource: { buffer: histogramGBuffer } },
      { binding: 3, resource: { buffer: histogramBBuffer } },
      { binding: 4, resource: { buffer: histogramLBuffer } },
    ],
  })

  // Compute pass
  const commandEncoder = dev.createCommandEncoder()
  const passEncoder = commandEncoder.beginComputePass()
  passEncoder.setPipeline(pipeline)
  passEncoder.setBindGroup(0, bindGroup)
  passEncoder.dispatchWorkgroups(Math.ceil(pixelCount / 256))
  passEncoder.end()

  // 結果をコピー
  commandEncoder.copyBufferToBuffer(histogramRBuffer, 0, readBufferR, 0, histogramSize)
  commandEncoder.copyBufferToBuffer(histogramGBuffer, 0, readBufferG, 0, histogramSize)
  commandEncoder.copyBufferToBuffer(histogramBBuffer, 0, readBufferB, 0, histogramSize)
  commandEncoder.copyBufferToBuffer(histogramLBuffer, 0, readBufferL, 0, histogramSize)

  dev.queue.submit([commandEncoder.finish()])

  // 結果読み取り
  await Promise.all([
    readBufferR.mapAsync(GPUMapMode.READ),
    readBufferG.mapAsync(GPUMapMode.READ),
    readBufferB.mapAsync(GPUMapMode.READ),
    readBufferL.mapAsync(GPUMapMode.READ),
  ])

  const r = new Uint32Array(readBufferR.getMappedRange().slice(0))
  const g = new Uint32Array(readBufferG.getMappedRange().slice(0))
  const b = new Uint32Array(readBufferB.getMappedRange().slice(0))
  const luminance = new Uint32Array(readBufferL.getMappedRange().slice(0))

  // クリーンアップ
  readBufferR.unmap()
  readBufferG.unmap()
  readBufferB.unmap()
  readBufferL.unmap()

  pixelBuffer.destroy()
  histogramRBuffer.destroy()
  histogramGBuffer.destroy()
  histogramBBuffer.destroy()
  histogramLBuffer.destroy()
  readBufferR.destroy()
  readBufferG.destroy()
  readBufferB.destroy()
  readBufferL.destroy()

  return { r, g, b, luminance }
}
