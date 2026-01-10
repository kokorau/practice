import type { TextureRenderSpec } from './Domain'
import { imageShader } from './shaders/image'
import { positionedImageShader, type PositionedImageParams } from './shaders/positionedImage'
import { maskBlendState } from './shaders/common'

interface PipelineCache {
  pipeline: GPURenderPipeline
  buffer: GPUBuffer
  bindGroup: GPUBindGroup
}

interface ImagePipelineCache {
  pipeline: GPURenderPipeline
  sampler: GPUSampler
  uniformBuffer: GPUBuffer
}

interface PositionedImagePipelineCache {
  pipeline: GPURenderPipeline
  sampler: GPUSampler
  uniformBuffer: GPUBuffer
}

interface PostEffectPipelineCache {
  pipeline: GPURenderPipeline
  uniformBuffer: GPUBuffer
  sampler: GPUSampler
}

/**
 * ポストエフェクト用のスペック
 */
export interface PostEffectSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

/**
 * テクスチャレンダラー
 * シェーダーをキーにしてpipeline/buffer/bindGroupをキャッシュ
 */
export class TextureRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private format: GPUTextureFormat
  private cache: Map<string, PipelineCache> = new Map()
  private imagePipelineCache: ImagePipelineCache | null = null
  private positionedImagePipelineCache: PositionedImagePipelineCache | null = null
  private postEffectCache: Map<string, PostEffectPipelineCache> = new Map()

  // オフスクリーンレンダリング用のテクスチャ（ダブルバッファ）
  private offscreenTextures: [GPUTexture | null, GPUTexture | null] = [null, null]
  private currentTextureIndex: number = 0

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat
  ) {
    this.device = device
    this.context = context
    this.format = format
  }

  static async create(canvas: HTMLCanvasElement): Promise<TextureRenderer> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new Error('No GPU adapter found')
    }

    const device = await adapter.requestDevice()

    const context = canvas.getContext('webgpu')
    if (!context) {
      throw new Error('Could not get WebGPU context')
    }

    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
      device,
      format,
      alphaMode: 'premultiplied',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })

    return new TextureRenderer(device, context, format)
  }

  /**
   * Get viewport information from canvas
   */
  getViewport(): { width: number; height: number } {
    const canvas = this.context.canvas as HTMLCanvasElement
    return { width: canvas.width, height: canvas.height }
  }

  /**
   * Render using a TextureRenderSpec
   */
  render(spec: TextureRenderSpec, options?: { clear?: boolean }): void {
    const cached = this.getOrCreatePipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(
      cached.buffer,
      0,
      spec.uniforms
    )

    this.executeRender(cached.pipeline, cached.bindGroup, options)
  }

  /**
   * Render an image to the canvas with cover fit
   */
  async renderImage(
    source: ImageBitmap | HTMLImageElement,
    options?: { clear?: boolean }
  ): Promise<void> {
    const cache = this.getOrCreateImagePipeline()
    const viewport = this.getViewport()

    // Create texture from image source
    const texture = this.device.createTexture({
      size: [source.width, source.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })

    // Copy image to texture
    this.device.queue.copyExternalImageToTexture(
      { source },
      { texture },
      [source.width, source.height]
    )

    // Write uniform data
    const uniformData = new Float32Array([
      viewport.width,
      viewport.height,
      source.width,
      source.height,
    ])
    this.device.queue.writeBuffer(cache.uniformBuffer, 0, uniformData)

    // Create bind group for this image
    const bindGroup = this.device.createBindGroup({
      layout: cache.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: cache.sampler },
        { binding: 1, resource: texture.createView() },
        { binding: 2, resource: { buffer: cache.uniformBuffer } },
      ],
    })

    this.executeRender(cache.pipeline, bindGroup, options)

    // Clean up texture
    texture.destroy()
  }

  /**
   * Render an image at a specific position with rotation and alpha blending
   */
  async renderPositionedImage(
    source: ImageBitmap,
    params: PositionedImageParams,
    options?: { clear?: boolean }
  ): Promise<void> {
    const cache = this.getOrCreatePositionedImagePipeline()
    const viewport = this.getViewport()

    // Create texture from image source
    const texture = this.device.createTexture({
      size: [source.width, source.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })

    // Copy image to texture
    this.device.queue.copyExternalImageToTexture(
      { source },
      { texture },
      [source.width, source.height]
    )

    // Write uniform data
    const uniformData = new Float32Array([
      viewport.width,
      viewport.height,
      source.width,
      source.height,
      params.x,
      params.y,
      params.anchorX,
      params.anchorY,
      params.rotation,
      params.opacity,
      0, // padding
      0, // padding
    ])
    this.device.queue.writeBuffer(cache.uniformBuffer, 0, uniformData)

    // Create bind group for this image
    const bindGroup = this.device.createBindGroup({
      layout: cache.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: cache.sampler },
        { binding: 1, resource: texture.createView() },
        { binding: 2, resource: { buffer: cache.uniformBuffer } },
      ],
    })

    this.executeRender(cache.pipeline, bindGroup, options)

    // Clean up texture
    texture.destroy()
  }

  private getOrCreatePositionedImagePipeline(): PositionedImagePipelineCache {
    if (this.positionedImagePipelineCache) {
      return this.positionedImagePipelineCache
    }

    const shaderModule = this.device.createShaderModule({
      code: positionedImageShader,
    })

    const pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format, blend: maskBlendState }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    })

    const uniformBuffer = this.device.createBuffer({
      size: 48, // 12 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.positionedImagePipelineCache = { pipeline, sampler, uniformBuffer }
    return this.positionedImagePipelineCache
  }

  private getOrCreateImagePipeline(): ImagePipelineCache {
    if (this.imagePipelineCache) {
      return this.imagePipelineCache
    }

    const shaderModule = this.device.createShaderModule({
      code: imageShader,
    })

    const pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    })

    const uniformBuffer = this.device.createBuffer({
      size: 16, // 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.imagePipelineCache = { pipeline, sampler, uniformBuffer }
    return this.imagePipelineCache
  }

  private getOrCreatePipeline(spec: TextureRenderSpec): PipelineCache {
    // Use shader code as cache key
    const existing = this.cache.get(spec.shader)
    if (existing) {
      return existing
    }

    // Create new pipeline
    const shaderModule = this.device.createShaderModule({
      code: spec.shader,
    })

    const pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          spec.blend
            ? { format: this.format, blend: spec.blend }
            : { format: this.format },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    const buffer = this.device.createBuffer({
      size: spec.bufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer },
        },
      ],
    })

    const cached: PipelineCache = { pipeline, buffer, bindGroup }
    this.cache.set(spec.shader, cached)
    return cached
  }

  private executeRender(
    pipeline: GPURenderPipeline,
    bindGroup: GPUBindGroup,
    options?: { clear?: boolean }
  ): void {
    const clear = options?.clear ?? true

    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: clear ? 'clear' : 'load',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  // ============================================================
  // Post-Effect Rendering
  // ============================================================

  /**
   * Get or create offscreen texture for ping-pong rendering
   */
  private getOrCreateOffscreenTexture(index: 0 | 1): GPUTexture {
    const viewport = this.getViewport()

    if (this.offscreenTextures[index]) {
      const tex = this.offscreenTextures[index]!
      if (tex.width === viewport.width && tex.height === viewport.height) {
        return tex
      }
      // Size changed, destroy old texture
      tex.destroy()
    }

    const texture = this.device.createTexture({
      size: [viewport.width, viewport.height],
      format: this.format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST,
    })

    this.offscreenTextures[index] = texture
    return texture
  }

  /**
   * Copy current canvas content to offscreen texture
   */
  copyCanvasToTexture(): GPUTexture {
    const target = this.getOrCreateOffscreenTexture(this.currentTextureIndex as 0 | 1)
    const source = this.context.getCurrentTexture()

    const commandEncoder = this.device.createCommandEncoder()
    commandEncoder.copyTextureToTexture(
      { texture: source },
      { texture: target },
      [target.width, target.height]
    )
    this.device.queue.submit([commandEncoder.finish()])

    return target
  }

  /**
   * Apply post-effect shader with input texture
   */
  applyPostEffect(
    spec: PostEffectSpec,
    inputTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void {
    const cached = this.getOrCreatePostEffectPipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(cached.uniformBuffer, 0, spec.uniforms)

    // Create bind group for this specific texture
    const bindGroup = this.device.createBindGroup({
      layout: cached.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: cached.uniformBuffer } },
        { binding: 1, resource: cached.sampler },
        { binding: 2, resource: inputTexture.createView() },
      ],
    })

    this.executeRender(cached.pipeline, bindGroup, options)
  }

  private getOrCreatePostEffectPipeline(spec: PostEffectSpec): PostEffectPipelineCache {
    const existing = this.postEffectCache.get(spec.shader)
    if (existing) {
      return existing
    }

    const shaderModule = this.device.createShaderModule({
      code: spec.shader,
    })

    const pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    const uniformBuffer = this.device.createBuffer({
      size: spec.bufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    })

    const cached: PostEffectPipelineCache = { pipeline, uniformBuffer, sampler }
    this.postEffectCache.set(spec.shader, cached)
    return cached
  }

  /**
   * Read pixels from current canvas texture as ImageData
   * Useful for contrast analysis or other CPU-side processing
   */
  async readPixels(): Promise<ImageData> {
    const viewport = this.getViewport()
    const { width, height } = viewport

    // Calculate buffer size with proper alignment (256 bytes per row)
    const bytesPerPixel = 4
    const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256
    const bufferSize = bytesPerRow * height

    // Create staging buffer for reading
    const stagingBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    // Copy texture to buffer
    const commandEncoder = this.device.createCommandEncoder()
    commandEncoder.copyTextureToBuffer(
      { texture: this.context.getCurrentTexture() },
      { buffer: stagingBuffer, bytesPerRow },
      [width, height]
    )
    this.device.queue.submit([commandEncoder.finish()])

    // Map buffer and read data
    await stagingBuffer.mapAsync(GPUMapMode.READ)
    const arrayBuffer = stagingBuffer.getMappedRange()
    const data = new Uint8Array(arrayBuffer)

    // Create ImageData (remove row padding if any)
    const imageData = new ImageData(width, height)
    const actualBytesPerRow = width * bytesPerPixel
    for (let y = 0; y < height; y++) {
      const srcOffset = y * bytesPerRow
      const dstOffset = y * actualBytesPerRow
      imageData.data.set(data.subarray(srcOffset, srcOffset + actualBytesPerRow), dstOffset)
    }

    // Cleanup
    stagingBuffer.unmap()
    stagingBuffer.destroy()

    return imageData
  }

  destroy(): void {
    for (const cached of this.cache.values()) {
      cached.buffer.destroy()
    }
    this.cache.clear()

    if (this.imagePipelineCache) {
      this.imagePipelineCache.uniformBuffer.destroy()
      this.imagePipelineCache = null
    }

    for (const cached of this.postEffectCache.values()) {
      cached.uniformBuffer.destroy()
    }
    this.postEffectCache.clear()

    for (const tex of this.offscreenTextures) {
      tex?.destroy()
    }
    this.offscreenTextures = [null, null]
  }
}
