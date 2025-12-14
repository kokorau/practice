/**
 * WebGPU Line Renderer
 * Renders line segments and points with vertex colors using rasterization
 */

import type { LineSegments, Point, Mesh } from '../../Domain/ValueObject'
import type { PerspectiveCamera, OrthographicCamera } from '../../Domain/ValueObject'
import { $Vector3 } from '@practice/vector'
import lineShader from './shaders/line.wgsl?raw'
import pointShader from './shaders/point.wgsl?raw'
import meshShader from './shaders/mesh.wgsl?raw'

type Camera = PerspectiveCamera | OrthographicCamera

export interface LineScene {
  readonly lines: LineSegments
  readonly points?: readonly Point[]
  readonly meshes?: readonly Mesh[]
  readonly backgroundColor?: { r: number; g: number; b: number }
}

export const $LineScene = {
  create: (
    lines: LineSegments,
    backgroundColor?: { r: number; g: number; b: number },
    points?: readonly Point[],
    meshes?: readonly Mesh[]
  ): LineScene => ({
    lines,
    backgroundColor,
    points,
    meshes,
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

  // Line rendering
  private linePipeline: GPURenderPipeline
  private lineUniformBuffer: GPUBuffer
  private lineBindGroup: GPUBindGroup

  // Point rendering
  private pointPipeline: GPURenderPipeline
  private pointUniformBuffer: GPUBuffer
  private pointBindGroup: GPUBindGroup

  // Mesh rendering
  private meshPipeline: GPURenderPipeline
  private meshBindGroupLayout: GPUBindGroupLayout

  private depthTexture: GPUTexture | null = null
  private depthTextureView: GPUTextureView | null = null
  private lastWidth = 0
  private lastHeight = 0

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    linePipeline: GPURenderPipeline,
    lineUniformBuffer: GPUBuffer,
    lineBindGroup: GPUBindGroup,
    pointPipeline: GPURenderPipeline,
    pointUniformBuffer: GPUBuffer,
    pointBindGroup: GPUBindGroup,
    meshPipeline: GPURenderPipeline,
    meshBindGroupLayout: GPUBindGroupLayout
  ) {
    this.device = device
    this.context = context
    this.linePipeline = linePipeline
    this.lineUniformBuffer = lineUniformBuffer
    this.lineBindGroup = lineBindGroup
    this.pointPipeline = pointPipeline
    this.pointUniformBuffer = pointUniformBuffer
    this.pointBindGroup = pointBindGroup
    this.meshPipeline = meshPipeline
    this.meshBindGroupLayout = meshBindGroupLayout
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
      alphaMode: 'premultiplied',
    })

    // === Line Pipeline ===
    const lineShaderModule = device.createShaderModule({
      code: lineShader,
    })

    const lineBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'uniform' },
        },
      ],
    })

    const linePipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [lineBindGroupLayout],
    })

    const linePipeline = device.createRenderPipeline({
      layout: linePipelineLayout,
      vertex: {
        module: lineShaderModule,
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
        module: lineShaderModule,
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

    // Line uniform buffer: mat4x4f (64 bytes) + vec2f (8 bytes) + padding (8 bytes) = 80 bytes
    const lineUniformBuffer = device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const lineBindGroup = device.createBindGroup({
      layout: lineBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: lineUniformBuffer } },
      ],
    })

    // === Point Pipeline ===
    const pointShaderModule = device.createShaderModule({
      code: pointShader,
    })

    const pointBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'uniform' },
        },
      ],
    })

    const pointPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [pointBindGroupLayout],
    })

    const pointPipeline = device.createRenderPipeline({
      layout: pointPipelineLayout,
      vertex: {
        module: pointShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 36, // 9 floats * 4 bytes (position(3) + color(3) + sizeAndCorner(3))
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },   // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' },  // color
              { shaderLocation: 2, offset: 24, format: 'float32x3' },  // sizeAndCorner
            ],
          },
        ],
      },
      fragment: {
        module: pointShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: {
        topology: 'triangle-list',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    })

    // Point uniform buffer: mat4x4f (64 bytes) + cameraRight(12) + pad(4) + cameraUp(12) + pad(4) = 96 bytes
    const pointUniformBuffer = device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const pointBindGroup = device.createBindGroup({
      layout: pointBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: pointUniformBuffer } },
      ],
    })

    // === Mesh Pipeline ===
    const meshShaderModule = device.createShaderModule({
      code: meshShader,
    })

    const meshBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    })

    const meshPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [meshBindGroupLayout],
    })

    const meshPipeline = device.createRenderPipeline({
      layout: meshPipelineLayout,
      vertex: {
        module: meshShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 24, // 6 floats * 4 bytes (position(3) + color(3))
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },   // position
              { shaderLocation: 1, offset: 12, format: 'float32x3' },  // color
            ],
          },
        ],
      },
      fragment: {
        module: meshShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',  // Draw both sides for transparent surfaces
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,  // Don't write depth for transparent objects
        depthCompare: 'less',
      },
    })

    return new LineRenderer(
      device, context,
      linePipeline, lineUniformBuffer, lineBindGroup,
      pointPipeline, pointUniformBuffer, pointBindGroup,
      meshPipeline, meshBindGroupLayout
    )
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
    const { lines, points, meshes, backgroundColor } = scene

    // Get canvas size
    const canvas = this.context.canvas as HTMLCanvasElement
    const width = canvas.width
    const height = canvas.height

    // Build camera vectors
    const forward = $Vector3.normalize($Vector3.sub(camera.lookAt, camera.position))
    const right = $Vector3.normalize($Vector3.cross(forward, camera.up))
    const up = $Vector3.cross(right, forward)

    // Build MVP matrix
    const view = buildViewMatrix(camera.position, camera.lookAt, camera.up)
    let projection: Float32Array
    if (camera.type === 'perspective') {
      projection = buildPerspectiveMatrix(camera.fov, camera.aspectRatio, 0.1, 100)
    } else {
      projection = buildOrthographicMatrix(camera.width, camera.height, -100, 100)
    }
    const mvp = multiplyMat4(projection, view)

    // Write line uniforms
    const lineUniformData = new Float32Array(20) // 16 (mvp) + 2 (resolution) + 2 (padding)
    lineUniformData.set(mvp, 0)
    lineUniformData[16] = width
    lineUniformData[17] = height
    this.device.queue.writeBuffer(this.lineUniformBuffer, 0, lineUniformData)

    // Write point uniforms
    const pointUniformData = new Float32Array(24) // 16 (mvp) + 4 (right + pad) + 4 (up + pad)
    pointUniformData.set(mvp, 0)
    pointUniformData[16] = right.x
    pointUniformData[17] = right.y
    pointUniformData[18] = right.z
    pointUniformData[19] = 0 // padding
    pointUniformData[20] = up.x
    pointUniformData[21] = up.y
    pointUniformData[22] = up.z
    pointUniformData[23] = 0 // padding
    this.device.queue.writeBuffer(this.pointUniformBuffer, 0, pointUniformData)

    // Build line vertex buffer
    const lineVertexCount = lines.segments.length * 2
    const lineVertexData = new Float32Array(lineVertexCount * 6) // position(3) + color(3)

    let offset = 0
    for (const seg of lines.segments) {
      // Start vertex
      lineVertexData[offset++] = seg.start.x
      lineVertexData[offset++] = seg.start.y
      lineVertexData[offset++] = seg.start.z
      lineVertexData[offset++] = seg.startColor.r
      lineVertexData[offset++] = seg.startColor.g
      lineVertexData[offset++] = seg.startColor.b
      // End vertex
      lineVertexData[offset++] = seg.end.x
      lineVertexData[offset++] = seg.end.y
      lineVertexData[offset++] = seg.end.z
      lineVertexData[offset++] = seg.endColor.r
      lineVertexData[offset++] = seg.endColor.g
      lineVertexData[offset++] = seg.endColor.b
    }

    const lineVertexBuffer = this.device.createBuffer({
      size: lineVertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(lineVertexBuffer, 0, lineVertexData)

    // Build point vertex buffer (6 vertices per point for 2 triangles)
    let pointVertexBuffer: GPUBuffer | null = null
    let pointVertexCount = 0

    if (points && points.length > 0) {
      // Quad corners: 2 triangles (6 vertices)
      const corners = [
        [-1, -1], [1, -1], [1, 1],  // Triangle 1
        [-1, -1], [1, 1], [-1, 1],  // Triangle 2
      ]

      pointVertexCount = points.length * 6
      const pointVertexData = new Float32Array(pointVertexCount * 9) // position(3) + color(3) + sizeAndCorner(3)

      let pOffset = 0
      for (const point of points) {
        for (const [cx, cy] of corners) {
          // position
          pointVertexData[pOffset++] = point.position.x
          pointVertexData[pOffset++] = point.position.y
          pointVertexData[pOffset++] = point.position.z
          // color
          pointVertexData[pOffset++] = point.color.r
          pointVertexData[pOffset++] = point.color.g
          pointVertexData[pOffset++] = point.color.b
          // sizeAndCorner
          pointVertexData[pOffset++] = point.size
          pointVertexData[pOffset++] = cx!
          pointVertexData[pOffset++] = cy!
        }
      }

      pointVertexBuffer = this.device.createBuffer({
        size: pointVertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      })
      this.device.queue.writeBuffer(pointVertexBuffer, 0, pointVertexData)
    }

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

    // Draw lines
    renderPass.setPipeline(this.linePipeline)
    renderPass.setBindGroup(0, this.lineBindGroup)
    renderPass.setVertexBuffer(0, lineVertexBuffer)
    renderPass.draw(lineVertexCount)

    // Draw points
    if (pointVertexBuffer && pointVertexCount > 0) {
      renderPass.setPipeline(this.pointPipeline)
      renderPass.setBindGroup(0, this.pointBindGroup)
      renderPass.setVertexBuffer(0, pointVertexBuffer)
      renderPass.draw(pointVertexCount)
    }

    // Draw meshes (transparent, draw last)
    const meshResources: { vertexBuffer: GPUBuffer; indexBuffer: GPUBuffer; uniformBuffer: GPUBuffer; bindGroup: GPUBindGroup; indexCount: number }[] = []
    if (meshes && meshes.length > 0) {
      renderPass.setPipeline(this.meshPipeline)

      for (const mesh of meshes) {
        // Build mesh vertex buffer
        const meshVertexData = new Float32Array(mesh.vertices.length * 6) // position(3) + color(3)
        let mOffset = 0
        for (const v of mesh.vertices) {
          meshVertexData[mOffset++] = v.position.x
          meshVertexData[mOffset++] = v.position.y
          meshVertexData[mOffset++] = v.position.z
          meshVertexData[mOffset++] = v.color.r
          meshVertexData[mOffset++] = v.color.g
          meshVertexData[mOffset++] = v.color.b
        }

        const meshVertexBuffer = this.device.createBuffer({
          size: meshVertexData.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })
        this.device.queue.writeBuffer(meshVertexBuffer, 0, meshVertexData)

        // Build mesh index buffer
        const meshIndexData = new Uint16Array(mesh.indices)
        const meshIndexBuffer = this.device.createBuffer({
          size: meshIndexData.byteLength,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        })
        this.device.queue.writeBuffer(meshIndexBuffer, 0, meshIndexData)

        // Create per-mesh uniform buffer (MVP + opacity)
        // WGSL struct alignment: mat4x4f(64) + f32(4) + implicit padding(12) + vec3f(12) + final padding(4) = 96
        const meshUniformData = new Float32Array(24) // 96 bytes / 4 = 24 floats
        meshUniformData.set(mvp, 0)
        meshUniformData[16] = mesh.opacity
        // indices 17-23 are padding

        const meshUniformBuffer = this.device.createBuffer({
          size: 96, // mat4x4f(64) + f32 with padding to vec3f alignment(16) + vec3f(12) + struct alignment padding(4)
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.device.queue.writeBuffer(meshUniformBuffer, 0, meshUniformData)

        const meshBindGroup = this.device.createBindGroup({
          layout: this.meshBindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: meshUniformBuffer } },
          ],
        })

        // Draw mesh
        renderPass.setBindGroup(0, meshBindGroup)
        renderPass.setVertexBuffer(0, meshVertexBuffer)
        renderPass.setIndexBuffer(meshIndexBuffer, 'uint16')
        renderPass.drawIndexed(mesh.indices.length)

        meshResources.push({
          vertexBuffer: meshVertexBuffer,
          indexBuffer: meshIndexBuffer,
          uniformBuffer: meshUniformBuffer,
          bindGroup: meshBindGroup,
          indexCount: mesh.indices.length,
        })
      }
    }

    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])

    // Clean up vertex buffers
    lineVertexBuffer.destroy()
    pointVertexBuffer?.destroy()
    for (const res of meshResources) {
      res.vertexBuffer.destroy()
      res.indexBuffer.destroy()
      res.uniformBuffer.destroy()
    }
  }

  dispose(): void {
    this.lineUniformBuffer.destroy()
    this.pointUniformBuffer.destroy()
    this.depthTexture?.destroy()
  }
}
