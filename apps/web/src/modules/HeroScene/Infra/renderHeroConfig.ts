/**
 * renderHeroConfig
 *
 * HeroViewConfig + PrimitivePalette からレンダリングを実行する共通関数
 * LayoutPresetSelector と useHeroScene の両方で使用
 */

import {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  // Textile pattern specs
  createTriangleSpec,
  createHexagonSpec,
  createGradientGrainSpec,
  createAsanohaSpec,
  createSeigaihaSpec,
  createWaveSpec,
  createScalesSpec,
  createOgeeSpec,
  createSunburstSpec,
  // Greymap mask shaders (new 2-stage pipeline)
  createCircleGreymapMaskSpec,
  createRectGreymapMaskSpec,
  createBlobGreymapMaskSpec,
  createPerlinGreymapMaskSpec,
  createLinearGradientGreymapMaskSpec,
  createRadialGradientGreymapMaskSpec,
  createBoxGradientGreymapMaskSpec,
  type TextureRenderSpec,
  type Viewport,
  type RGBA,
  type GreymapMaskSpec,
} from '@practice/texture'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '../../SemanticColorPalette/Domain'
import type {
  HeroViewConfig,
  AnySurfaceConfig,
  AnyMaskConfig,
} from '../Domain/HeroViewConfig'
import {
  getSurfaceAsLegacy,
  getMaskAsLegacy,
} from '../Domain/HeroViewConfig'
// Pipeline imports for node-based rendering
import { buildPipeline, executePipeline } from './Compositor'
// Shared color helpers
import { getOklchFromPalette } from '../Domain/ColorHelpers'

// ============================================================
// Types
// ============================================================

/**
 * Minimal interface for texture renderer (subset of TextureRenderer)
 * This allows passing either TextureRenderer class instance or compatible object
 */
