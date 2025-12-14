/**
 * WebGPU Ray Tracing Renderer
 * GPU でレイトレーシングを行う (WebGPU版)
 */

import type { OrthographicCamera, Scene } from '../../Domain/ValueObject'
import { $Vector3 } from '../../../Vector/Domain/ValueObject'
import { SHADER_CODE } from './shaders'
import {
  buildSceneUniform,
  buildPlaneBuffer,
  buildBoxBuffer,
  buildLightBuffer,
  buildCapsuleBuffer,
  buildSphereBuffer,
  buildGridUniform,
  buildCellBuffer,
  buildObjectIndicesBuffer,
  PLANE_STRIDE,
  BOX_STRIDE,
  LIGHT_STRIDE,
  CAPSULE_STRIDE,
  SPHERE_STRIDE,
  GRID_UNIFORM_SIZE,
  CELL_STRIDE,
} from './buffers'
import type { RenderScene } from './RenderScene'
import { compileScene } from '../../Application/CompileScene'

// Re-export for backward compatibility
export type { ScenePlane, SceneBox, SceneCapsule, SceneSphere, Scene, SceneObject } from './types'
export { $SceneObject, $Scene } from './types'
export type { RenderScene } from './RenderScene'
export { compileScene } from '../../Application/CompileScene'

