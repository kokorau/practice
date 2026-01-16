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
  // Colorize shader
  createColorizeSpec,
  type TextureRenderSpec,
  type Viewport,
  type RGBA,
  type GreymapMaskSpec,
} from '@practice/texture'
// Note: Shader imports moved to EffectRegistry.ts for centralized effect management
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '../../SemanticColorPalette/Domain'
import type {
  HeroViewConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  GroupLayerNodeConfig,
  LayerNodeConfig,
  ProcessorNodeConfig,
  AnySurfaceConfig,
  AnyMaskConfig,
} from '../Domain/HeroViewConfig'
import {
  getLayerFilters,
  getLayerMaskProcessor,
  isProcessorNodeConfig,
  getProcessorTargetPairsFromConfig,
  getProcessorMask,
  // Normalization helpers (Phase 13)
  getSurfaceAsLegacy,
  getMaskAsLegacy,
} from '../Domain/HeroViewConfig'
import type { LayerEffectConfig } from '../Domain/EffectSchema'
import { EFFECT_REGISTRY, EFFECT_TYPES, type EffectType } from '../Domain/EffectRegistry'
import type { SingleEffectConfig } from '../Domain/HeroViewConfig'
import { getEffectConfigsFromModifiers } from '../Domain/HeroViewConfig'

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
 * Accepts both legacy SurfaceConfig and normalized NormalizedSurfaceConfig
 */
