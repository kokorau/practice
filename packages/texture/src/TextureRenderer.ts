import {
  solidShader,
  stripeShader,
  gridShader,
  polkaDotShader,
  checkerShader,
  type SolidTextureParams,
  type StripeTextureParams,
  type GridTextureParams,
  type PolkaDotTextureParams,
  type CheckerTextureParams,
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

  // Grid
  private gridPipeline: GPURenderPipeline | null = null
  private gridBuffer: GPUBuffer | null = null
  private gridBindGroup: GPUBindGroup | null = null

  // PolkaDot
  private polkaDotPipeline: GPURenderPipeline | null = null
  private polkaDotBuffer: GPUBuffer | null = null
  private polkaDotBindGroup: GPUBindGroup | null = null

  // Checker
  private checkerPipeline: GPURenderPipeline | null = null
  private checkerBuffer: GPUBuffer | null = null
  private checkerBindGroup: GPUBindGroup | null = null

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

  renderGrid(params: GridTextureParams): void {
    if (!this.gridPipeline) {
      const shaderModule = this.device.createShaderModule({
        code: gridShader,
      })

      this.gridPipeline = this.device.createRenderPipeline({
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

      // GridParams: lineColor(16) + bgColor(16) + lineWidth(4) + cellSize(4) + padding(8) = 48 bytes
      this.gridBuffer = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      this.gridBindGroup = this.device.createBindGroup({
        layout: this.gridPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.gridBuffer },
          },
        ],
      })
    }

    const data = new Float32Array([
      ...params.lineColor,
      ...params.bgColor,
      params.lineWidth,
      params.cellSize,
      0, // padding
      0, // padding
    ])
    this.device.queue.writeBuffer(this.gridBuffer!, 0, data)

    this.render(this.gridPipeline, this.gridBindGroup!)
  }

  renderPolkaDot(params: PolkaDotTextureParams): void {
    if (!this.polkaDotPipeline) {
      const shaderModule = this.device.createShaderModule({
        code: polkaDotShader,
      })

      this.polkaDotPipeline = this.device.createRenderPipeline({
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

      // PolkaDotParams: dotColor(16) + bgColor(16) + dotRadius(4) + spacing(4) + rowOffset(4) + padding(4) = 48 bytes
      this.polkaDotBuffer = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      this.polkaDotBindGroup = this.device.createBindGroup({
        layout: this.polkaDotPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.polkaDotBuffer },
          },
        ],
      })
    }

    const data = new Float32Array([
      ...params.dotColor,
      ...params.bgColor,
      params.dotRadius,
      params.spacing,
      params.rowOffset,
      0, // padding
    ])
    this.device.queue.writeBuffer(this.polkaDotBuffer!, 0, data)

    this.render(this.polkaDotPipeline, this.polkaDotBindGroup!)
  }

  renderChecker(params: CheckerTextureParams): void {
    if (!this.checkerPipeline) {
      const shaderModule = this.device.createShaderModule({
        code: checkerShader,
      })

      this.checkerPipeline = this.device.createRenderPipeline({
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

      // CheckerParams: color1(16) + color2(16) + cellSize(4) + angle(4) + padding(8) = 48 bytes
      this.checkerBuffer = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      this.checkerBindGroup = this.device.createBindGroup({
        layout: this.checkerPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.checkerBuffer },
          },
        ],
      })
    }

    const data = new Float32Array([
      ...params.color1,
      ...params.color2,
      params.cellSize,
      params.angle,
      0, // padding
      0, // padding
    ])
    this.device.queue.writeBuffer(this.checkerBuffer!, 0, data)

    this.render(this.checkerPipeline, this.checkerBindGroup!)
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
    this.gridBuffer?.destroy()
    this.polkaDotBuffer?.destroy()
    this.checkerBuffer?.destroy()
  }
}