// Check WebGPU support
export async function isWebGPUSupported(): Promise<boolean> {
  if (!navigator.gpu) {
    return false
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

/** Minimum buffer capacity (must be >= 1 for valid GPU buffer) */
const MIN_CAPACITY = 1
/** Growth factor when resizing buffers */
const GROWTH_FACTOR = 2

export class RayTracingRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private pipeline: GPURenderPipeline
  private bindGroupLayout: GPUBindGroupLayout

  private sceneUniformBuffer: GPUBuffer
  private planeBuffer: GPUBuffer
  private boxBuffer: GPUBuffer
  private lightBuffer: GPUBuffer
  private capsuleBuffer: GPUBuffer
  private sphereBuffer: GPUBuffer
  private gridUniformBuffer: GPUBuffer
  private gridCellBuffer: GPUBuffer
  private gridIndicesBuffer: GPUBuffer

  // Dynamic capacity tracking
  private planeCapacity: number
  private boxCapacity: number
  private lightCapacity: number
  private capsuleCapacity: number
  private sphereCapacity: number
  private gridCellCapacity: number
  private gridIndicesCapacity: number

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bindGroupLayout: GPUBindGroupLayout,
    sceneUniformBuffer: GPUBuffer,
    planeBuffer: GPUBuffer,
    boxBuffer: GPUBuffer,
    lightBuffer: GPUBuffer,
    capsuleBuffer: GPUBuffer,
    sphereBuffer: GPUBuffer,
    gridUniformBuffer: GPUBuffer,
    gridCellBuffer: GPUBuffer,
    gridIndicesBuffer: GPUBuffer,
    planeCapacity: number,
    boxCapacity: number,
    lightCapacity: number,
    capsuleCapacity: number,
    sphereCapacity: number,
    gridCellCapacity: number,
    gridIndicesCapacity: number
  ) {
    this.device = device
    this.context = context
    this.pipeline = pipeline
    this.bindGroupLayout = bindGroupLayout
    this.sceneUniformBuffer = sceneUniformBuffer
    this.planeBuffer = planeBuffer
    this.boxBuffer = boxBuffer
    this.lightBuffer = lightBuffer
    this.capsuleBuffer = capsuleBuffer
    this.sphereBuffer = sphereBuffer
    this.gridUniformBuffer = gridUniformBuffer
    this.gridCellBuffer = gridCellBuffer
    this.gridIndicesBuffer = gridIndicesBuffer
    this.planeCapacity = planeCapacity
    this.boxCapacity = boxCapacity
    this.lightCapacity = lightCapacity
    this.capsuleCapacity = capsuleCapacity
    this.sphereCapacity = sphereCapacity
    this.gridCellCapacity = gridCellCapacity
    this.gridIndicesCapacity = gridIndicesCapacity
  }

  static async create(canvas: HTMLCanvasElement): Promise<RayTracingRenderer> {
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

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: SHADER_CODE,
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
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 6,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 7,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 8,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
      ],
    })

    // Create pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    })

    // Create render pipeline
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    // Scene uniform buffer size calculation:
    // Camera: position(12) + pad(4) + forward(12) + pad(4) + right(12) + pad(4) + up(12) + pad(4) + width(4) + height(4) + pad(8) = 80
    // backgroundColor(12) + pad(4) = 16
    // ambientColor(12) + ambientIntensity(4) = 16
    // shadowBlur(4) + planeCount(4) + boxCount(4) + lightCount(4) = 16
    // capsuleCount(4) + pad(4) + pad(4) + pad(4) = 16
    // Total = 144 bytes
    const sceneUniformBuffer = device.createBuffer({
      size: 144,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Initial capacities (will grow dynamically as needed)
    const initialPlaneCapacity = 8
    const initialBoxCapacity = 16
    const initialLightCapacity = 4
    const initialCapsuleCapacity = 32
    const initialSphereCapacity = 32

    // Plane buffer (64 bytes per plane)
    const planeBuffer = device.createBuffer({
      size: initialPlaneCapacity * PLANE_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Box buffer (144 bytes per box)
    const boxBuffer = device.createBuffer({
      size: initialBoxCapacity * BOX_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Light buffer (32 bytes per light)
    const lightBuffer = device.createBuffer({
      size: initialLightCapacity * LIGHT_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Capsule buffer (48 bytes per capsule)
    const capsuleBuffer = device.createBuffer({
      size: initialCapsuleCapacity * CAPSULE_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Sphere buffer (32 bytes per sphere)
    const sphereBuffer = device.createBuffer({
      size: initialSphereCapacity * SPHERE_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Grid uniform buffer (32 bytes)
    const gridUniformBuffer = device.createBuffer({
      size: GRID_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Initial grid capacities
    const initialGridCellCapacity = 64 // 8x8 grid
    const initialGridIndicesCapacity = 256

    // Grid cell buffer
    const gridCellBuffer = device.createBuffer({
      size: initialGridCellCapacity * CELL_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Grid indices buffer
    const gridIndicesBuffer = device.createBuffer({
      size: initialGridIndicesCapacity * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    return new RayTracingRenderer(
      device,
      context,
      pipeline,
      bindGroupLayout,
      sceneUniformBuffer,
      planeBuffer,
      boxBuffer,
      lightBuffer,
      capsuleBuffer,
      sphereBuffer,
      gridUniformBuffer,
      gridCellBuffer,
      gridIndicesBuffer,
      initialPlaneCapacity,
      initialBoxCapacity,
      initialLightCapacity,
      initialCapsuleCapacity,
      initialSphereCapacity,
      initialGridCellCapacity,
      initialGridIndicesCapacity
    )
  }

  /**
   * Ensure buffer has sufficient capacity, resizing if needed
   */
  private ensureBufferCapacity(
    currentBuffer: GPUBuffer,
    currentCapacity: number,
    requiredCount: number,
    strideFloats: number
  ): { buffer: GPUBuffer; capacity: number } {
    if (requiredCount <= currentCapacity) {
      return { buffer: currentBuffer, capacity: currentCapacity }
    }

    // Calculate new capacity with growth factor
    let newCapacity = Math.max(currentCapacity, MIN_CAPACITY)
    while (newCapacity < requiredCount) {
      newCapacity *= GROWTH_FACTOR
    }

    // Destroy old buffer and create new one
    currentBuffer.destroy()
    const newBuffer = this.device.createBuffer({
      size: newCapacity * strideFloats * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    return { buffer: newBuffer, capacity: newCapacity }
  }

  /**
   * Render a Scene (convenience method)
   * Compiles the scene internally before rendering.
   * Applies frustum culling to remove objects outside the camera view.
   */
  render(scene: Scene, camera: OrthographicCamera): void {
    const renderScene = compileScene(scene, camera)
    this.renderCompiled(renderScene, camera)
  }

  /**
   * Render a pre-compiled RenderScene
   * Use this for better performance when rendering the same scene multiple times.
   */
  renderCompiled(renderScene: RenderScene, camera: OrthographicCamera): void {
    const {
      planes,
      boxes,
      capsules,
      spheres,
      ambientLight,
      directionalLights,
      backgroundColor,
      shadowBlur,
      boxGrid,
    } = renderScene

    // Ensure buffer capacities (resize if needed)
    const planeCount = Math.max(planes.length, MIN_CAPACITY)
    const boxCount = Math.max(boxes.length, MIN_CAPACITY)
    const lightCount = Math.max(directionalLights.length, MIN_CAPACITY)
    const capsuleCount = Math.max(capsules.length, MIN_CAPACITY)
    const sphereCount = Math.max(spheres.length, MIN_CAPACITY)
    const gridCellCount = Math.max(boxGrid?.cells.length ?? 0, MIN_CAPACITY)
    const gridIndicesCount = Math.max(boxGrid?.objectIndices.length ?? 0, MIN_CAPACITY)

    const planeResult = this.ensureBufferCapacity(
      this.planeBuffer, this.planeCapacity, planeCount, PLANE_STRIDE
    )
    this.planeBuffer = planeResult.buffer
    this.planeCapacity = planeResult.capacity

    const boxResult = this.ensureBufferCapacity(
      this.boxBuffer, this.boxCapacity, boxCount, BOX_STRIDE
    )
    this.boxBuffer = boxResult.buffer
    this.boxCapacity = boxResult.capacity

    const lightResult = this.ensureBufferCapacity(
      this.lightBuffer, this.lightCapacity, lightCount, LIGHT_STRIDE
    )
    this.lightBuffer = lightResult.buffer
    this.lightCapacity = lightResult.capacity

    const capsuleResult = this.ensureBufferCapacity(
      this.capsuleBuffer, this.capsuleCapacity, capsuleCount, CAPSULE_STRIDE
    )
    this.capsuleBuffer = capsuleResult.buffer
    this.capsuleCapacity = capsuleResult.capacity

    const sphereResult = this.ensureBufferCapacity(
      this.sphereBuffer, this.sphereCapacity, sphereCount, SPHERE_STRIDE
    )
    this.sphereBuffer = sphereResult.buffer
    this.sphereCapacity = sphereResult.capacity

    const gridCellResult = this.ensureBufferCapacity(
      this.gridCellBuffer, this.gridCellCapacity, gridCellCount, CELL_STRIDE
    )
    this.gridCellBuffer = gridCellResult.buffer
    this.gridCellCapacity = gridCellResult.capacity

    const gridIndicesResult = this.ensureBufferCapacity(
      this.gridIndicesBuffer, this.gridIndicesCapacity, gridIndicesCount, 1
    )
    this.gridIndicesBuffer = gridIndicesResult.buffer
    this.gridIndicesCapacity = gridIndicesResult.capacity

    // Calculate camera basis vectors
    const forward = $Vector3.normalize($Vector3.sub(camera.lookAt, camera.position))
    const right = $Vector3.normalize($Vector3.cross(camera.up, forward))
    const up = $Vector3.cross(forward, right)

    // Build and write scene uniform buffer
    const sceneData = buildSceneUniform({
      camera: {
        position: camera.position,
        width: camera.width,
        height: camera.height,
      },
      forward,
      right,
      up,
      backgroundColor,
      ambientLight,
      shadowBlur,
      counts: {
        planes: planes.length,
        boxes: boxes.length,
        lights: directionalLights.length,
        capsules: capsules.length,
        spheres: spheres.length,
      },
    })
    this.device.queue.writeBuffer(this.sceneUniformBuffer, 0, sceneData)

    // Build and write plane buffer
    const planeData = buildPlaneBuffer(planes, this.planeCapacity)
    this.device.queue.writeBuffer(this.planeBuffer, 0, planeData)

    // Build and write box buffer
    const boxData = buildBoxBuffer(boxes, this.boxCapacity)
    this.device.queue.writeBuffer(this.boxBuffer, 0, boxData)

    // Build and write light buffer
    const lightData = buildLightBuffer(directionalLights, this.lightCapacity)
    this.device.queue.writeBuffer(this.lightBuffer, 0, lightData)

    // Build and write capsule buffer
    const capsuleData = buildCapsuleBuffer(capsules, this.capsuleCapacity)
    this.device.queue.writeBuffer(this.capsuleBuffer, 0, capsuleData)

    // Build and write sphere buffer
    const sphereData = buildSphereBuffer(spheres, this.sphereCapacity)
    this.device.queue.writeBuffer(this.sphereBuffer, 0, sphereData)

    // Build and write grid buffers
    const gridUniformData = buildGridUniform(boxGrid)
    this.device.queue.writeBuffer(this.gridUniformBuffer, 0, gridUniformData)

    const gridCellData = buildCellBuffer(boxGrid, this.gridCellCapacity)
    this.device.queue.writeBuffer(this.gridCellBuffer, 0, gridCellData)

    const gridIndicesData = buildObjectIndicesBuffer(boxGrid, this.gridIndicesCapacity)
    this.device.queue.writeBuffer(this.gridIndicesBuffer, 0, gridIndicesData)

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.sceneUniformBuffer } },
        { binding: 1, resource: { buffer: this.planeBuffer } },
        { binding: 2, resource: { buffer: this.boxBuffer } },
        { binding: 3, resource: { buffer: this.lightBuffer } },
        { binding: 4, resource: { buffer: this.capsuleBuffer } },
        { binding: 5, resource: { buffer: this.sphereBuffer } },
        { binding: 6, resource: { buffer: this.gridUniformBuffer } },
        { binding: 7, resource: { buffer: this.gridCellBuffer } },
        { binding: 8, resource: { buffer: this.gridIndicesBuffer } },
      ],
    })

    // Render
    const commandEncoder = this.device.createCommandEncoder()
    const textureView = this.context.getCurrentTexture().createView()

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(this.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(6) // 6 vertices for full-screen quad
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  dispose(): void {
    this.sceneUniformBuffer.destroy()
    this.planeBuffer.destroy()
    this.boxBuffer.destroy()
    this.lightBuffer.destroy()
    this.capsuleBuffer.destroy()
    this.sphereBuffer.destroy()
    this.gridUniformBuffer.destroy()
    this.gridCellBuffer.destroy()
    this.gridIndicesBuffer.destroy()
  }
}
