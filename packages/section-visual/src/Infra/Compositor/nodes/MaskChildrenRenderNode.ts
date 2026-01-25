/**
 * MaskChildrenRenderNode
 *
 * Renders children layers to a black background, then converts to luminance greymap.
 * This creates a mask where:
 * - White areas (high luminance) = visible
 * - Black areas (low luminance) = transparent
 *
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import { createOverlayBlendSpec } from '@practice/texture'
import type {
  RenderNode,
  CompositorNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { isTextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { getTextureFromNode } from '../../../Domain/Compositor'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// Luminance Conversion Shader
// ============================================================

/**
 * WGSL shader that converts RGBA to luminance greyscale.
 * Uses ITU-R BT.709 coefficients for perceptually correct luminance.
 *
 * The conversion formula is:
 * Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
 *
 * Alpha is taken into account: transparent areas become black (low luminance).
 */
const luminanceShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  invert: f32,
  _padding: f32,
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
  let color = textureSample(inputTexture, inputSampler, uv);

  // ITU-R BT.709 luminance coefficients
  // Account for alpha: premultiply RGB before conversion
  // transparent areas will have RGB = 0 (black background assumption)
  let rgb = color.rgb * color.a;
  let luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

  // Apply invert if needed
  var value = luminance;
  if (params.invert > 0.5) {
    value = 1.0 - value;
  }

  // Output as greyscale with full alpha
  return vec4f(value, value, value, 1.0);
}
`

// ============================================================
// Black Fill Shader
// ============================================================

/**
 * Shader that fills the texture with solid black.
 * Uses params for bind group compatibility with TextureRenderer.
 */
const blackFillShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

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
  // Use params to ensure binding is included in layout (prevent empty bind group)
  let unused = params.viewportWidth * 0.0;
  return vec4f(unused, 0.0, 0.0, 1.0);
}
`

// ============================================================
// White Fill Shader (for fallback when no children)
// ============================================================

/**
 * Shader that fills the texture with solid white.
 * Used as fallback when children array is empty (no clipping).
 * Uses params for bind group compatibility with TextureRenderer.
 */
const whiteFillShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

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
  // Use params to ensure binding is included in layout (prevent empty bind group)
  let unused = params.viewportWidth * 0.0;
  return vec4f(1.0 + unused, 1.0, 1.0, 1.0);
}
`

// ============================================================
// MaskChildrenRenderNode Implementation
// ============================================================

/**
 * Configuration for MaskChildrenRenderNode.
 */
export interface MaskChildrenRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Child nodes to render as mask source */
  children: ReadonlyArray<RenderNode | CompositorNode>

  /** Whether to invert the mask (0 = no invert, 1 = invert) */
  invert?: boolean
}

/**
 * RenderNode that renders children layers to a luminance greymap for masking.
 *
 * Process:
 * 1. Render children on black background (RGBA composite)
 * 2. Convert to luminance (ITU-R BT.709)
 * 3. Optional: Apply invert
 *
 * Fallback:
 * - If children is empty, output white plane (no clipping)
 *
 * The output is a greymap texture where:
 * - 1.0 (white) = fully visible
 * - 0.0 (black) = fully transparent
 *
 * @example
 * ```typescript
 * const childNode1 = new SurfaceRenderNode(...)
 * const childNode2 = new TextRenderNode(...)
 *
 * const maskNode = new MaskChildrenRenderNode({
 *   id: 'my-mask',
 *   children: [childNode1, childNode2],
 *   invert: false
 * })
 *
 * maskNode.render(context) // Renders children to luminance greymap
 * const texture = maskNode.outputTexture // Get the mask texture
 * ```
 */
export class MaskChildrenRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly children: ReadonlyArray<RenderNode | CompositorNode>
  private readonly invert: boolean

  // Intermediate texture for compositing children before luminance conversion
  private compositeTexture: GPUTexture | null = null

  constructor(config: MaskChildrenRenderNodeConfig) {
    super()
    this.id = config.id
    this.children = config.children
    this.invert = config.invert ?? false
  }

  /**
   * Check if this node or any child is dirty.
   */
  get isDirty(): boolean {
    if (this._isDirty) return true

    // Check if any child is dirty
    for (const child of this.children) {
      if (isTextureOwner(child) && child.isDirty) return true
    }

    return false
  }

  /**
   * Render children to luminance greymap.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device, format } = ctx

    // Ensure output texture exists
    this.ensureTexture(device, viewport, format)

    // Skip if not dirty
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Fallback: If no children, output white plane (no clipping)
    if (this.children.length === 0) {
      this.renderWhiteFallback(renderer, viewport)
      this._isDirty = false
      return this.createTextureHandle(viewport)
    }

    // Ensure composite texture exists
    this.ensureCompositeTexture(device, viewport, format)

    // Step 1: Fill composite texture with black
    this.fillWithBlack(renderer, viewport)

    // Step 2: Composite children on top of black background
    this.compositeChildren(ctx)

    // Step 3: Convert to luminance and write to output texture
    this.convertToLuminance(renderer, viewport)

    // Mark as clean
    this._isDirty = false

    return this.createTextureHandle(viewport)
  }

  /**
   * Ensure the intermediate composite texture exists and matches viewport.
   */
  private ensureCompositeTexture(
    device: GPUDevice,
    viewport: { width: number; height: number },
    format: GPUTextureFormat
  ): void {
    if (
      !this.compositeTexture ||
      this.compositeTexture.width !== viewport.width ||
      this.compositeTexture.height !== viewport.height
    ) {
      if (this.compositeTexture) {
        this.compositeTexture.destroy()
      }

      this.compositeTexture = device.createTexture({
        size: { width: viewport.width, height: viewport.height },
        format,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.COPY_DST,
        label: `MaskChildrenRenderNode-composite-${this.id}`,
      })
    }
  }

  /**
   * Fill the composite texture with solid black.
   */
  private fillWithBlack(
    renderer: NodeContext['renderer'],
    viewport: { width: number; height: number }
  ): void {
    const spec = this.createFillSpec(blackFillShader, viewport)
    renderer.renderToTexture(spec, this.compositeTexture!)
  }

  /**
   * Render white fallback (no clipping).
   */
  private renderWhiteFallback(
    renderer: NodeContext['renderer'],
    viewport: { width: number; height: number }
  ): void {
    const spec = this.createFillSpec(whiteFillShader, viewport)
    renderer.renderToTexture(spec, this.outputTexture!)
  }

  /**
   * Create a fill shader spec.
   */
  private createFillSpec(
    shader: string,
    viewport: { width: number; height: number }
  ): {
    shader: string
    uniforms: ArrayBuffer
    bufferSize: number
  } {
    const buffer = new ArrayBuffer(16)
    const view = new Float32Array(buffer)
    view[0] = viewport.width
    view[1] = viewport.height
    view[2] = 0 // padding
    view[3] = 0 // padding

    return {
      shader,
      uniforms: buffer,
      bufferSize: 16,
    }
  }

  /**
   * Composite children onto the black background.
   */
  private compositeChildren(ctx: NodeContext): void {
    const { renderer, viewport } = ctx

    // Get overlay blend spec for compositing
    const blendSpec = createOverlayBlendSpec(viewport)

    // Composite each child on top
    for (const child of this.children) {
      const childHandle = getTextureFromNode(child, ctx)

      // Blend child onto composite texture
      const tempResult = renderer.applyDualTextureEffectToOffscreen(
        blendSpec,
        this.compositeTexture!,
        childHandle._gpuTexture,
        0
      )

      // Copy result back to composite texture
      this.copyTexture(renderer, tempResult, this.compositeTexture!, viewport)
    }
  }

  /**
   * Convert composite texture to luminance and write to output.
   */
  private convertToLuminance(
    renderer: NodeContext['renderer'],
    viewport: { width: number; height: number }
  ): void {
    const buffer = new ArrayBuffer(16)
    const view = new Float32Array(buffer)
    view[0] = viewport.width
    view[1] = viewport.height
    view[2] = this.invert ? 1.0 : 0.0
    view[3] = 0 // padding

    const spec = {
      shader: luminanceShader,
      uniforms: buffer,
      bufferSize: 16,
    }

    renderer.applyPostEffectToTexture(
      spec,
      this.compositeTexture!,
      this.outputTexture!
    )
  }

  /**
   * Copy texture using passthrough shader.
   */
  private copyTexture(
    renderer: NodeContext['renderer'],
    source: GPUTexture,
    dest: GPUTexture,
    viewport: { width: number; height: number }
  ): void {
    const passthroughSpec = this.createPassthroughSpec(viewport)
    renderer.applyPostEffectToTexture(passthroughSpec, source, dest)
  }

  /**
   * Create a passthrough shader spec for copying texture.
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
    view[2] = 0 // padding
    view[3] = 0 // padding

    return {
      shader: passthroughShader,
      uniforms: buffer,
      bufferSize: 16,
    }
  }

  /**
   * Create a TextureHandle for compatibility.
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
   * Dispose of resources.
   */
  dispose(): void {
    super.dispose()
    if (this.compositeTexture) {
      this.compositeTexture.destroy()
      this.compositeTexture = null
    }
  }
}

/**
 * Factory function to create a MaskChildrenRenderNode.
 */
export function createMaskChildrenRenderNode(
  id: string,
  children: ReadonlyArray<RenderNode | CompositorNode>,
  invert: boolean = false
): MaskChildrenRenderNode {
  return new MaskChildrenRenderNode({ id, children, invert })
}
