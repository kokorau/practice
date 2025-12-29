import type { GradientVO } from '../../Domain'
import { $GradientVO } from '../../Domain'
import { GRADIENT_SHADER_CODE } from './shaders'
import {
  UNIFORM_BUFFER_SIZE,
  buildGradientUniform,
  COLOR_POINT_STRIDE,
  buildColorPointBuffer,
} from './buffers'

/**
 * Check if WebGPU is supported
 */
export async function isWebGPUSupported(): Promise<boolean> {
  if (!navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

/**
 * WebGPU-based gradient renderer
 * Renders 2D ambient gradients with OKLab color blending
 */
export class GradientRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private pipeline: GPURenderPipeline
  private bindGroupLayout: GPUBindGroupLayout

  private uniformBuffer: GPUBuffer
  private colorPointBuffer: GPUBuffer
  private bindGroup: GPUBindGroup

  private colorPointCapacity: number
  private width: number
  private height: number

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bindGroupLayout: GPUBindGroupLayout,
    uniformBuffer: GPUBuffer,
    colorPointBuffer: GPUBuffer,
    bindGroup: GPUBindGroup,
    colorPointCapacity: number,
    width: number,
    height: number
  ) {
    this.device = device
    this.context = context
    this.pipeline = pipeline
    this.bindGroupLayout = bindGroupLayout
    this.uniformBuffer = uniformBuffer
    this.colorPointBuffer = colorPointBuffer
    this.bindGroup = bindGroup
    this.colorPointCapacity = colorPointCapacity
    this.width = width
    this.height = height
  }

  /**
   * Create a new GradientRenderer
   */
  static async create(canvas: HTMLCanvasElement): Promise<GradientRenderer> {
    const adapter = await navigator.gpu?.requestAdapter()
    if (!adapter) {
      throw new Error('WebGPU not supported: no adapter')
    }

    const device = await adapter.requestDevice()

    const context = canvas.getContext('webgpu')
    if (!context) {
      throw new Error('Could not get WebGPU context')
    }

    const width = canvas.width
    const height = canvas.height

    // Configure for P3 color space with float format for HDR
    const preferredFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
      device,
      format: preferredFormat,
      alphaMode: 'premultiplied',
    })

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: GRADIENT_SHADER_CODE,
    })

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
      ],
    })

    // Create pipeline
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    })

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: preferredFormat }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    // Create buffers
    const uniformBuffer = device.createBuffer({
      size: UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const initialCapacity = $GradientVO.MAX_POINTS
    const colorPointBuffer = device.createBuffer({
      size: initialCapacity * COLOR_POINT_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: colorPointBuffer } },
      ],
    })

    return new GradientRenderer(
      device,
      context,
      pipeline,
      bindGroupLayout,
      uniformBuffer,
      colorPointBuffer,
      bindGroup,
      initialCapacity,
      width,
      height
    )
  }

  /**
   * Render gradient to canvas
   */
  render(vo: GradientVO): void {
    if (!$GradientVO.isValid(vo)) {
      console.warn('Invalid gradient VO, skipping render')
      return
    }

    // Ensure color point buffer is large enough
    if (vo.points.length > this.colorPointCapacity) {
      this.resizeColorPointBuffer(vo.points.length)
    }

    // Upload uniform data
    const uniformData = buildGradientUniform(vo, this.width, this.height)
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData)

    // Upload color point data
    const pointData = buildColorPointBuffer(vo.points)
    this.device.queue.writeBuffer(this.colorPointBuffer, 0, pointData)

    // Render
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(this.pipeline)
    renderPass.setBindGroup(0, this.bindGroup)
    renderPass.draw(6) // Full-screen quad (2 triangles)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  /**
   * Resize canvas and update internal dimensions
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  /**
   * Resize color point buffer if needed
   */
  private resizeColorPointBuffer(requiredCapacity: number): void {
    const newCapacity = Math.max(requiredCapacity, this.colorPointCapacity * 2)

    this.colorPointBuffer.destroy()
    this.colorPointBuffer = this.device.createBuffer({
      size: newCapacity * COLOR_POINT_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Recreate bind group with new buffer
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.colorPointBuffer } },
      ],
    })

    this.colorPointCapacity = newCapacity
  }

  /**
   * Clean up GPU resources
   */
  dispose(): void {
    this.uniformBuffer.destroy()
    this.colorPointBuffer.destroy()
  }
}