function createBackgroundSpecFromSurface(
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
function createGreymapMaskSpecFromShape(
  shapeInput: AnyMaskConfig,
  viewport: Viewport
): GreymapMaskSpec | null {
  // Convert to legacy format if normalized
  const shape = getMaskAsLegacy(shapeInput)
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
 * Apply effect filters to current canvas content (legacy format)
 * Uses EFFECT_REGISTRY for dynamic effect application
 * @deprecated Use applySingleEffects for new format
 */
function applyEffects(
  renderer: TextureRendererLike,
  effects: LayerEffectConfig,
  viewport: Viewport,
  scale: number
): void {
  // Apply effects in registry order
  for (const effectType of EFFECT_TYPES) {
    const config = effects[effectType]
    if (!config?.enabled) continue

    const definition = EFFECT_REGISTRY[effectType]
    const spec = definition.createShaderSpec(config as never, viewport, scale)
    if (!spec) continue

    const inputTexture = renderer.copyCanvasToTexture()
    renderer.applyPostEffect(spec, inputTexture, { clear: true })
  }
}

/**
 * Apply effects from SingleEffectConfig array (new format)
 *
 * Each effect in the array is applied in order.
 * Uses EFFECT_REGISTRY for shader spec creation.
 */
function applySingleEffects(
  renderer: TextureRendererLike,
  effects: SingleEffectConfig[],
  viewport: Viewport,
  scale: number
): void {
  for (const effect of effects) {
    const effectType = effect.id as EffectType
    if (!(effectType in EFFECT_REGISTRY)) continue

    const definition = EFFECT_REGISTRY[effectType]
    const spec = definition.createShaderSpec(effect.params as never, viewport, scale)
    if (!spec) continue

    const inputTexture = renderer.copyCanvasToTexture()
    renderer.applyPostEffect(spec, inputTexture, { clear: true })
  }
}

// ============================================================
// Unified Effector Application
// ============================================================

/**
 * Effector configuration for unified processing
 */
export interface EffectorConfig {
  /** Mask configuration (transparency-modification) */
  mask?: {
    enabled: boolean
    shape: AnyMaskConfig
  }
  /**
   * Effect configuration (color-modification) - legacy format
   * @deprecated Use effectList instead
   */
  effects?: LayerEffectConfig
  /**
   * Effect configuration (color-modification) - new format
   * Array of SingleEffectConfig for normalized effect handling
   */
  effectList?: SingleEffectConfig[]
}

/**
 * Apply effectors (mask + effects) to current canvas content
 *
 * This is the unified effector pipeline that handles both masks and effects:
 * 1. First apply mask (transparency-modification) - modifies alpha channel
 * 2. Then apply effects (color-modification) - modifies color channels
 *
 * Order matters: masks create transparent regions, then effects are applied
 * to the visible (non-transparent) areas.
 *
 * Supports both legacy format (effects: LayerEffectConfig) and
 * new format (effectList: SingleEffectConfig[]). If both are provided,
 * effectList takes precedence.
 *
 * @param renderer - Texture renderer instance
 * @param config - Effector configuration (mask and/or effects)
 * @param viewport - Render viewport
 * @param maskColor - Color to use for mask (keepColor in greymap pipeline)
 * @param scale - Scale factor for preview rendering
 */
export function applyEffectors(
  renderer: TextureRendererLike,
  config: EffectorConfig,
  viewport: Viewport,
  maskColor: RGBA,
  scale: number
): void {
  // 1. Apply mask first (transparency-modification)
  // Masks define visibility through grayscale values
  if (config.mask?.enabled && config.mask.shape) {
    const greymapSpec = createGreymapMaskSpecFromShape(config.mask.shape, viewport)
    if (greymapSpec) {
      renderMaskWithGreymapPipeline(renderer, greymapSpec, maskColor, viewport)
    }
  }

  // 2. Apply effects (color-modification)
  // Effects modify color/appearance of visible areas
  // New format (effectList) takes precedence over legacy format (effects)
  if (config.effectList && config.effectList.length > 0) {
    applySingleEffects(renderer, config.effectList, viewport, scale)
  } else if (config.effects) {
    applyEffects(renderer, config.effects, viewport, scale)
  }
}

// ============================================================
// Layer Finders
// ============================================================

/**
 * Find base/background layer from layers array
 * Supports both new group-based structure and legacy flat structure
 */
function findBaseLayer(layers: LayerNodeConfig[]): BaseLayerNodeConfig | SurfaceLayerNodeConfig | null {
  // New structure: look inside background-group
  for (const layer of layers) {
    if (layer.type === 'group' && layer.id === 'background-group') {
      const surfaceLayer = (layer as GroupLayerNodeConfig).children.find(
        (c): c is SurfaceLayerNodeConfig => c.type === 'surface' && c.id === 'background'
      )
      if (surfaceLayer) return surfaceLayer
    }
  }

  // Fallback: legacy base layer
  for (const layer of layers) {
    if (layer.type === 'base') return layer
  }
  return null
}

/**
 * Find surface layer from layers array (may be nested in group)
 * Excludes ProcessorNodeConfig from search results
 */
function findSurfaceLayer(layers: LayerNodeConfig[]): SurfaceLayerNodeConfig | null {
  for (const layer of layers) {
    // Skip processor nodes
    if (isProcessorNodeConfig(layer)) continue

    if (layer.type === 'surface') {
      return layer
    }
    if (layer.type === 'group' && 'children' in layer && layer.children) {
      const nested = layer.children.find((c): c is SurfaceLayerNodeConfig =>
        c.type === 'surface' && !isProcessorNodeConfig(c)
      )
      if (nested) {
        return nested
      }
    }
  }
  return null
}

/**
 * Find clip-group and extract its surface and processor layers
 * Returns null if clip-group structure is not found
 */
function findClipGroupContents(layers: LayerNodeConfig[]): {
  surface: SurfaceLayerNodeConfig
  processor: ProcessorNodeConfig | null
} | null {
  // Look for clip-group by ID
  const clipGroup = layers.find(
    (layer): layer is GroupLayerNodeConfig => layer.type === 'group' && layer.id === 'clip-group'
  )
  if (!clipGroup) return null

  // Find surface-mask inside clip-group
  const surface = clipGroup.children.find(
    (c): c is SurfaceLayerNodeConfig => c.type === 'surface' && c.id === 'surface-mask'
  )
  if (!surface) return null

  // Find processor-mask inside clip-group (optional)
  const processor = clipGroup.children.find(
    (c): c is ProcessorNodeConfig => c.type === 'processor' && c.id === 'processor-mask'
  ) ?? null

  return { surface, processor }
}

// ============================================================
// Processor-based Layer Finding (Position-based)
// ============================================================

/**
 * Find all processor-target pairs at root level
 * This enables position-based processor application for rendering
 */
function findProcessorTargetPairs(layers: LayerNodeConfig[]): Array<{
  processor: ProcessorNodeConfig
  targets: LayerNodeConfig[]
}> {
  return getProcessorTargetPairsFromConfig(layers, true)
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
  // midgroundTextureColor2: mask.secondary or mask surface color
  const midgroundTextureColor2 = colors.mask.secondary === 'auto'
    ? getColorFromPalette(palette, maskSurfaceKey)
    : getColorFromPalette(palette, colors.mask.secondary)

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

  // 2. Render clip-group (surface-mask with processor-mask)
  const clipGroupContents = findClipGroupContents(config.layers)
  if (clipGroupContents) {
    const { surface: surfaceLayer, processor } = clipGroupContents

    // First render the surface texture pattern
    const surfaceSpec = createBackgroundSpecFromSurface(
      surfaceLayer.surface,
      midgroundTextureColor1,
      midgroundTextureColor2,
      viewport,
      scale
    )
    if (surfaceSpec) {
      renderer.render(surfaceSpec, { clear: false })
    }

    // Get mask from processor-mask (sibling processor node in clip-group)
    const maskProcessor = processor ? getProcessorMask(processor) : null

    // Get effects from surface layer filters
    const effectFilters = getLayerFilters(surfaceLayer)
    const effectFilter = effectFilters.find((f) => f.enabled)

    // Get effects from processor modifiers (if processor exists)
    const processorEffects = processor ? getEffectConfigsFromModifiers(processor.modifiers) : []

    // Apply effectors using unified pipeline (mask first, then effects)
    applyEffectors(
      renderer,
      {
        mask: maskProcessor,
        effects: effectFilter?.config,
        effectList: processorEffects.length > 0 ? processorEffects : undefined,
      },
      viewport,
      midgroundTextureColor1,
      scale
    )
  } else {
    // Fallback: legacy structure without clip-group
    const surfaceLayer = findSurfaceLayer(config.layers)
    if (surfaceLayer) {
      // First render the surface texture pattern
      const surfaceSpec = createBackgroundSpecFromSurface(
        surfaceLayer.surface,
        midgroundTextureColor1,
        midgroundTextureColor2,
        viewport,
        scale
      )
      if (surfaceSpec) {
        renderer.render(surfaceSpec, { clear: false })
      }

      // Get mask from processors (legacy)
      const maskProcessor = getLayerMaskProcessor(surfaceLayer)

      // Get effects from filters
      const effectFilters = getLayerFilters(surfaceLayer)
      const effectFilter = effectFilters.find((f) => f.enabled)

      // Apply effectors using unified pipeline
      applyEffectors(
        renderer,
        {
          mask: maskProcessor,
          effects: effectFilter?.config,
        },
        viewport,
        midgroundTextureColor1,
        scale
      )
    }
  }

  // 3. Process Processor nodes (position-based processor application)
  const processorPairs = findProcessorTargetPairs(config.layers)
  for (const { processor, targets } of processorPairs) {
    // Skip if processor has no targets
    if (targets.length === 0) continue

    // Get mask from processor modifiers
    const maskProcessor = getProcessorMask(processor)

    // Get effects from processor modifiers (supports both legacy and new formats)
    // Use getEffectConfigsFromModifiers to normalize to SingleEffectConfig[]
    const effectList = getEffectConfigsFromModifiers(processor.modifiers)

    // Apply effectors using unified pipeline (mask first, then effects)
    applyEffectors(
      renderer,
      {
        mask: maskProcessor,
        effectList,
      },
      viewport,
      midgroundTextureColor1,
      scale
    )
  }
}
