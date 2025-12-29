import type { TextureRenderSpec } from './Domain'

interface PipelineCache {
  pipeline: GPURenderPipeline
  buffer: GPUBuffer
  bindGroup: GPUBindGroup
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

  destroy(): void {
    for (const cached of this.cache.values()) {
      cached.buffer.destroy()
    }
    this.cache.clear()
  }
}
