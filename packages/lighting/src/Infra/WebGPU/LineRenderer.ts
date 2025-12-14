/**
 * WebGPU Line Renderer
 * Renders line segments with vertex colors using rasterization
 */

import type { LineSegments } from '../../Domain/ValueObject'
import type { PerspectiveCamera, OrthographicCamera } from '../../Domain/ValueObject'
import { $Vector3 } from '@practice/vector'
import lineShader from './shaders/line.wgsl?raw'

type Camera = PerspectiveCamera | OrthographicCamera

export interface LineScene {
  readonly lines: LineSegments
  readonly backgroundColor?: { r: number; g: number; b: number }
}

export const $LineScene = {
  create: (lines: LineSegments, backgroundColor?: { r: number; g: number; b: number }): LineScene => ({
    lines,
    backgroundColor,
  }),
}

/**
 * Build View matrix (lookAt)
 */
function buildViewMatrix(eye: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }, up: { x: number; y: number; z: number }): Float32Array {
  const forward = $Vector3.normalize($Vector3.sub(target, eye))
  const right = $Vector3.normalize($Vector3.cross(forward, up))
  const newUp = $Vector3.cross(right, forward)

  // Column-major 4x4 matrix
  return new Float32Array([
    right.x, newUp.x, -forward.x, 0,
    right.y, newUp.y, -forward.y, 0,
    right.z, newUp.z, -forward.z, 0,
    -$Vector3.dot(right, eye), -$Vector3.dot(newUp, eye), $Vector3.dot(forward, eye), 1,
  ])
}

/**
 * Build Perspective projection matrix
 */
function buildPerspectiveMatrix(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan((fov * Math.PI / 180) / 2)
  const rangeInv = 1.0 / (near - far)

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ])
}

/**
 * Build Orthographic projection matrix
 */
function buildOrthographicMatrix(width: number, height: number, near: number, far: number): Float32Array {
  const r = width / 2
  const t = height / 2
  const rangeInv = 1.0 / (near - far)

  return new Float32Array([
    1 / r, 0, 0, 0,
    0, 1 / t, 0, 0,
    0, 0, 2 * rangeInv, 0,
    0, 0, (near + far) * rangeInv, 1,
  ])
}

/**
 * Multiply two 4x4 matrices (column-major)
 */
function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row]! * b[col * 4 + k]!
      }
      result[col * 4 + row] = sum
    }
  }
  return result
}

export class LineRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private pipeline: GPURenderPipeline
  private uniformBuffer: GPUBuffer
  private bindGroup: GPUBindGroup
  private depthTexture: GPUTexture | null = null
  private depthTextureView: GPUTextureView | null = null
  private lastWidth = 0
  private lastHeight = 0

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    uniformBuffer: GPUBuffer,
    bindGroup: GPUBindGroup
  ) {
    this.device = device
    this.context = context
    this.pipeline = pipeline
    this.uniformBuffer = uniformBuffer
    this.bindGroup = bindGroup
  }

  static async create(canvas: HTMLCanvasElement): Promise<LineRenderer> {
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
      alphaMode: 'opaque',
    })

    const shaderModule = device.createShaderModule({
      code: lineShader,
    })

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'uniform' },
        },
      ],
    })

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    })

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 24, // 6 floats * 4 bytes
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' }, // color
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
      primitive: {
        topology: 'line-list',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    })

    // Uniform buffer: mat4x4f (64 bytes) + vec2f (8 bytes) + padding (8 bytes) = 80 bytes
    const uniformBuffer = device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
      ],
    })

    return new LineRenderer(device, context, pipeline, uniformBuffer, bindGroup)
  }

  private ensureDepthTexture(width: number, height: number): void {
    if (this.lastWidth === width && this.lastHeight === height && this.depthTexture) {
      return
    }

    if (this.depthTexture) {
      this.depthTexture.destroy()
    }

    this.depthTexture = this.device.createTexture({
      size: { width, height },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    this.depthTextureView = this.depthTexture.createView()
    this.lastWidth = width
    this.lastHeight = height
  }

  render(scene: LineScene, camera: Camera): void {
    const { lines, backgroundColor } = scene

    // Get canvas size
    const canvas = this.context.canvas as HTMLCanvasElement
    const width = canvas.width
    const height = canvas.height

    // Build MVP matrix
    const view = buildViewMatrix(camera.position, camera.lookAt, camera.up)
    let projection: Float32Array
    if (camera.type === 'perspective') {
      projection = buildPerspectiveMatrix(camera.fov, camera.aspectRatio, 0.1, 100)
    } else {
      projection = buildOrthographicMatrix(camera.width, camera.height, -100, 100)
    }
    const mvp = multiplyMat4(projection, view)

    // Write uniforms
    const uniformData = new Float32Array(20) // 16 (mvp) + 2 (resolution) + 2 (padding)
    uniformData.set(mvp, 0)
    uniformData[16] = width
    uniformData[17] = height
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData)

    // Build vertex buffer
    const vertexCount = lines.segments.length * 2
    const vertexData = new Float32Array(vertexCount * 6) // position(3) + color(3)

    let offset = 0
    for (const seg of lines.segments) {
      // Start vertex
      vertexData[offset++] = seg.start.x
      vertexData[offset++] = seg.start.y
      vertexData[offset++] = seg.start.z
      vertexData[offset++] = seg.startColor.r
      vertexData[offset++] = seg.startColor.g
      vertexData[offset++] = seg.startColor.b
      // End vertex
      vertexData[offset++] = seg.end.x
      vertexData[offset++] = seg.end.y
      vertexData[offset++] = seg.end.z
      vertexData[offset++] = seg.endColor.r
      vertexData[offset++] = seg.endColor.g
      vertexData[offset++] = seg.endColor.b
    }

    const vertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(vertexBuffer, 0, vertexData)

    // Ensure depth texture
    this.ensureDepthTexture(width, height)

    // Render
    const commandEncoder = this.device.createCommandEncoder()
    const textureView = this.context.getCurrentTexture().createView()

    const bg = backgroundColor ?? { r: 0.1, g: 0.1, b: 0.12 }
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: bg.r, g: bg.g, b: bg.b, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTextureView!,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    })

    renderPass.setPipeline(this.pipeline)
    renderPass.setBindGroup(0, this.bindGroup)
    renderPass.setVertexBuffer(0, vertexBuffer)
    renderPass.draw(vertexCount)
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    // Clean up vertex buffer
    vertexBuffer.destroy()
  }

  dispose(): void {
    this.uniformBuffer.destroy()
    this.depthTexture?.destroy()
  }
}
