import type { TextureRenderSpec } from './Domain'
import { imageShader } from './shaders/image'
import { positionedImageShader, type PositionedImageParams } from './shaders/positionedImage'
import { maskBlendState, fullscreenVertex } from './shaders/common'

/**
 * Passthrough shader for compositing textures with alpha blending
 */
const passthroughShader = /* wgsl */ `
${fullscreenVertex}

struct PassthroughParams {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: PassthroughParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  return textureSample(inputTexture, inputSampler, uv);
}
`

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

interface ClipMaskPipelineCache {
  pipeline: GPURenderPipeline
  uniformBuffer: GPUBuffer
  sampler: GPUSampler
}

interface DualTexturePipelineCache {
  pipeline: GPURenderPipeline
  uniformBuffer: GPUBuffer
  sampler: GPUSampler
}

interface PassthroughPipelineCache {
  pipeline: GPURenderPipeline
  uniformBuffer: GPUBuffer
  sampler: GPUSampler
}

/**
 * 2テクスチャエフェクト用のスペック
 */
export interface DualTextureSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
}

/**
 * ポストエフェクト用のスペック
 */
export interface PostEffectSpec {
  shader: string
  uniforms: ArrayBuffer
  bufferSize: number
  /** Sampler filter mode (default: 'linear') */
  samplerFilter?: 'linear' | 'nearest'
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
  private clipMaskCache: Map<string, ClipMaskPipelineCache> = new Map()
  private dualTextureCache: Map<string, DualTexturePipelineCache> = new Map()
  private passthroughPipelineCache: PassthroughPipelineCache | null = null

  // オフスクリーンレンダリング用のテクスチャ（6スロット）
  // 複雑なパイプライン（背景 + マスク付きレイヤー等）で同時に必要なテクスチャ数に対応
  private offscreenTextures: Array<GPUTexture | null> = [null, null, null, null, null, null]
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
   * Create renderer with externally provided device (for shared device pattern)
   * Use GPUDeviceManager to get shared device
   *
   * @param canvas - The canvas element to render to
   * @param device - Shared GPUDevice instance
   * @param format - Texture format for the canvas
   */
  static createWithSharedDevice(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    device: GPUDevice,
    format: GPUTextureFormat
  ): TextureRenderer {
    const context = canvas.getContext('webgpu') as GPUCanvasContext | null
    if (!context) {
      throw new Error('Could not get WebGPU context')
    }

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
   * Get the WebGPU device (used by TextureOwner nodes for texture creation)
   */
  getDevice(): GPUDevice {
    return this.device
  }

  /**
   * Get the texture format used by this renderer
   */
  getFormat(): GPUTextureFormat {
    return this.format
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

  /**
   * Render an image to a provided texture with cover fit (TextureOwner pattern)
   * Similar to renderImage but outputs to a caller-provided texture instead of canvas
   */
  renderImageToTexture(
    source: ImageBitmap | HTMLImageElement,
    outputTexture: GPUTexture
  ): void {
    const cache = this.getOrCreateImagePipeline()
    const viewport = { width: outputTexture.width, height: outputTexture.height }

    // Create texture from image source
    const sourceTexture = this.device.createTexture({
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
      { texture: sourceTexture },
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
        { binding: 1, resource: sourceTexture.createView() },
        { binding: 2, resource: { buffer: cache.uniformBuffer } },
      ],
    })

    // Render to provided texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cache.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(6)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    // Clean up source texture
    sourceTexture.destroy()
  }

  /**
   * Render an image at a specific position to a provided texture (TextureOwner pattern)
   * Similar to renderPositionedImage but outputs to a caller-provided texture
   */
  renderPositionedImageToTexture(
    source: ImageBitmap,
    params: {
      x: number
      y: number
      width: number
      height: number
      rotation?: number
      opacity?: number
    },
    outputTexture: GPUTexture
  ): void {
    const cache = this.getOrCreatePositionedImagePipeline()
    const viewport = { width: outputTexture.width, height: outputTexture.height }

    // Create texture from image source
    const sourceTexture = this.device.createTexture({
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
      { texture: sourceTexture },
      [source.width, source.height]
    )

    // Write uniform data
    // The shader expects:
    // - imageWidth/Height: displayed size in pixels
    // - posX/posY: position in normalized 0-1 coordinates
    // - anchorX/anchorY: anchor point as 0-1 (0.5 = center)
    const uniformData = new Float32Array([
      viewport.width,
      viewport.height,
      params.width,                    // imageWidth - displayed size in pixels
      params.height,                   // imageHeight - displayed size in pixels
      params.x / viewport.width,       // posX - convert to normalized
      params.y / viewport.height,      // posY - convert to normalized
      0.5,                             // anchorX - center (0-1)
      0.5,                             // anchorY - center (0-1)
      params.rotation ?? 0,
      params.opacity ?? 1,
      0, // padding
      0, // padding
    ])
    this.device.queue.writeBuffer(cache.uniformBuffer, 0, uniformData)

    // Create bind group for this image
    const bindGroup = this.device.createBindGroup({
      layout: cache.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: cache.sampler },
        { binding: 1, resource: sourceTexture.createView() },
        { binding: 2, resource: { buffer: cache.uniformBuffer } },
      ],
    })

    // Render to provided texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cache.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(6)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    // Clean up source texture
    sourceTexture.destroy()
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
   * Get or create offscreen texture for multi-buffer rendering
   */
  private getOrCreateOffscreenTexture(index: number): GPUTexture {
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
    const target = this.getOrCreateOffscreenTexture(this.currentTextureIndex)
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

  /**
   * Apply dual-texture effect shader with two input textures
   * Used for combining surface texture with mask texture
   */
  applyDualTextureEffect(
    spec: DualTextureSpec,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void {
    const cached = this.getOrCreateDualTexturePipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(cached.uniformBuffer, 0, spec.uniforms)

    // Create bind group for these specific textures
    const bindGroup = this.device.createBindGroup({
      layout: cached.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: cached.uniformBuffer } },
        { binding: 1, resource: cached.sampler },
        { binding: 2, resource: primaryTexture.createView() },
        { binding: 3, resource: secondaryTexture.createView() },
      ],
    })

    this.executeRender(cached.pipeline, bindGroup, options)
  }

