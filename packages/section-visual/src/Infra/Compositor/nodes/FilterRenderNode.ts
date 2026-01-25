/**
 * FilterRenderNode
 *
 * Applies color adjustment using 1D LUT (Look-Up Table).
 * Supports exposure, brightness, contrast, highlights, shadows, temperature, and tint.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
  CompositorNodeLike,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { isTextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { getTextureFromNode } from '../../../Domain/Compositor'
import type { FilterProcessorConfig } from '../../../Domain/HeroViewConfig'
import type { IntensityProvider } from '../../../Application/resolvers/resolvePropertyValue'
import { resolvePropertyValueToNumber, DEFAULT_INTENSITY_PROVIDER } from '../../../Application/resolvers/resolvePropertyValue'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// LUT Generation (inline to avoid cross-package dependency)
// ============================================================

/**
 * Filter parameters resolved from PropertyValue
 */
interface ResolvedFilterParams {
  exposure: number
  brightness: number
  contrast: number
  highlights: number
  shadows: number
  temperature: number
  tint: number
}

/**
 * Generate 1D LUT for filter adjustment.
 * Returns 3x256 float values for R, G, B channels.
 */
function generateFilterLut(params: ResolvedFilterParams): {
  lutR: Float32Array
  lutG: Float32Array
  lutB: Float32Array
} {
  const lutR = new Float32Array(256)
  const lutG = new Float32Array(256)
  const lutB = new Float32Array(256)

  // Precompute common values
  const exposureMult = Math.pow(2, params.exposure)
  const contrastMid = 0.5
  const contrastScale = 1 + params.contrast

  for (let i = 0; i < 256; i++) {
    const t = i / 255

    // Base value with brightness and exposure
    let r = t
    let g = t
    let b = t

    // 1. Apply exposure (multiply by 2^exposure)
    r *= exposureMult
    g *= exposureMult
    b *= exposureMult

    // 2. Apply brightness (add offset)
    r += params.brightness
    g += params.brightness
    b += params.brightness

    // 3. Apply contrast (scale around midpoint)
    r = (r - contrastMid) * contrastScale + contrastMid
    g = (g - contrastMid) * contrastScale + contrastMid
    b = (b - contrastMid) * contrastScale + contrastMid

    // 4. Apply highlights/shadows (tone curve approximation)
    // Highlights affect bright areas, shadows affect dark areas
    if (t > 0.5) {
      const highlightBlend = (t - 0.5) * 2 // 0-1 for upper half
      r += params.highlights * highlightBlend * 0.5
      g += params.highlights * highlightBlend * 0.5
      b += params.highlights * highlightBlend * 0.5
    } else {
      const shadowBlend = (0.5 - t) * 2 // 0-1 for lower half
      r += params.shadows * shadowBlend * 0.5
      g += params.shadows * shadowBlend * 0.5
      b += params.shadows * shadowBlend * 0.5
    }

    // 5. Apply temperature (warm = +R -B, cool = -R +B)
    r += params.temperature * 0.1
    b -= params.temperature * 0.1

    // 6. Apply tint (magenta = +R +B, green = -R -B with +G)
    r += params.tint * 0.05
    g -= params.tint * 0.1
    b += params.tint * 0.05

    // Clamp to 0-1
    lutR[i] = Math.max(0, Math.min(1, r))
    lutG[i] = Math.max(0, Math.min(1, g))
    lutB[i] = Math.max(0, Math.min(1, b))
  }

  return { lutR, lutG, lutB }
}

/**
 * Check if filter params would produce any visible effect.
 */
function isFilterIdentity(params: ResolvedFilterParams): boolean {
  const threshold = 0.001
  return (
    Math.abs(params.exposure) < threshold &&
    Math.abs(params.brightness) < threshold &&
    Math.abs(params.contrast) < threshold &&
    Math.abs(params.highlights) < threshold &&
    Math.abs(params.shadows) < threshold &&
    Math.abs(params.temperature) < threshold &&
    Math.abs(params.tint) < threshold
  )
}

// ============================================================
// LUT Shader
// ============================================================