export interface TextureRendererLike {
  getViewport(): Viewport
  getDevice(): GPUDevice
  render(spec: TextureRenderSpec, options?: { clear?: boolean }): void
  copyCanvasToTexture(): GPUTexture
  applyPostEffect(
    effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    inputTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void
  /** Render to offscreen texture for multi-buffer pipeline */
  renderToOffscreen(spec: TextureRenderSpec, textureIndex?: number): GPUTexture
  /** Render directly to a provided texture (TextureOwner pattern) */
  renderToTexture(spec: TextureRenderSpec, outputTexture: GPUTexture): void
  /** Apply two-texture effect (surface + mask) */
  applyDualTextureEffect(
    spec: unknown,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void
  /** Apply two-texture effect to offscreen texture */
  applyDualTextureEffectToOffscreen(
    spec: unknown,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTextureIndex: number
  ): GPUTexture
  /** Apply two-texture effect to owned texture (TextureOwner pattern) */
  applyDualTextureEffectToTexture(
    spec: unknown,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTexture: GPUTexture
  ): void
  /** Apply post-effect to offscreen texture */
  applyPostEffectToOffscreen(
    effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    inputTexture: GPUTexture,
    outputTextureIndex: number
  ): GPUTexture
  /** Apply post-effect to owned texture (TextureOwner pattern) */
  applyPostEffectToTexture(
    effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    inputTexture: GPUTexture,
    outputTexture: GPUTexture
  ): void
  /** Apply two-texture effect to owned texture (TextureOwner pattern) */
  applyDualTextureEffectToTexture(
    spec: unknown,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTexture: GPUTexture
  ): void
  /** Composite offscreen texture to canvas with alpha blending */
  compositeToCanvas(inputTexture: GPUTexture, options?: { clear?: boolean }): void
}

export interface RenderHeroConfigOptions {
  /**
   * Parameter scale for preview rendering (default: 1)
   * For thumbnail preview, use ~0.3 to scale texture parameters
   */
  scale?: number
}

// ============================================================
// Color Helpers
// ============================================================

// Note: getOklchFromPalette, isDarkTheme, getMaskSurfaceKey, CONTEXT_SURFACE_KEYS
// are now imported from '../Domain/ColorHelpers'

/**
 * Convert Oklch to RGBA
 */
function oklchToRgba(oklch: Oklch, alpha = 1): RGBA {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

/**
 * Get color from palette by key
 */
export function getColorFromPalette(palette: PrimitivePalette, key: string, alpha = 1): RGBA {
  const oklch = getOklchFromPalette(palette, key)
  if (oklch) {
    return oklchToRgba(oklch, alpha)
  }
  return [0.5, 0.5, 0.5, alpha]
}

// ============================================================
// Surface Spec Creation
// ============================================================

/**
 * Scale a numeric value for preview size
 */
function scaleValue(value: number, scale: number): number {
  return Math.max(1, Math.round(value * scale))
}

/**
 * Create background texture spec from surface config
 * Accepts both legacy SurfaceConfig and normalized NormalizedSurfaceConfig
 */
export function createBackgroundSpecFromSurface(
  surfaceInput: AnySurfaceConfig,
  color1: RGBA,
  color2: RGBA,
  viewport: Viewport,
  scale: number
): TextureRenderSpec | null {
  // Convert to legacy format if normalized
  const surface = getSurfaceAsLegacy(surfaceInput)

  if (surface.type === 'solid') {
    return createSolidSpec({ color: color1 })
  }
  if (surface.type === 'stripe') {
    return createStripeSpec({
      color1,
      color2,
      width1: scaleValue(surface.width1, scale),
      width2: scaleValue(surface.width2, scale),
      angle: surface.angle,
    })
  }
  if (surface.type === 'grid') {
    return createGridSpec({
      lineColor: color1,
      bgColor: color2,
      lineWidth: scaleValue(surface.lineWidth, scale),
      cellSize: scaleValue(surface.cellSize, scale),
    })
  }
  if (surface.type === 'polkaDot') {
    return createPolkaDotSpec({
      dotColor: color1,
      bgColor: color2,
      dotRadius: scaleValue(surface.dotRadius, scale),
      spacing: scaleValue(surface.spacing, scale),
      rowOffset: surface.rowOffset,
    })
  }
  if (surface.type === 'checker') {
    return createCheckerSpec({
      color1,
      color2,
      cellSize: scaleValue(surface.cellSize, scale),
      angle: surface.angle,
    })
  }
  // Textile patterns
  if (surface.type === 'triangle') {
    return createTriangleSpec({
      color1,
      color2,
      size: scaleValue(surface.size, scale),
      angle: surface.angle,
    })
  }
  if (surface.type === 'hexagon') {
    return createHexagonSpec({
      color1,
      color2,
      size: scaleValue(surface.size, scale),
      angle: surface.angle,
    })
  }
  if (surface.type === 'gradientGrain') {
    // GradientGrain uses default curve points for config-based rendering
    const defaultCurvePoints = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1]
    return createGradientGrainSpec(
      {
        depthMapType: surface.depthMapType,
        angle: surface.angle,
        centerX: surface.centerX,
        centerY: surface.centerY,
        radialStartAngle: surface.radialStartAngle,
        radialSweepAngle: surface.radialSweepAngle,
        perlinScale: surface.perlinScale,
        perlinOctaves: surface.perlinOctaves,
        perlinContrast: surface.perlinContrast,
        perlinOffset: surface.perlinOffset,
        colorA: color1,
        colorB: color2,
        seed: surface.seed,
        sparsity: surface.sparsity,
        curvePoints: defaultCurvePoints,
      },
      viewport
    )
  }
  if (surface.type === 'asanoha') {
    return createAsanohaSpec({
      size: scaleValue(surface.size, scale),
      lineWidth: scaleValue(surface.lineWidth, scale),
      lineColor: color1,
      bgColor: color2,
    })
  }
  if (surface.type === 'seigaiha') {
    return createSeigaihaSpec({
      radius: scaleValue(surface.radius, scale),
      rings: surface.rings,
      lineWidth: scaleValue(surface.lineWidth, scale),
      lineColor: color1,
      bgColor: color2,
    })
  }
  if (surface.type === 'wave') {
    return createWaveSpec({
      amplitude: scaleValue(surface.amplitude, scale),
      wavelength: scaleValue(surface.wavelength, scale),
      thickness: scaleValue(surface.thickness, scale),
      angle: surface.angle,
      color1,
      color2,
    })
  }
  if (surface.type === 'scales') {
    return createScalesSpec({
      size: scaleValue(surface.size, scale),
      overlap: surface.overlap,
      angle: surface.angle,
      color1,
      color2,
    })
  }
  if (surface.type === 'ogee') {
    return createOgeeSpec({
      width: scaleValue(surface.width, scale),
      height: scaleValue(surface.height, scale),
      lineWidth: scaleValue(surface.lineWidth, scale),
      lineColor: color1,
      bgColor: color2,
    })
  }
  if (surface.type === 'sunburst') {
    return createSunburstSpec({
      rays: surface.rays,
      centerX: surface.centerX,
      centerY: surface.centerY,
      twist: surface.twist,
      color1,
      color2,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    })
  }
  // image type is not supported in config-based rendering
  return createSolidSpec({ color: color1 })
}

// ============================================================
// Mask Spec Creation (Greymap-based 2-stage pipeline)
// ============================================================

/**
 * Create greymap mask spec from mask config
 * Outputs grayscale values (0.0-1.0) instead of RGBA
 * Accepts both legacy MaskShapeConfig and normalized NormalizedMaskConfig
 */
export function createGreymapMaskSpecFromShape(
  shapeInput: AnyMaskConfig,
  viewport: Viewport
): GreymapMaskSpec | null {
  // Convert to legacy format if normalized
  const shape = getMaskAsLegacy(shapeInput)
  const cutout = shape.cutout ?? false
  // Greymap values for colorize shader:
  // - innerValue = 0.0 → transparent → preserves canvas content inside mask
  // - outerValue = 1.0 → opaque keepColor → replaces outside mask
  // This keeps the surface texture visible inside the mask shape,
  // and shows solid maskColor outside (covering the background).
  // Note: cutout flag would invert this behavior to create holes.
  const innerValue = cutout ? 1.0 : 0.0
  const outerValue = cutout ? 0.0 : 1.0

  if (shape.type === 'circle') {
    return createCircleGreymapMaskSpec(
      {
        centerX: shape.centerX,
        centerY: shape.centerY,
        radius: shape.radius,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'rect') {
    return createRectGreymapMaskSpec(
      {
        left: shape.left,
        right: shape.right,
        top: shape.top,
        bottom: shape.bottom,
        radiusTopLeft: shape.radiusTopLeft,
        radiusTopRight: shape.radiusTopRight,
        radiusBottomLeft: shape.radiusBottomLeft,
        radiusBottomRight: shape.radiusBottomRight,
        rotation: shape.rotation,
        perspectiveX: shape.perspectiveX,
        perspectiveY: shape.perspectiveY,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'blob') {
    return createBlobGreymapMaskSpec(
      {
        centerX: shape.centerX,
        centerY: shape.centerY,
        baseRadius: shape.baseRadius,
        amplitude: shape.amplitude,
        octaves: shape.octaves,
        seed: shape.seed,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'perlin') {
    return createPerlinGreymapMaskSpec(
      {
        seed: shape.seed,
        threshold: shape.threshold,
        scale: shape.scale,
        octaves: shape.octaves,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'linearGradient') {
    return createLinearGradientGreymapMaskSpec(
      {
        angle: shape.angle,
        startOffset: shape.startOffset,
        endOffset: shape.endOffset,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'radialGradient') {
    return createRadialGradientGreymapMaskSpec(
      {
        centerX: shape.centerX,
        centerY: shape.centerY,
        innerRadius: shape.innerRadius,
        outerRadius: shape.outerRadius,
        aspectRatio: shape.aspectRatio,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'boxGradient') {
    return createBoxGradientGreymapMaskSpec(
      {
        left: shape.left,
        right: shape.right,
        top: shape.top,
        bottom: shape.bottom,
        cornerRadius: shape.cornerRadius,
        curve: shape.curve,
        innerValue,
        outerValue,
        cutout,
      },
      viewport
    )
  }
  return null
}

// ============================================================
// Main Render Function
// ============================================================

/**
 * Render HeroViewConfig to canvas using provided renderer and palette
 *
 * Uses the node-based compositor pipeline for all rendering.
 *
 * @param renderer - TextureRenderer instance or compatible object
 * @param config - HeroViewConfig to render
 * @param palette - PrimitivePalette for color resolution
 * @param options - Rendering options (scale for preview)
 */
export async function renderHeroConfig(
  renderer: TextureRendererLike,
  config: HeroViewConfig,
  palette: PrimitivePalette,
  options?: RenderHeroConfigOptions
): Promise<void> {
  const scale = options?.scale ?? 1
  const { outputNode } = buildPipeline(config, palette)
  executePipeline(outputNode, renderer, palette, { scale })
}