  private getOrCreateDualTexturePipeline(spec: DualTextureSpec): DualTexturePipelineCache {
    const existing = this.dualTextureCache.get(spec.shader)
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
        targets: [{ format: this.format, blend: maskBlendState }],
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

    const cached: DualTexturePipelineCache = { pipeline, uniformBuffer, sampler }
    this.dualTextureCache.set(spec.shader, cached)
    return cached
  }

  /**
   * Apply dual-texture effect to offscreen texture instead of canvas
   * Used for combining surface + mask, then applying effects before final compositing
   * Returns the output texture for further processing
   */
  applyDualTextureEffectToOffscreen(
    spec: DualTextureSpec,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTextureIndex: number
  ): GPUTexture {
    const target = this.getOrCreateOffscreenTexture(outputTextureIndex)
    const cached = this.getOrCreateDualTexturePipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(cached.uniformBuffer, 0, spec.uniforms)

    // Create bind group for these specific textures
    const bindGroup = this.device.createBindGroup({
      layout: cached.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: cached.uniformBuffer } },
        { binding: 1, resource: cached.sampler },
        { binding: 2, resource: primaryTexture.createView() },
        { binding: 3, resource: secondaryTexture.createView() },
      ],
    })

    // Render to offscreen texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cached.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    return target
  }

  /**
   * Apply dual-texture effect to owned texture (TextureOwner pattern)
   * Similar to applyDualTextureEffectToOffscreen but renders to a caller-provided texture
   */
  applyDualTextureEffectToTexture(
    spec: DualTextureSpec,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTexture: GPUTexture
  ): void {
    const cached = this.getOrCreateDualTexturePipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(cached.uniformBuffer, 0, spec.uniforms)

    // Create bind group for these specific textures
    const bindGroup = this.device.createBindGroup({
      layout: cached.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: cached.uniformBuffer } },
        { binding: 1, resource: cached.sampler },
        { binding: 2, resource: primaryTexture.createView() },
        { binding: 3, resource: secondaryTexture.createView() },
      ],
    })

    // Render to the provided output texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cached.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  /**
   * Composite an offscreen texture to canvas with alpha blending
   * Used for final layer compositing after mask + effects
   */
  compositeToCanvas(
    inputTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void {
    const cached = this.getOrCreatePassthroughPipeline()
    const viewport = this.getViewport()

    // Write viewport uniforms
    const uniformData = new Float32Array([
      viewport.width,
      viewport.height,
      0, // padding
      0, // padding
    ])
    this.device.queue.writeBuffer(cached.uniformBuffer, 0, uniformData)

    // Create bind group for this texture
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

  private getOrCreatePassthroughPipeline(): PassthroughPipelineCache {
    if (this.passthroughPipelineCache) {
      return this.passthroughPipelineCache
    }

    const shaderModule = this.device.createShaderModule({
      code: passthroughShader,
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

    const uniformBuffer = this.device.createBuffer({
      size: 16, // 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    })

    this.passthroughPipelineCache = { pipeline, uniformBuffer, sampler }
    return this.passthroughPipelineCache
  }

  /**
   * Apply post-effect shader to offscreen texture (for ClipGroup Effect)
   * Renders to offscreen buffer instead of main canvas
   * Returns the output texture for further processing (e.g., clip mask)
   */
  applyPostEffectToOffscreen(
    spec: PostEffectSpec,
    inputTexture: GPUTexture,
    outputTextureIndex: number
  ): GPUTexture {
    const target = this.getOrCreateOffscreenTexture(outputTextureIndex)
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

    // Render to offscreen texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cached.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    return target
  }

  /**
   * Apply post-effect shader to input texture, output to owned texture (TextureOwner pattern)
   * Similar to applyPostEffectToOffscreen but renders to a caller-provided texture
   */
  applyPostEffectToTexture(
    spec: PostEffectSpec,
    inputTexture: GPUTexture,
    outputTexture: GPUTexture
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

    // Render to the provided output texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cached.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  private getOrCreatePostEffectPipeline(spec: PostEffectSpec): PostEffectPipelineCache {
    // Include sampler filter in cache key to support different sampling modes
    const filterMode = spec.samplerFilter || 'linear'
    const cacheKey = `${spec.shader}:${filterMode}`
    const existing = this.postEffectCache.get(cacheKey)
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
      magFilter: filterMode,
      minFilter: filterMode,
    })

    const cached: PostEffectPipelineCache = { pipeline, uniformBuffer, sampler }
    this.postEffectCache.set(cacheKey, cached)
    return cached
  }

  // ============================================================
  // Clip Mask Rendering (for ClipGroup)
  // ============================================================

  /**
   * Apply clip mask shader to input texture and render to canvas
   * Used for ClipGroup rendering: masks child layers with SDF shapes
   */
  applyClipMask(
    spec: TextureRenderSpec,
    inputTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void {
    if (!spec.requiresTexture) {
      console.warn('applyClipMask called with spec that does not require texture')
    }

    const cached = this.getOrCreateClipMaskPipeline(spec)

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

  /**
   * Render a spec to an offscreen texture instead of canvas
   * Returns the offscreen texture for further processing
   */
  renderToOffscreen(
    spec: TextureRenderSpec,
    textureIndex: number = 0
  ): GPUTexture {
    const target = this.getOrCreateOffscreenTexture(textureIndex)
    const cached = this.getOrCreatePipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(cached.buffer, 0, spec.uniforms)

    // Render to offscreen texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cached.pipeline)
    renderPass.setBindGroup(0, cached.bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    return target
  }

  /**
   * Render a spec directly to a provided texture (TextureOwner pattern).
   * Unlike renderToOffscreen, this doesn't use the internal texture pool.
   */
  renderToTexture(
    spec: TextureRenderSpec,
    outputTexture: GPUTexture
  ): void {
    const cached = this.getOrCreatePipeline(spec)

    // Write uniform data
    this.device.queue.writeBuffer(cached.buffer, 0, spec.uniforms)

    // Render to the provided texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cached.pipeline)
    renderPass.setBindGroup(0, cached.bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  /**
   * Render image to an offscreen texture
   * Returns the offscreen texture for further processing
   */
  async renderImageToOffscreen(
    source: ImageBitmap | HTMLImageElement,
    textureIndex: number = 0
  ): Promise<GPUTexture> {
    const target = this.getOrCreateOffscreenTexture(textureIndex)
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

    // Render to offscreen texture
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(cache.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(3)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    // Clean up texture
    texture.destroy()

    return target
  }

  /**
   * Copy offscreen texture to canvas
   */
  copyOffscreenToCanvas(textureIndex: number): void {
    const source = this.offscreenTextures[textureIndex]
    if (!source) {
      console.warn('No offscreen texture at index', textureIndex)
      return
    }

    const target = this.context.getCurrentTexture()

    const commandEncoder = this.device.createCommandEncoder()
    commandEncoder.copyTextureToTexture(
      { texture: source },
      { texture: target },
      [source.width, source.height]
    )
    this.device.queue.submit([commandEncoder.finish()])
  }

  /**
   * Get an offscreen texture by index (creates if needed)
   */
  getOffscreenTexture(index: number): GPUTexture {
    return this.getOrCreateOffscreenTexture(index)
  }

  private getOrCreateClipMaskPipeline(spec: TextureRenderSpec): ClipMaskPipelineCache {
    const existing = this.clipMaskCache.get(spec.shader)
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
        targets: [
          spec.blend
            ? { format: this.format, blend: spec.blend }
            : { format: this.format, blend: maskBlendState },
        ],
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

    const cached: ClipMaskPipelineCache = { pipeline, uniformBuffer, sampler }
    this.clipMaskCache.set(spec.shader, cached)
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

    for (const cached of this.clipMaskCache.values()) {
      cached.uniformBuffer.destroy()
    }
    this.clipMaskCache.clear()

    for (const cached of this.dualTextureCache.values()) {
      cached.uniformBuffer.destroy()
    }
    this.dualTextureCache.clear()

    if (this.passthroughPipelineCache) {
      this.passthroughPipelineCache.uniformBuffer.destroy()
      this.passthroughPipelineCache = null
    }

    for (const tex of this.offscreenTextures) {
      tex?.destroy()
    }
    this.offscreenTextures = [null, null, null, null, null, null]
  }
}
