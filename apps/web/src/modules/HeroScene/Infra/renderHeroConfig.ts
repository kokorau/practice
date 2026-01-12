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
  // Greymap mask shaders (new 2-stage pipeline)
  createCircleGreymapMaskSpec,
  createRectGreymapMaskSpec,
  createBlobGreymapMaskSpec,
  createPerlinGreymapMaskSpec,
  createLinearGradientGreymapMaskSpec,
  createRadialGradientGreymapMaskSpec,
  createBoxGradientGreymapMaskSpec,
  // Colorize shader
  createColorizeSpec,
  type TextureRenderSpec,
  type Viewport,
  type RGBA,
  type GreymapMaskSpec,
} from '@practice/texture'
import {
  // New vignette shape variants
  ellipseVignetteShader,
  createEllipseVignetteUniforms,
  ELLIPSE_VIGNETTE_BUFFER_SIZE,
  circleVignetteShader,
  createCircleVignetteUniforms,
  CIRCLE_VIGNETTE_BUFFER_SIZE,
  rectVignetteShader,
  createRectVignetteUniforms,
  RECT_VIGNETTE_BUFFER_SIZE,
  linearVignetteShader,
  createLinearVignetteUniforms,
  LINEAR_VIGNETTE_BUFFER_SIZE,
  // Other effects
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
  dotHalftoneShader,
  createDotHalftoneUniforms,
  DOT_HALFTONE_BUFFER_SIZE,
  lineHalftoneShader,
  createLineHalftoneUniforms,
  LINE_HALFTONE_BUFFER_SIZE,
  blockMosaicShader,
  createBlockMosaicUniforms,
  BLOCK_MOSAIC_BUFFER_SIZE,
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
  LayerNodeConfig,
  MaskNodeConfig,
  GroupLayerNodeConfig,
} from '../Domain/HeroViewConfig'
import { getLayerFilters, getLayerMaskProcessor } from '../Domain/HeroViewConfig'
import type { LayerEffectConfig, VignetteConfig } from '../Domain/EffectSchema'
import { migrateVignetteConfig } from '../Domain/EffectSchema'

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
  /** Render to offscreen texture for 2-stage pipeline */
  renderToOffscreen(spec: TextureRenderSpec, textureIndex?: 0 | 1): GPUTexture
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

type ContextName = 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'
type PrimitiveKey = string

/**
 * Semantic context to primitive surface key mapping
 * Must match useHeroScene.ts CONTEXT_SURFACE_KEYS
 */
const CONTEXT_SURFACE_KEYS: Record<'light' | 'dark', Record<ContextName, PrimitiveKey>> = {
  light: {
    canvas: 'F1',
    sectionNeutral: 'F2',
    sectionTint: 'Bt',
    sectionContrast: 'Bf',
  },
  dark: {
    canvas: 'F8',
    sectionNeutral: 'F7',
    sectionTint: 'Bs',
    sectionContrast: 'Bf',
  },
}

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
function getColorFromPalette(palette: PrimitivePalette, key: string, alpha = 1): RGBA {
  const oklch = (palette as Record<string, Oklch>)[key]
  if (oklch) {
    return oklchToRgba(oklch, alpha)
  }
  return [0.5, 0.5, 0.5, alpha]
}

/**
 * Get Oklch from palette by key
 */
function getOklchFromPalette(palette: PrimitivePalette, key: string): Oklch {
  const oklch = (palette as Record<string, Oklch>)[key]
  return oklch ?? { L: 0.5, C: 0, H: 0 }
}

/**
 * Determine if palette represents dark theme
 */
function isDarkTheme(palette: PrimitivePalette): boolean {
  const f0 = getOklchFromPalette(palette, 'F0')
  return f0.L < 0.5
}

/**
 * Get mask surface key based on semantic context and theme
 */
function getMaskSurfaceKey(semanticContext: string, isDark: boolean): PrimitiveKey {
  const mode = isDark ? 'dark' : 'light'
  const context = (semanticContext as ContextName) || 'canvas'
  return CONTEXT_SURFACE_KEYS[mode][context] ?? CONTEXT_SURFACE_KEYS[mode].canvas
}

/**
 * Calculate midground texture color (auto-shifted from surface)
 * Must match useHeroScene.ts midgroundTextureColor1 logic
 */
