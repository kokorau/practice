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
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
  createPerlinMaskSpec,
  type TextureRenderSpec,
  type Viewport,
  type RGBA,
} from '@practice/texture'
import {
  createVignetteSpec,
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  dotHalftoneShader,
  createDotHalftoneUniforms,
  DOT_HALFTONE_BUFFER_SIZE,
  lineHalftoneShader,
  createLineHalftoneUniforms,
  LINE_HALFTONE_BUFFER_SIZE,
} from '@practice/texture/filters'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '../../SemanticColorPalette/Domain'
import type {
  HeroViewConfig,
  SurfaceConfig,
  MaskShapeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  EffectProcessorConfig,
  LayerNodeConfig,
} from '../Domain/HeroViewConfig'
import type { LayerEffectConfig } from '../Domain/EffectSchema'

// ============================================================
// Types
// ============================================================

/**
 * Minimal interface for texture renderer (subset of TextureRenderer)
 * This allows passing either TextureRenderer class instance or compatible object
 */
export interface TextureRendererLike {
  getViewport(): Viewport
  render(spec: TextureRenderSpec, options?: { clear?: boolean }): void
  copyCanvasToTexture(): GPUTexture
  applyPostEffect(
    effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    inputTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void
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
function getColorFromPalette(palette: PrimitivePalette, key: string): RGBA {
  const oklch = (palette as Record<string, Oklch>)[key]
  if (oklch) {
    return oklchToRgba(oklch)
  }
  return [0.5, 0.5, 0.5, 1]
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
 */
function createBackgroundSpecFromSurface(
  surface: SurfaceConfig,
  color1: RGBA,
  color2: RGBA,
  _viewport: Viewport,
  scale: number
): TextureRenderSpec | null {
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
  // image type is not supported in config-based rendering
  return createSolidSpec({ color: color1 })
}

// ============================================================
// Mask Spec Creation
// ============================================================

/**
 * Create mask shape spec from mask config
 */
function createMaskSpecFromShape(
  shape: MaskShapeConfig,
  innerColor: RGBA,
  outerColor: RGBA,
  viewport: Viewport
): TextureRenderSpec | null {
  const cutout = shape.cutout ?? false

  if (shape.type === 'circle') {
    return createCircleMaskSpec(
      {
        centerX: shape.centerX,
        centerY: shape.centerY,
        radius: shape.radius,
        innerColor,
        outerColor,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'rect') {
    return createRectMaskSpec(
      {
        left: shape.left,
        right: shape.right,
        top: shape.top,
        bottom: shape.bottom,
        radiusTopLeft: shape.radiusTopLeft,
        radiusTopRight: shape.radiusTopRight,
        radiusBottomLeft: shape.radiusBottomLeft,
        radiusBottomRight: shape.radiusBottomRight,
        innerColor,
        outerColor,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'blob') {
    return createBlobMaskSpec(
      {
        centerX: shape.centerX,
        centerY: shape.centerY,
        baseRadius: shape.baseRadius,
        amplitude: shape.amplitude,
        frequency: 0,
        octaves: shape.octaves,
        seed: shape.seed,
        innerColor,
        outerColor,
        cutout,
      },
      viewport
    )
  }
  if (shape.type === 'perlin') {
    return createPerlinMaskSpec(
      {
        seed: shape.seed,
        threshold: shape.threshold,
        scale: shape.scale,
        octaves: shape.octaves,
        innerColor,
        outerColor,
      },
      viewport
    )
  }
  return null
}

// ============================================================
// Effect Application
// ============================================================

/**
 * Apply effect filters to current canvas content
 */
function applyEffects(
  renderer: TextureRendererLike,
  effects: LayerEffectConfig,
  viewport: Viewport,
  scale: number
): void {
  // Dot Halftone (requires texture input, applied first)
  if (effects.dotHalftone?.enabled) {
    const inputTexture = renderer.copyCanvasToTexture()
    const uniforms = createDotHalftoneUniforms(
      {
        dotSize: scaleValue(effects.dotHalftone.dotSize, scale),
        spacing: scaleValue(effects.dotHalftone.spacing, scale),
        angle: effects.dotHalftone.angle,
      },
      viewport
    )
    renderer.applyPostEffect(
      { shader: dotHalftoneShader, uniforms, bufferSize: DOT_HALFTONE_BUFFER_SIZE },
      inputTexture,
      { clear: true }
    )
  }

  // Line Halftone (requires texture input)
  if (effects.lineHalftone?.enabled) {
    const inputTexture = renderer.copyCanvasToTexture()
    const uniforms = createLineHalftoneUniforms(
      {
        lineWidth: scaleValue(effects.lineHalftone.lineWidth, scale),
        spacing: scaleValue(effects.lineHalftone.spacing, scale),
        angle: effects.lineHalftone.angle,
      },
      viewport
    )
    renderer.applyPostEffect(
      { shader: lineHalftoneShader, uniforms, bufferSize: LINE_HALFTONE_BUFFER_SIZE },
      inputTexture,
      { clear: true }
    )
  }

  // Chromatic Aberration (requires texture input)
  if (effects.chromaticAberration?.enabled) {
    const inputTexture = renderer.copyCanvasToTexture()
    const uniforms = createChromaticAberrationUniforms(
      { intensity: effects.chromaticAberration.intensity, angle: 0 },
      viewport
    )
    renderer.applyPostEffect(
      { shader: chromaticAberrationShader, uniforms, bufferSize: CHROMATIC_ABERRATION_BUFFER_SIZE },
      inputTexture,
      { clear: true }
    )
  }

  // Vignette (overlay, applied last)
  if (effects.vignette?.enabled) {
    const vignetteSpec = createVignetteSpec(
      {
        color: [0, 0, 0, 1],
        intensity: effects.vignette.intensity,
        radius: effects.vignette.radius,
        softness: effects.vignette.softness,
      },
      viewport
    )
    renderer.render(vignetteSpec, { clear: false })
  }
}

// ============================================================
// Layer Finders
// ============================================================

/**
 * Find base layer from layers array
 */
function findBaseLayer(layers: LayerNodeConfig[]): BaseLayerNodeConfig | null {
  for (const layer of layers) {
    if (layer.type === 'base') return layer
  }
  return null
}

/**
 * Find surface layer from layers array (may be nested in group)
 */
function findSurfaceLayer(layers: LayerNodeConfig[]): SurfaceLayerNodeConfig | null {
  for (const layer of layers) {
    if (layer.type === 'surface') return layer
    if (layer.type === 'group' && 'children' in layer && layer.children) {
      const nested = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
      if (nested) return nested
    }
  }
  return null
}

/**
 * Find effect processor from processors array
 */
function findEffectProcessor(
  processors: Array<{ type: string }>
): EffectProcessorConfig | null {
  const processor = processors.find((p) => p.type === 'effect')
  if (processor && 'config' in processor) {
    return processor as EffectProcessorConfig
  }
  return null
}

// ============================================================
// Main Render Function
// ============================================================

/**
 * Render HeroViewConfig to canvas using provided renderer and palette
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
  const viewport = renderer.getViewport()
  const colors = config.colors

  // Resolve colors from palette
  const bgColor1 = getColorFromPalette(palette, colors.background.primary)
  const bgColor2 = colors.background.secondary === 'auto'
    ? getColorFromPalette(palette, 'F2') // canvas surface fallback
    : getColorFromPalette(palette, colors.background.secondary)

  const maskColor1 = colors.mask.primary === 'auto'
    ? getColorFromPalette(palette, 'BN2')
    : getColorFromPalette(palette, colors.mask.primary)

  // 1. Render background (base layer)
  const baseLayer = findBaseLayer(config.layers)
  if (baseLayer) {
    const bgSpec = createBackgroundSpecFromSurface(
      baseLayer.surface,
      bgColor1,
      bgColor2,
      viewport,
      scale
    )
    if (bgSpec) {
      renderer.render(bgSpec, { clear: true })
    }

    // Apply base layer effects
    const effectProcessor = findEffectProcessor(baseLayer.processors)
    if (effectProcessor?.enabled && effectProcessor.config) {
      applyEffects(renderer, effectProcessor.config, viewport, scale)
    }
  }

  // 2. Render surface layer with mask
  const surfaceLayer = findSurfaceLayer(config.layers)
  if (surfaceLayer) {
    // Find mask processor
    const maskProcessor = surfaceLayer.processors.find((p) => p.type === 'mask')
    if (maskProcessor && 'shape' in maskProcessor) {
      const shape = maskProcessor.shape as MaskShapeConfig
      const cutout = shape.cutout ?? false

      // Determine inner/outer colors based on cutout mode
      // cutout = true: inner = mask color (filled shape), outer = bg color
      // cutout = false: inner = bg color (background shows), outer = mask color (frame)
      const innerColor = cutout ? maskColor1 : bgColor1
      const outerColor = cutout ? bgColor1 : maskColor1

      const maskSpec = createMaskSpecFromShape(shape, innerColor, outerColor, viewport)
      if (maskSpec) {
        renderer.render(maskSpec, { clear: false })
      }
    }

    // Apply surface layer effects
    const effectProcessor = findEffectProcessor(surfaceLayer.processors)
    if (effectProcessor?.enabled && effectProcessor.config) {
      applyEffects(renderer, effectProcessor.config, viewport, scale)
    }
  }
}