/**
 * WGSL shader for 1D LUT color grading.
 * The LUT is passed as uniform arrays (256 floats per channel).
 */
const filterLutShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

// LUT data stored as uniform arrays (256 floats per channel = 3KB)
struct LutData {
  lutR: array<f32, 256>,
  lutG: array<f32, 256>,
  lutB: array<f32, 256>,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> lutData: LutData;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  let color = textureSample(inputTexture, inputSampler, uv);

  // Sample LUT using linear interpolation
  let rIdx = color.r * 255.0;
  let gIdx = color.g * 255.0;
  let bIdx = color.b * 255.0;

  let rLow = u32(floor(rIdx));
  let gLow = u32(floor(gIdx));
  let bLow = u32(floor(bIdx));

  let rHigh = min(rLow + 1u, 255u);
  let gHigh = min(gLow + 1u, 255u);
  let bHigh = min(bLow + 1u, 255u);

  let rFrac = fract(rIdx);
  let gFrac = fract(gIdx);
  let bFrac = fract(bIdx);

  let r = mix(lutData.lutR[rLow], lutData.lutR[rHigh], rFrac);
  let g = mix(lutData.lutG[gLow], lutData.lutG[gHigh], gFrac);
  let b = mix(lutData.lutB[bLow], lutData.lutB[bHigh], bFrac);

