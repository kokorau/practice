/**
 * WebGPU Ray Tracing Renderer
 * GPU でレイトレーシングを行う (WebGPU版)
 */

import type {
  OrthographicCamera,
  AmbientLight,
  DirectionalLight,
} from '../../Domain/ValueObject'
import { $Vector3 } from '../../../Vector/Domain/ValueObject'
import SHADER_CODE from './shaders/raytracing.wgsl?raw'
import type { ScenePlane, SceneBox, SceneCapsule, Scene } from './types'
import {
  buildSceneUniform,
  buildPlaneBuffer,
  buildBoxBuffer,
  buildLightBuffer,
  buildCapsuleBuffer,
  PLANE_STRIDE,
  BOX_STRIDE,
  LIGHT_STRIDE,
  CAPSULE_STRIDE,
} from './buffers'

export type { ScenePlane, SceneBox, SceneCapsule, Scene } from './types'
export { $SceneObject, $Scene } from './types'
export type { SceneObject } from './types'

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

  private readonly MAX_PLANES = 32
  private readonly MAX_BOXES = 64
  private readonly MAX_LIGHTS = 4
  private readonly MAX_CAPSULES = 128

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bindGroupLayout: GPUBindGroupLayout,
    sceneUniformBuffer: GPUBuffer,
    planeBuffer: GPUBuffer,
    boxBuffer: GPUBuffer,
    lightBuffer: GPUBuffer,
    capsuleBuffer: GPUBuffer
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

    // Plane buffer (64 bytes per plane)
    const MAX_PLANES = 32
    const planeBuffer = device.createBuffer({
      size: MAX_PLANES * PLANE_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Box buffer (144 bytes per box)
    const MAX_BOXES = 64
    const boxBuffer = device.createBuffer({
      size: MAX_BOXES * BOX_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Light buffer (32 bytes per light)
    const MAX_LIGHTS = 4
    const lightBuffer = device.createBuffer({
      size: MAX_LIGHTS * LIGHT_STRIDE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Capsule buffer (48 bytes per capsule)
    const MAX_CAPSULES = 128
    const capsuleBuffer = device.createBuffer({
      size: MAX_CAPSULES * CAPSULE_STRIDE * 4,
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
      capsuleBuffer
    )
  }

  render(scene: Scene, camera: OrthographicCamera): void {
    const {
      objects,
      lights,
      backgroundColor = { r: 20 / 255, g: 20 / 255, b: 40 / 255 },
      shadowBlur = 0,
    } = scene

    // Separate objects by type
    const planes = objects.filter((o): o is ScenePlane => o.type === 'plane')
    const boxes = objects.filter((o): o is SceneBox => o.type === 'box')
    const capsules = objects.filter((o): o is SceneCapsule => o.type === 'capsule')

    // Separate lights by type
    const ambientLight = lights.find((l): l is AmbientLight => l.type === 'ambient') ?? {
      type: 'ambient' as const,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
    }
    const directionalLights = lights.filter(
      (l): l is DirectionalLight => l.type === 'directional'
    )

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
        planes: Math.min(planes.length, this.MAX_PLANES),
        boxes: Math.min(boxes.length, this.MAX_BOXES),
        lights: Math.min(directionalLights.length, this.MAX_LIGHTS),
        capsules: Math.min(capsules.length, this.MAX_CAPSULES),
      },
    })
    this.device.queue.writeBuffer(this.sceneUniformBuffer, 0, sceneData)

    // Build and write plane buffer
    const planeData = buildPlaneBuffer(planes, this.MAX_PLANES)
    this.device.queue.writeBuffer(this.planeBuffer, 0, planeData)

    // Build and write box buffer
    const boxData = buildBoxBuffer(boxes, this.MAX_BOXES)
    this.device.queue.writeBuffer(this.boxBuffer, 0, boxData)

    // Build and write light buffer
    const lightData = buildLightBuffer(directionalLights, this.MAX_LIGHTS)
    this.device.queue.writeBuffer(this.lightBuffer, 0, lightData)

    // Build and write capsule buffer
    const capsuleData = buildCapsuleBuffer(capsules, this.MAX_CAPSULES)
    this.device.queue.writeBuffer(this.capsuleBuffer, 0, capsuleData)

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.sceneUniformBuffer } },
        { binding: 1, resource: { buffer: this.planeBuffer } },
        { binding: 2, resource: { buffer: this.boxBuffer } },
        { binding: 3, resource: { buffer: this.lightBuffer } },
        { binding: 4, resource: { buffer: this.capsuleBuffer } },
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
  }
}
