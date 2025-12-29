import {
  solidShader,
  stripeShader,
  type SolidTextureParams,
  type StripeTextureParams,
} from './shaders'

/**
 * テクスチャレンダラー
 */
export class TextureRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private format: GPUTextureFormat

  // Solid
  private solidPipeline: GPURenderPipeline | null = null
  private solidBuffer: GPUBuffer | null = null
  private solidBindGroup: GPUBindGroup | null = null

  // Stripe
  private stripePipeline: GPURenderPipeline | null = null
  private stripeBuffer: GPUBuffer | null = null
  private stripeBindGroup: GPUBindGroup | null = null

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

  renderSolid(params: SolidTextureParams): void {
    if (!this.solidPipeline) {
      const shaderModule = this.device.createShaderModule({
        code: solidShader,
      })

      this.solidPipeline = this.device.createRenderPipeline({
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

      this.solidBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      this.solidBindGroup = this.device.createBindGroup({
        layout: this.solidPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.solidBuffer },
          },
        ],
      })
    }

    this.device.queue.writeBuffer(
      this.solidBuffer!,
      0,
      new Float32Array(params.color)
    )

    this.render(this.solidPipeline, this.solidBindGroup!)
  }

  renderStripe(params: StripeTextureParams): void {
    if (!this.stripePipeline) {
      const shaderModule = this.device.createShaderModule({
        code: stripeShader,
      })

      this.stripePipeline = this.device.createRenderPipeline({
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

      // StripeParams: color1(16) + color2(16) + width1(4) + width2(4) + angle(4) + padding(4) = 48 bytes
      this.stripeBuffer = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      this.stripeBindGroup = this.device.createBindGroup({
        layout: this.stripePipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.stripeBuffer },
          },
        ],
      })
    }

    const data = new Float32Array([
      ...params.color1,
      ...params.color2,
      params.width1,
      params.width2,
      params.angle,
      0, // padding
    ])
    this.device.queue.writeBuffer(this.stripeBuffer!, 0, data)

    this.render(this.stripePipeline, this.stripeBindGroup!)
  }

  private render(pipeline: GPURenderPipeline, bindGroup: GPUBindGroup): void {
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
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
    this.solidBuffer?.destroy()
    this.stripeBuffer?.destroy()
  }
}
