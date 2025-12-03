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
import { eulerToMat3x3f, eulerToMat3x3fInverse } from '../utils/matrix'
import SHADER_CODE from './shaders/raytracing.wgsl?raw'
import type { ScenePlane, SceneBox, SceneCapsule, Scene } from './types'

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

    // Plane buffer: each plane = point(12) + pad(4) + normal(12) + pad(4) + color(12) + pad(4) + size(8) + pad(8) = 64 bytes
    const MAX_PLANES = 32
    const planeBuffer = device.createBuffer({
      size: MAX_PLANES * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Box buffer: each box = center(12) + pad(4) + size(12) + pad(4) + color(12) + radius(4) + rotation(48) + rotationInv(48) = 144 bytes
    const MAX_BOXES = 64
    const boxBuffer = device.createBuffer({
      size: MAX_BOXES * 144,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Light buffer: each light = direction(12) + pad(4) + color(12) + intensity(4) = 32 bytes
    const MAX_LIGHTS = 4
    const lightBuffer = device.createBuffer({
      size: MAX_LIGHTS * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Capsule buffer: each capsule = pointA(12) + pad(4) + pointB(12) + pad(4) + color(12) + radius(4) = 48 bytes
    const MAX_CAPSULES = 128
    const capsuleBuffer = device.createBuffer({
      size: MAX_CAPSULES * 48,
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

    // Build scene uniform buffer
    const sceneData = new Float32Array(36) // 144 bytes / 4 = 36 floats
    let offset = 0

    // Camera (80 bytes = 20 floats)
    sceneData[offset++] = camera.position.x
    sceneData[offset++] = camera.position.y
    sceneData[offset++] = camera.position.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = forward.x
    sceneData[offset++] = forward.y
    sceneData[offset++] = forward.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = right.x
    sceneData[offset++] = right.y
    sceneData[offset++] = right.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = up.x
    sceneData[offset++] = up.y
    sceneData[offset++] = up.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = camera.width
    sceneData[offset++] = camera.height
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = 0 // padding

    // backgroundColor (16 bytes = 4 floats)
    sceneData[offset++] = backgroundColor.r
    sceneData[offset++] = backgroundColor.g
    sceneData[offset++] = backgroundColor.b
    sceneData[offset++] = 0 // padding

    // ambientColor + intensity (16 bytes = 4 floats)
    sceneData[offset++] = ambientLight.color.r
    sceneData[offset++] = ambientLight.color.g
    sceneData[offset++] = ambientLight.color.b
    sceneData[offset++] = ambientLight.intensity

    // shadowBlur + counts (16 bytes = 4 u32/f32)
    const sceneDataView = new DataView(sceneData.buffer)
    sceneDataView.setFloat32(offset * 4, shadowBlur, true)
    offset++
    sceneDataView.setUint32(offset * 4, Math.min(planes.length, this.MAX_PLANES), true)
    offset++
    sceneDataView.setUint32(offset * 4, Math.min(boxes.length, this.MAX_BOXES), true)
    offset++
    sceneDataView.setUint32(
      offset * 4,
      Math.min(directionalLights.length, this.MAX_LIGHTS),
      true
    )
    offset++

    // capsuleCount + padding (16 bytes = 4 u32)
    sceneDataView.setUint32(offset * 4, Math.min(capsules.length, this.MAX_CAPSULES), true)
    offset++
    sceneDataView.setUint32(offset * 4, 0, true) // padding
    offset++
    sceneDataView.setUint32(offset * 4, 0, true) // padding
    offset++
    sceneDataView.setUint32(offset * 4, 0, true) // padding

    this.device.queue.writeBuffer(this.sceneUniformBuffer, 0, sceneData)

    // Build plane buffer (64 bytes per plane)
    const planeCount = Math.min(planes.length, this.MAX_PLANES)
    const planeData = new Float32Array(this.MAX_PLANES * 16) // 64 bytes = 16 floats per plane
    for (let i = 0; i < planeCount; i++) {
      const plane = planes[i]!
      const base = i * 16
      // point
      planeData[base + 0] = plane.geometry.point.x
      planeData[base + 1] = plane.geometry.point.y
      planeData[base + 2] = plane.geometry.point.z
      planeData[base + 3] = 0 // padding
      // normal
      planeData[base + 4] = plane.geometry.normal.x
      planeData[base + 5] = plane.geometry.normal.y
      planeData[base + 6] = plane.geometry.normal.z
      planeData[base + 7] = 0 // padding
      // color
      planeData[base + 8] = plane.color.r
      planeData[base + 9] = plane.color.g
      planeData[base + 10] = plane.color.b
      planeData[base + 11] = 0 // padding
      // size
      planeData[base + 12] = plane.geometry.width ?? -1
      planeData[base + 13] = plane.geometry.height ?? -1
      planeData[base + 14] = 0 // padding
      planeData[base + 15] = 0 // padding
    }
    this.device.queue.writeBuffer(this.planeBuffer, 0, planeData)

    // Build box buffer (144 bytes per box = 36 floats)
    const boxCount = Math.min(boxes.length, this.MAX_BOXES)
    const boxData = new Float32Array(this.MAX_BOXES * 36)
    const identityEuler = { x: 0, y: 0, z: 0 }

    for (let i = 0; i < this.MAX_BOXES; i++) {
      const base = i * 36
      if (i < boxCount) {
        const box = boxes[i]!
        // center
        boxData[base + 0] = box.geometry.center.x
        boxData[base + 1] = box.geometry.center.y
        boxData[base + 2] = box.geometry.center.z
        boxData[base + 3] = 0 // padding
        // size
        boxData[base + 4] = box.geometry.size.x
        boxData[base + 5] = box.geometry.size.y
        boxData[base + 6] = box.geometry.size.z
        boxData[base + 7] = 0 // padding
        // color + radius
        boxData[base + 8] = box.color.r
        boxData[base + 9] = box.color.g
        boxData[base + 10] = box.color.b
        boxData[base + 11] = box.geometry.radius ?? 0
        // rotation matrix (12 floats with padding)
        const euler = box.geometry.rotation ?? identityEuler
        const rotMatrix = eulerToMat3x3f(euler)
        boxData.set(rotMatrix, base + 12)
        // inverse rotation matrix (12 floats with padding)
        const rotMatrixInv = eulerToMat3x3fInverse(euler)
        boxData.set(rotMatrixInv, base + 24)
      } else {
        // Identity matrices for unused boxes
        const identity = eulerToMat3x3f(identityEuler)
        boxData.set(identity, base + 12)
        boxData.set(identity, base + 24)
      }
    }
    this.device.queue.writeBuffer(this.boxBuffer, 0, boxData)

    // Build light buffer (32 bytes per light = 8 floats)
    const lightCount = Math.min(directionalLights.length, this.MAX_LIGHTS)
    const lightData = new Float32Array(this.MAX_LIGHTS * 8)
    for (let i = 0; i < lightCount; i++) {
      const light = directionalLights[i]!
      const base = i * 8
      // Normalize and negate direction (shader expects direction TO the light)
      const dir = $Vector3.normalize(light.direction)
      lightData[base + 0] = -dir.x
      lightData[base + 1] = -dir.y
      lightData[base + 2] = -dir.z
      lightData[base + 3] = 0 // padding
      // color + intensity
      lightData[base + 4] = light.color.r
      lightData[base + 5] = light.color.g
      lightData[base + 6] = light.color.b
      lightData[base + 7] = light.intensity
    }
    this.device.queue.writeBuffer(this.lightBuffer, 0, lightData)

    // Build capsule buffer (48 bytes per capsule = 12 floats)
    const capsuleCount = Math.min(capsules.length, this.MAX_CAPSULES)
    const capsuleData = new Float32Array(this.MAX_CAPSULES * 12)
    for (let i = 0; i < capsuleCount; i++) {
      const capsule = capsules[i]!
      const base = i * 12
      // pointA
      capsuleData[base + 0] = capsule.geometry.pointA.x
      capsuleData[base + 1] = capsule.geometry.pointA.y
      capsuleData[base + 2] = capsule.geometry.pointA.z
      capsuleData[base + 3] = 0 // padding
      // pointB
      capsuleData[base + 4] = capsule.geometry.pointB.x
      capsuleData[base + 5] = capsule.geometry.pointB.y
      capsuleData[base + 6] = capsule.geometry.pointB.z
      capsuleData[base + 7] = 0 // padding
      // color + radius
      capsuleData[base + 8] = capsule.color.r
      capsuleData[base + 9] = capsule.color.g
      capsuleData[base + 10] = capsule.color.b
      capsuleData[base + 11] = capsule.geometry.radius
    }
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