function getMidgroundTextureColor(
  palette: PrimitivePalette,
  maskPrimaryKey: string,
  maskSurfaceKey: string,
  isDark: boolean
): RGBA {
  if (maskPrimaryKey !== 'auto') {
    return getColorFromPalette(palette, maskPrimaryKey)
  }
  // Auto: shift lightness from mask surface
  const surface = getOklchFromPalette(palette, maskSurfaceKey)
  const deltaL = isDark ? 0.05 : -0.05
  const shifted: Oklch = { L: surface.L + deltaL, C: surface.C, H: surface.H }
  return oklchToRgba(shifted)
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
// Mask Spec Creation (Greymap-based 2-stage pipeline)
// ============================================================

/**
 * Create greymap mask spec from mask config
 * Outputs grayscale values (0.0-1.0) instead of RGBA
 */
function createGreymapMaskSpecFromShape(
  shape: MaskShapeConfig,
  viewport: Viewport
): GreymapMaskSpec | null {
  const cutout = shape.cutout ?? false
  // Greymap values: innerValue=0 (transparent/cutout), outerValue=1 (opaque/keep)
  const innerValue = 0.0
  const outerValue = 1.0

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

/**
 * Render mask using 2-stage greymap pipeline
 * Stage 1: Render greymap to offscreen texture
 * Stage 2: Apply colorize shader to convert to final RGBA
 */
function renderMaskWithGreymapPipeline(
  renderer: TextureRendererLike,
  greymapSpec: GreymapMaskSpec,
  maskColor: RGBA,
  viewport: Viewport
): void {
  // Stage 1: Render greymap to offscreen texture
  const greymapTexture = renderer.renderToOffscreen(
    {
      shader: greymapSpec.shader,
      uniforms: greymapSpec.uniforms,
      bufferSize: greymapSpec.bufferSize,
    },
    0
  )

  // Stage 2: Apply colorize shader to convert greymap to final RGBA
  // keepColor = maskColor (where greymap is white/1.0)
  // cutoutColor = transparent (where greymap is black/0.0)
  const colorizeSpec = createColorizeSpec(
    {
      keepColor: maskColor,
      cutoutColor: [0, 0, 0, 0], // Transparent for cutout areas
      alphaMode: 0, // Luminance becomes alpha
    },
    viewport
  )

  renderer.applyPostEffect(colorizeSpec, greymapTexture, { clear: false })
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

  // Block Mosaic (requires texture input)
  if (effects.blockMosaic?.enabled) {
    const inputTexture = renderer.copyCanvasToTexture()
    const uniforms = createBlockMosaicUniforms(
      {
        blockSize: scaleValue(effects.blockMosaic.blockSize, scale),
      },
      viewport
    )
    renderer.applyPostEffect(
      { shader: blockMosaicShader, uniforms, bufferSize: BLOCK_MOSAIC_BUFFER_SIZE },
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

  // Vignette (requires texture input, applied last)
  if (effects.vignette?.enabled) {
    const inputTexture = renderer.copyCanvasToTexture()
    const vignetteSpec = createVignetteSpec(effects.vignette, viewport)
    renderer.applyPostEffect(vignetteSpec, inputTexture, { clear: true })
  }
}

/**
 * Create vignette effect specification based on shape type
 */
function createVignetteSpec(
  config: VignetteConfig | { enabled: boolean; intensity: number; radius: number; softness: number },
  viewport: Viewport
): { shader: string; uniforms: ArrayBuffer; bufferSize: number } {
  // Migrate legacy config if needed
  const vignetteConfig = migrateVignetteConfig(config as VignetteConfig)
  const color = vignetteConfig.color ?? [0, 0, 0, 1]

  switch (vignetteConfig.shape) {
    case 'circle':
      return {
        shader: circleVignetteShader,
        uniforms: createCircleVignetteUniforms(
          {
            color,
            intensity: vignetteConfig.intensity,
            radius: vignetteConfig.radius,
            softness: vignetteConfig.softness,
            centerX: vignetteConfig.centerX,
            centerY: vignetteConfig.centerY,
          },
          viewport
        ),
        bufferSize: CIRCLE_VIGNETTE_BUFFER_SIZE,
      }

    case 'rectangle':
      return {
        shader: rectVignetteShader,
        uniforms: createRectVignetteUniforms(
          {
            color,
            intensity: vignetteConfig.intensity,
            softness: vignetteConfig.softness,
            centerX: vignetteConfig.centerX,
            centerY: vignetteConfig.centerY,
            width: vignetteConfig.width,
            height: vignetteConfig.height,
            cornerRadius: vignetteConfig.cornerRadius,
          },
          viewport
        ),
        bufferSize: RECT_VIGNETTE_BUFFER_SIZE,
      }

    case 'linear':
      return {
        shader: linearVignetteShader,
        uniforms: createLinearVignetteUniforms(
          {
            color,
            intensity: vignetteConfig.intensity,
            angle: vignetteConfig.angle,
            startOffset: vignetteConfig.startOffset,
            endOffset: vignetteConfig.endOffset,
          },
          viewport
        ),
        bufferSize: LINEAR_VIGNETTE_BUFFER_SIZE,
      }

    case 'ellipse':
    default:
      return {
        shader: ellipseVignetteShader,
        uniforms: createEllipseVignetteUniforms(
          {
            color,
            intensity: vignetteConfig.intensity,
            radius: vignetteConfig.radius,
            softness: vignetteConfig.softness,
            centerX: vignetteConfig.centerX,
            centerY: vignetteConfig.centerY,
            aspectRatio: vignetteConfig.aspectRatio ?? viewport.width / viewport.height,
          },
          viewport
        ),
        bufferSize: ELLIPSE_VIGNETTE_BUFFER_SIZE,
      }
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
 * Result of finding a surface layer with its context
 */
interface SurfaceLayerResult {
  surfaceLayer: SurfaceLayerNodeConfig
  /** Parent group containing this surface (for Figma-style mask lookup) */
  parentGroup: GroupLayerNodeConfig | null
}

/**
 * Find surface layer from layers array (may be nested in group)
 * Returns both the surface and its parent group for mask lookup
 */
function findSurfaceLayer(layers: LayerNodeConfig[]): SurfaceLayerResult | null {
  for (const layer of layers) {
    if (layer.type === 'surface') {
      return { surfaceLayer: layer, parentGroup: null }
    }
    if (layer.type === 'group' && 'children' in layer && layer.children) {
      const nested = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
      if (nested) {
        return { surfaceLayer: nested, parentGroup: layer }
      }
    }
  }
  return null
}

/**
 * Find MaskNodeConfig from group children (Figma-style)
 * In Figma-style, mask is a sibling node before the masked layers
 */
function findMaskNodeInGroup(group: GroupLayerNodeConfig): MaskNodeConfig | null {
  if (!group.children) return null
  for (const child of group.children) {
    if (child.type === 'mask' && child.visible !== false) {
      return child as MaskNodeConfig
    }
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

  // Determine theme mode from palette
  const isDark = isDarkTheme(palette)

  // Get mask surface key based on semantic context
  const semanticContext = colors.semanticContext ?? 'canvas'
  const maskSurfaceKey = getMaskSurfaceKey(semanticContext, isDark)

  // Resolve background colors from palette
  const bgColor1 = getColorFromPalette(palette, colors.background.primary)
  const canvasSurfaceKey = isDark ? 'F8' : 'F1'
  const bgColor2 = colors.background.secondary === 'auto'
    ? getColorFromPalette(palette, canvasSurfaceKey)
    : getColorFromPalette(palette, colors.background.secondary)

  // Resolve mask colors (matching useHeroScene logic)
  // Note: maskInnerColor is no longer used in greymap pipeline (kept for reference)
  // const maskInnerColor = getColorFromPalette(palette, maskSurfaceKey, 0)
  // midgroundTextureColor1: mask.primary or auto-shifted from surface
  const midgroundTextureColor1 = getMidgroundTextureColor(
    palette,
    colors.mask.primary,
    maskSurfaceKey,
    isDark
  )

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

    // Apply base layer effects (supports both filters and processors)
    const effectFilters = getLayerFilters(baseLayer)
    const effectFilter = effectFilters.find((f) => f.enabled)
    if (effectFilter?.config) {
      applyEffects(renderer, effectFilter.config, viewport, scale)
    }
  }

  // 2. Render surface layer with mask
  const surfaceResult = findSurfaceLayer(config.layers)
  if (surfaceResult) {
    const { surfaceLayer, parentGroup } = surfaceResult

    // Find mask shape - try Figma-style first (MaskNode in group), then legacy (processor)
    let maskShape: MaskShapeConfig | null = null

    // Figma-style: MaskNode as sibling in parent group
    if (parentGroup) {
      const maskNode = findMaskNodeInGroup(parentGroup)
      if (maskNode) {
        maskShape = maskNode.shape
      }
    }

    // Legacy fallback: mask in processors
    if (!maskShape) {
      const maskProcessor = getLayerMaskProcessor(surfaceLayer)
      if (maskProcessor?.enabled) {
        maskShape = maskProcessor.shape
      }
    }

    // Render the mask if found (using 2-stage greymap pipeline)
    if (maskShape) {
      // Create greymap spec (outputs grayscale values)
      const greymapSpec = createGreymapMaskSpecFromShape(maskShape, viewport)
      if (greymapSpec) {
        // Render using 2-stage pipeline:
        // Stage 1: Greymap to offscreen
        // Stage 2: Colorize to final RGBA
        renderMaskWithGreymapPipeline(renderer, greymapSpec, midgroundTextureColor1, viewport)
      }
    }

    // Apply surface layer effects (supports both filters and processors)
    const effectFilters = getLayerFilters(surfaceLayer)
    const effectFilter = effectFilters.find((f) => f.enabled)
    if (effectFilter?.config) {
      applyEffects(renderer, effectFilter.config, viewport, scale)
    }
  }
}
