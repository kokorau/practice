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
  // Two-texture shader for surface + mask
  createSurfaceMaskSpec,
  type DualTextureSpec,
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
  HeroPrimitiveKey,
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
  // Default colors for surface layers
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
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
  /** Apply two-texture effect (surface + mask) */
  applyDualTextureEffect(
    spec: DualTextureSpec,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void
  /** Apply two-texture effect to offscreen texture */
  applyDualTextureEffectToOffscreen(
    spec: DualTextureSpec,
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTextureIndex: 0 | 1
  ): GPUTexture
  /** Apply post-effect to offscreen texture */
  applyPostEffectToOffscreen(
    effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    inputTexture: GPUTexture,
    outputTextureIndex: 0 | 1
  ): GPUTexture
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
  // Use a larger delta (0.12) to create visible contrast for patterns
  // (Previous value of 0.05 was too subtle and made patterns look solid)
  const surface = getOklchFromPalette(palette, maskSurfaceKey)
  const deltaL = isDark ? 0.12 : -0.12
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
  // Greymap values for colorize shader:
  // - innerValue = 0.0 → cutoutColor (transparent) → preserves canvas content inside mask
  // - outerValue = 1.0 → keepColor (solid maskColor) → replaces outside mask
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

/**
 * Render mask using 2-stage greymap pipeline with proper alpha masking
 * Stage 1: Copy current canvas content (surface) to texture
 * Stage 2: Render greymap to offscreen texture
 * Stage 3: Apply colorize shader to create alpha mask overlay
 *
 * The greymap values (cutout=false): inner=0.0, outer=1.0
 * This means:
 * - Inside mask (greymap=0): cutoutColor (transparent) -> preserves canvas (surface)
 * - Outside mask (greymap=1): keepColor with alpha=1 -> replaces with solid color
 *
 * Note: This architecture has a limitation - the area outside the mask is replaced
 * with a solid color instead of showing the background pattern. To fix this properly
 * would require rendering surface to offscreen and compositing with proper alpha.
 *
 * @deprecated Use renderLayerWithMask for proper alpha compositing
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

  console.log('[renderMaskWithGreymapPipeline] maskColor:', JSON.stringify(maskColor))

  // Stage 2: Apply colorize shader to create mask overlay
  // - Where greymap = 0 (inside mask): transparent -> preserves underlying surface
  // - Where greymap = 1 (outside mask): maskColor -> replaces with solid color
  const colorizeSpec = createColorizeSpec(
    {
      keepColor: maskColor,
      cutoutColor: [0, 0, 0, 0], // Transparent for inside (preserves surface)
      alphaMode: 0, // Luminance becomes alpha
    },
    viewport
  )

  renderer.applyPostEffect(colorizeSpec, greymapTexture, { clear: false })
}

/**
 * Render a layer with mask using two-texture pipeline
 *
 * This is the proper way to render a masked layer:
 * 1. Render surface pattern to offscreen[0]
 * 2. Render greymap mask to offscreen[1]
 * 3. Combine surface + mask with alpha using two-texture shader
 * 4. If effects: Apply effects to offscreen texture (ping-pong)
 * 5. Composite result onto canvas with alpha blending
 *
 * This approach properly shows the background through transparent mask areas,
 * and ensures effects are applied only to this layer, not the entire canvas.
 */
function renderLayerWithMask(
  renderer: TextureRendererLike,
  surfaceSpec: TextureRenderSpec,
  greymapSpec: GreymapMaskSpec,
  viewport: Viewport,
  effects?: SingleEffectConfig[],
  scale: number = 1
): void {
  console.log('[renderLayerWithMask] Rendering surface to offscreen[0]')
  // Stage 1: Render surface to offscreen[0]
  const surfaceTexture = renderer.renderToOffscreen(surfaceSpec, 0)

  console.log('[renderLayerWithMask] Rendering greymap to offscreen[1]')
  // Stage 2: Render greymap mask to offscreen[1]
  const greymapTexture = renderer.renderToOffscreen(
    {
      shader: greymapSpec.shader,
      uniforms: greymapSpec.uniforms,
      bufferSize: greymapSpec.bufferSize,
    },
    1
  )

  // Check if we have effects to apply
  const hasEffects = effects && effects.length > 0

  if (hasEffects) {
    console.log('[renderLayerWithMask] Combining with two-texture shader to offscreen[0]')
    // Stage 3: Combine surface + greymap to offscreen[0] (not canvas)
    const surfaceMaskSpec = createSurfaceMaskSpec(viewport)
    let currentTexture = renderer.applyDualTextureEffectToOffscreen(
      surfaceMaskSpec,
      surfaceTexture,
      greymapTexture,
      0
    )
    let currentTextureIndex: 0 | 1 = 0

    console.log(`[renderLayerWithMask] Applying ${effects!.length} effects`)
    // Stage 4: Apply effects using ping-pong rendering
    for (const effect of effects!) {
      const effectType = effect.id as EffectType
      if (!(effectType in EFFECT_REGISTRY)) continue

      const definition = EFFECT_REGISTRY[effectType]
      const spec = definition.createShaderSpec(effect.params as never, viewport, scale)
      if (!spec) continue

      // Ping-pong: render to the other offscreen texture
      const outputIndex: 0 | 1 = currentTextureIndex === 0 ? 1 : 0
      currentTexture = renderer.applyPostEffectToOffscreen(spec, currentTexture, outputIndex)
      currentTextureIndex = outputIndex
    }

    console.log('[renderLayerWithMask] Compositing to canvas with alpha blending')
    // Stage 5: Composite final result to canvas
    renderer.compositeToCanvas(currentTexture, { clear: false })
  } else {
    console.log('[renderLayerWithMask] Combining with two-texture shader (no effects)')
    // No effects: composite directly to canvas (original behavior)
    const surfaceMaskSpec = createSurfaceMaskSpec(viewport)
    renderer.applyDualTextureEffect(surfaceMaskSpec, surfaceTexture, greymapTexture, { clear: false })
  }
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
  console.log('[applyEffectors] config.mask:', JSON.stringify(config.mask))
  if (config.mask?.enabled && config.mask.shape) {
    const greymapSpec = createGreymapMaskSpecFromShape(config.mask.shape, viewport)
    console.log('[applyEffectors] greymapSpec:', greymapSpec ? 'created' : 'null')
    if (greymapSpec) {
      renderMaskWithGreymapPipeline(renderer, greymapSpec, maskColor, viewport)
    }
  } else {
    console.log('[applyEffectors] Mask NOT applied - enabled:', config.mask?.enabled, 'shape:', !!config.mask?.shape)
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
 * Find all clip-groups (groups with surface layers, excluding background-group)
 * Returns array of { group, surface, processor } in config order
 *
 * A group is considered a clip-group if:
 * - It's not the background-group
 * - It contains at least one surface layer
 */
function findAllClipGroups(layers: LayerNodeConfig[]): Array<{
  group: GroupLayerNodeConfig
  surface: SurfaceLayerNodeConfig
  processor: ProcessorNodeConfig | null
}> {
  const results: Array<{
    group: GroupLayerNodeConfig
    surface: SurfaceLayerNodeConfig
    processor: ProcessorNodeConfig | null
  }> = []

  for (const layer of layers) {
    // Skip non-groups and background-group
    if (layer.type !== 'group') continue
    if (layer.id === 'background-group') continue

    const group = layer as GroupLayerNodeConfig

    // Find first surface layer in this group
    const surface = group.children.find(
      (c): c is SurfaceLayerNodeConfig => c.type === 'surface'
    )
    if (!surface) continue

    // Find first processor layer in this group (optional)
    const processor = group.children.find(
      (c): c is ProcessorNodeConfig => c.type === 'processor'
    ) ?? null

    results.push({ group, surface, processor })
  }

  return results
}

// ============================================================
// Surface Color Resolution (Per-surface colors required)
// ============================================================

/**
 * Get background colors from surface layer
 * Merges with defaults to handle partial/incomplete color objects
 */
function getBackgroundColors(
  layer: BaseLayerNodeConfig | SurfaceLayerNodeConfig | null
): { primary: HeroPrimitiveKey; secondary: HeroPrimitiveKey | 'auto' } {
  // DEFAULT_LAYER_BACKGROUND_COLORS.primary is 'B' (HeroPrimitiveKey), cast needed due to SurfaceColorsConfig type
  const defaultPrimary = DEFAULT_LAYER_BACKGROUND_COLORS.primary as HeroPrimitiveKey
  const defaultSecondary = DEFAULT_LAYER_BACKGROUND_COLORS.secondary

  if (layer?.colors) {
    // Use per-surface colors, falling back to defaults for missing values
    const primary = layer.colors.primary
    const secondary = layer.colors.secondary

    return {
      // Resolve 'auto' or undefined to default for background primary
      primary: (primary == null || primary === 'auto') ? defaultPrimary : primary,
      // Use secondary if defined, otherwise default
      secondary: secondary ?? defaultSecondary,
    }
  }
  // Fallback to defaults
  return {
    primary: defaultPrimary,
    secondary: defaultSecondary,
  }
}

/**
 * Get mask colors from surface layer
 * Merges with defaults to handle partial/incomplete color objects
 */
function getMaskColors(
  layer: SurfaceLayerNodeConfig | null
): { primary: HeroPrimitiveKey | 'auto'; secondary: HeroPrimitiveKey | 'auto' } {
  const defaultPrimary = DEFAULT_LAYER_MASK_COLORS.primary
  const defaultSecondary = DEFAULT_LAYER_MASK_COLORS.secondary

  if (layer?.colors) {
    // Use per-surface colors, falling back to defaults for missing values
    return {
      primary: layer.colors.primary ?? defaultPrimary,
      secondary: layer.colors.secondary ?? defaultSecondary,
    }
  }
  // Fallback to defaults
  return {
    primary: defaultPrimary,
    secondary: defaultSecondary,
  }
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
  const configColors = config.colors

  // Determine theme mode from palette
  const isDark = isDarkTheme(palette)

  // Get mask surface key based on semantic context
  const semanticContext = configColors.semanticContext ?? 'canvas'
  const maskSurfaceKey = getMaskSurfaceKey(semanticContext, isDark)

  // Find layers first (needed to resolve per-surface colors)
  const baseLayer = findBaseLayer(config.layers)
  const allClipGroups = findAllClipGroups(config.layers)

  // Debug logging
  console.log('[renderHeroConfig] baseLayer:', baseLayer?.id, 'colors:', JSON.stringify(baseLayer?.colors))
  console.log('[renderHeroConfig] allClipGroups:', allClipGroups.length, 'groups found')

  // Resolve background colors from surface layer
  const bgColors = getBackgroundColors(baseLayer)
  const bgColor1 = getColorFromPalette(palette, bgColors.primary)
  const canvasSurfaceKey = isDark ? 'F8' : 'F1'
  const bgColor2 = bgColors.secondary === 'auto'
    ? getColorFromPalette(palette, canvasSurfaceKey)
    : getColorFromPalette(palette, bgColors.secondary)

  // 1. Render background (base layer)
  console.log('[renderHeroConfig] Rendering background')
  console.log('[renderHeroConfig] baseLayer.surface:', JSON.stringify(baseLayer?.surface))
  console.log('[renderHeroConfig] bgColor1:', JSON.stringify(bgColor1))
  console.log('[renderHeroConfig] bgColor2:', JSON.stringify(bgColor2))
  if (baseLayer) {
    const bgSpec = createBackgroundSpecFromSurface(
      baseLayer.surface,
      bgColor1,
      bgColor2,
      viewport,
      scale
    )
    console.log('[renderHeroConfig] bgSpec:', bgSpec ? JSON.stringify({ shader: !!bgSpec.shader, uniforms: !!bgSpec.uniforms, bufferSize: bgSpec.bufferSize }) : 'null')
    if (bgSpec) {
      console.log('[renderHeroConfig] Calling renderer.render for background with clear: true')
      renderer.render(bgSpec, { clear: true })
      console.log('[renderHeroConfig] Background render call completed')
    } else {
      console.log('[renderHeroConfig] Background NOT rendered - bgSpec is null')
    }

    // Apply base layer effects (supports both filters and processors)
    const effectFilters = getLayerFilters(baseLayer)
    const effectFilter = effectFilters.find((f) => f.enabled)
    if (effectFilter?.config) {
      applyEffects(renderer, effectFilter.config, viewport, scale)
    }
  } else {
    console.log('[renderHeroConfig] Background NOT rendered - baseLayer is null')
  }

  // 2. Render all clip-groups in order (n-layer support)
  if (allClipGroups.length > 0) {
    for (let i = 0; i < allClipGroups.length; i++) {
      const clipGroupItem = allClipGroups[i]!
      const { group, surface: surfaceLayer, processor } = clipGroupItem

      console.log(`[renderHeroConfig] Rendering clip-group ${i + 1}/${allClipGroups.length}: ${group.id}`)

      // Resolve colors for this layer from its surface.colors
      const layerColors = getMaskColors(surfaceLayer)
      const layerColor1 = getMidgroundTextureColor(
        palette,
        layerColors.primary,
        maskSurfaceKey,
        isDark
      )
      const layerColor2 = layerColors.secondary === 'auto'
        ? getColorFromPalette(palette, maskSurfaceKey)
        : getColorFromPalette(palette, layerColors.secondary)

      console.log('[renderHeroConfig] surfaceLayer.surface:', JSON.stringify(surfaceLayer.surface))
      console.log('[renderHeroConfig] layerColor1:', JSON.stringify(layerColor1))
      console.log('[renderHeroConfig] layerColor2:', JSON.stringify(layerColor2))

      // Create the surface texture spec
      const surfaceSpec = createBackgroundSpecFromSurface(
        surfaceLayer.surface,
        layerColor1,
        layerColor2,
        viewport,
        scale
      )
      console.log('[renderHeroConfig] surfaceSpec:', surfaceSpec ? 'created' : 'null')

      // Get mask from processor (sibling processor node in clip-group)
      const maskProcessor = processor ? getProcessorMask(processor) : undefined
      console.log('[renderHeroConfig] maskProcessor:', maskProcessor ? maskProcessor.shape?.type : 'undefined')

      // Get effects from surface layer filters
      const effectFilters = getLayerFilters(surfaceLayer)
      const effectFilter = effectFilters.find((f) => f.enabled)

      // Get effects from processor modifiers (if processor exists)
      const processorEffects = processor ? getEffectConfigsFromModifiers(processor.modifiers) : []

      // Collect all effects for this layer
      const layerEffects = processorEffects.length > 0 ? processorEffects : []

      if (surfaceSpec && maskProcessor?.enabled && maskProcessor.shape) {
        // Use two-texture pipeline for proper alpha compositing
        const greymapSpec = createGreymapMaskSpecFromShape(maskProcessor.shape, viewport)
        if (greymapSpec) {
          console.log('[renderHeroConfig] Using two-texture pipeline for masked layer with effects:', layerEffects.length)
          // Pass effects to renderLayerWithMask so they're applied only to this layer
          renderLayerWithMask(renderer, surfaceSpec, greymapSpec, viewport, layerEffects, scale)
        } else {
          // Fallback: render surface without mask
          console.log('[renderHeroConfig] Fallback: rendering surface without mask (greymapSpec null)')
          renderer.render(surfaceSpec, { clear: false })
          // Apply effects to canvas (fallback behavior)
          if (layerEffects.length > 0) {
            applySingleEffects(renderer, layerEffects, viewport, scale)
          }
        }
      } else if (surfaceSpec) {
        // No mask: render surface directly to canvas
        console.log('[renderHeroConfig] Rendering surface to canvas (no mask)')
        renderer.render(surfaceSpec, { clear: false })
        // Apply effects to canvas (entire layer is visible, so canvas-wide is correct)
        if (layerEffects.length > 0) {
          applySingleEffects(renderer, layerEffects, viewport, scale)
        } else if (effectFilter?.config) {
          // Legacy effect format support
          applyEffects(renderer, effectFilter.config, viewport, scale)
        }
      }
    }
  } else {
    // Fallback: legacy structure without clip-group
    const surfaceLayer = findSurfaceLayer(config.layers)
    if (surfaceLayer) {
      // Resolve colors for legacy layer
      const layerColors = getMaskColors(surfaceLayer)
      const layerColor1 = getMidgroundTextureColor(
        palette,
        layerColors.primary,
        maskSurfaceKey,
        isDark
      )
      const layerColor2 = layerColors.secondary === 'auto'
        ? getColorFromPalette(palette, maskSurfaceKey)
        : getColorFromPalette(palette, layerColors.secondary)

      // Create surface spec
      const surfaceSpec = createBackgroundSpecFromSurface(
        surfaceLayer.surface,
        layerColor1,
        layerColor2,
        viewport,
        scale
      )

      // Get mask from processors (legacy)
      const maskProcessor = getLayerMaskProcessor(surfaceLayer)

      // Get effects from filters
      const effectFilters = getLayerFilters(surfaceLayer)
      const effectFilter = effectFilters.find((f) => f.enabled)

      if (surfaceSpec && maskProcessor?.enabled && maskProcessor.shape) {
        // Use two-texture pipeline for proper alpha compositing
        const greymapSpec = createGreymapMaskSpecFromShape(maskProcessor.shape, viewport)
        if (greymapSpec) {
          console.log('[renderHeroConfig] Legacy: Using two-texture pipeline for masked layer')
          // Legacy format doesn't have SingleEffectConfig[], so pass empty and apply after
          renderLayerWithMask(renderer, surfaceSpec, greymapSpec, viewport, [], scale)
          // Apply legacy effects after (canvas-wide - legacy behavior)
          if (effectFilter?.config) {
            applyEffects(renderer, effectFilter.config, viewport, scale)
          }
        } else {
          renderer.render(surfaceSpec, { clear: false })
          if (effectFilter?.config) {
            applyEffects(renderer, effectFilter.config, viewport, scale)
          }
        }
      } else if (surfaceSpec) {
        renderer.render(surfaceSpec, { clear: false })
        // Apply effects after compositing
        if (effectFilter?.config) {
          applyEffects(renderer, effectFilter.config, viewport, scale)
        }
      }
    }
  }

  // 3. Process Processor nodes (position-based processor application)
  // These are standalone processors that apply effects to the rendered content
  const processorPairs = findProcessorTargetPairs(config.layers)
  for (const { processor, targets } of processorPairs) {
    // Skip if processor has no targets
    if (targets.length === 0) continue

    // Get mask from processor modifiers
    const maskProcessor = getProcessorMask(processor)

    // Get effects from processor modifiers (supports both legacy and new formats)
    // Use getEffectConfigsFromModifiers to normalize to SingleEffectConfig[]
    const effectList = getEffectConfigsFromModifiers(processor.modifiers)

    // Calculate mask color based on semantic context
    // Use bgColor1 as default mask color for processor effects
    const processorMaskColor = getColorFromPalette(palette, maskSurfaceKey)

    // Apply effectors using unified pipeline (mask first, then effects)
    applyEffectors(
      renderer,
      {
        mask: maskProcessor,
        effectList,
      },
      viewport,
      processorMaskColor,
      scale
    )
  }
}