  return vec4f(r, g, b, color.a);
}
`

// ============================================================
// FilterRenderNode Implementation
// ============================================================

/**
 * Configuration for FilterRenderNode.
 */
export interface FilterRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Input node providing the texture to apply filter to */
  inputNode: RenderNode | CompositorNodeLike

  /** Filter configuration with PropertyValue params */
  filterConfig: FilterProcessorConfig

  /** Intensity provider for PropertyValue resolution */
  intensityProvider?: IntensityProvider
}

/**
 * Pipeline cache for filter rendering
 */
interface FilterPipelineCache {
  pipeline: GPURenderPipeline
  uniformBuffer: GPUBuffer
  lutBuffer: GPUBuffer
  sampler: GPUSampler
}

/**
 * RenderNode that applies color adjustment using 1D LUT.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-rendering unchanged nodes)
 * - Automatic viewport resize handling
 */
export class FilterRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly inputNode: RenderNode | CompositorNodeLike
  private readonly filterConfig: FilterProcessorConfig
  private readonly intensityProvider: IntensityProvider

  // Pipeline cache (keyed by device)
  private pipelineCache: FilterPipelineCache | null = null
  private cachedDevice: GPUDevice | null = null

  constructor(config: FilterRenderNodeConfig) {
    super()
    this.id = config.id
    this.inputNode = config.inputNode
    this.filterConfig = config.filterConfig
    this.intensityProvider = config.intensityProvider ?? DEFAULT_INTENSITY_PROVIDER
  }

  /**
   * Check if this node or the input node is dirty.
   */
  get isDirty(): boolean {
    if (this._isDirty) return true

    // Check if input is dirty (dirty propagation)
    if (isTextureOwner(this.inputNode) && this.inputNode.isDirty) return true

    return false
  }

  /**
   * Resolve filter params from PropertyValue to numbers.
   */
  private resolveFilterParams(): ResolvedFilterParams {
    const params = this.filterConfig.params
    return {
      exposure: resolvePropertyValueToNumber(params.exposure, this.intensityProvider),
      brightness: resolvePropertyValueToNumber(params.brightness, this.intensityProvider),
      contrast: resolvePropertyValueToNumber(params.contrast, this.intensityProvider),
      highlights: resolvePropertyValueToNumber(params.highlights, this.intensityProvider),
      shadows: resolvePropertyValueToNumber(params.shadows, this.intensityProvider),
      temperature: resolvePropertyValueToNumber(params.temperature, this.intensityProvider),
      tint: resolvePropertyValueToNumber(params.tint, this.intensityProvider),
    }
  }

  /**
   * Get or create the render pipeline for filter effect.
   */
  private getOrCreatePipeline(device: GPUDevice, format: GPUTextureFormat): FilterPipelineCache {
    // Return cached if same device
    if (this.pipelineCache && this.cachedDevice === device) {
      return this.pipelineCache
    }

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: filterLutShader,
    })

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
        {
          binding: 3,
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

    // Create uniform buffer (16 bytes for params)
    const uniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Create LUT buffer (256 * 3 * 4 = 3072 bytes)
    const lutBuffer = device.createBuffer({
      size: 256 * 3 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Create sampler
    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    })

    this.pipelineCache = {
      pipeline,
      uniformBuffer,
      lutBuffer,
      sampler,
    }
    this.cachedDevice = device

    return this.pipelineCache
  }

  /**
   * Apply the filter to the input texture.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device, format } = ctx

    // Ensure texture exists (handles viewport resize and format)
    this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get input texture from the input node
    const inputHandle = getTextureFromNode(this.inputNode, ctx)

    // Resolve filter parameters
    const resolvedParams = this.resolveFilterParams()

    // Check if filter is identity (no effect)
    if (isFilterIdentity(resolvedParams)) {
      // Use passthrough - copy input to output unchanged
      renderer.applyPostEffectToTexture(
        this.createPassthroughSpec(viewport),
        inputHandle._gpuTexture,
        this.outputTexture!
      )
    } else {
      // Generate LUT
      const { lutR, lutG, lutB } = generateFilterLut(resolvedParams)

      // Get or create pipeline
      const cache = this.getOrCreatePipeline(device, format)

      // Update uniform buffer
      const uniformData = new Float32Array([viewport.width, viewport.height, 0, 0])
      device.queue.writeBuffer(cache.uniformBuffer, 0, uniformData)

      // Update LUT buffer (concatenate R, G, B)
      const lutData = new Float32Array(256 * 3)
      lutData.set(lutR, 0)
      lutData.set(lutG, 256)
      lutData.set(lutB, 512)
      device.queue.writeBuffer(cache.lutBuffer, 0, lutData)

      // Create bind group
      const bindGroup = device.createBindGroup({
        layout: cache.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: cache.uniformBuffer } },
          { binding: 1, resource: cache.sampler },
          { binding: 2, resource: inputHandle._gpuTexture.createView() },
          { binding: 3, resource: { buffer: cache.lutBuffer } },
        ],
      })

      // Render
      const commandEncoder = device.createCommandEncoder()
      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.outputTexture!.createView(),
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

      device.queue.submit([commandEncoder.finish()])
    }

    // Mark as clean (cache valid)
    this._isDirty = false

    return this.createTextureHandle(viewport)
  }

  /**
   * Create a TextureHandle for compatibility with legacy code.
   */
  private createTextureHandle(viewport: { width: number; height: number }): TextureHandle {
    return {
      id: `${this.id}-owned`,
      width: viewport.width,
      height: viewport.height,
      _gpuTexture: this.outputTexture!,
      _textureIndex: -1,
    }
  }

  /**
   * Create a passthrough shader spec for copying input to output unchanged.
   */
  private createPassthroughSpec(viewport: { width: number; height: number }): {
    shader: string
    uniforms: ArrayBuffer
    bufferSize: number
  } {
    const passthroughShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  return textureSample(inputTexture, inputSampler, uv);
}
`
    const buffer = new ArrayBuffer(16)
    const view = new Float32Array(buffer)
    view[0] = viewport.width
    view[1] = viewport.height
    view[2] = 0
    view[3] = 0

    return {
      shader: passthroughShader,
      uniforms: buffer,
      bufferSize: 16,
    }
  }

  /**
   * Release GPU resources.
   */
  override dispose(): void {
    super.dispose()
    if (this.pipelineCache) {
      this.pipelineCache.uniformBuffer.destroy()
      this.pipelineCache.lutBuffer.destroy()
      this.pipelineCache = null
      this.cachedDevice = null
    }
  }
}

/**
 * Factory function to create a FilterRenderNode.
 */
export function createFilterRenderNode(
  id: string,
  inputNode: RenderNode | CompositorNodeLike,
  filterConfig: FilterProcessorConfig,
  intensityProvider?: IntensityProvider
): FilterRenderNode {
  return new FilterRenderNode({
    id,
    inputNode,
    filterConfig,
    intensityProvider,
  })
}
