/**
 * useHeroThumbnails
 *
 * Thumbnail rendering for pattern/preset selection UI
 * Handles:
 * - Thumbnail canvas initialization
 * - Pattern rendering for background, mask, and surface presets
 * - Section panel management
 */

import { ref, nextTick, type ComputedRef, type Ref } from 'vue'
import type { TextureRenderer } from '@practice/texture'
import {
  texturePatternRepository,
  maskPatternRepository,
  surfacePresetRepository,
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createLinearGradientSpec,
  createTriangleSpec,
  createHexagonSpec,
  createAsanohaSpec,
  createSeigaihaSpec,
  createWaveSpec,
  createScalesSpec,
  createOgeeSpec,
  createSunburstSpec,
  createPaperTextureSpec,
  createGradientGrainLinearSpec,
  createGradientGrainCircularSpec,
  createGradientGrainRadialSpec,
  createGradientGrainPerlinSpec,
  createGradientGrainCurlSpec,
  createGradientGrainSimplexSpec,
  DEFAULT_GRADIENT_GRAIN_CURVE_POINTS,
  // Greymap mask specs for mask thumbnail rendering
  createCircleGreymapMaskSpec,
  createRectGreymapMaskSpec,
  createBlobGreymapMaskSpec,
  createPerlinGreymapMaskSpec,
  createSimplexGreymapMaskSpec,
  createCurlGreymapMaskSpec,
  createRadialGradientGreymapMaskSpec,
  createBoxGradientGreymapMaskSpec,
  createWavyLineGreymapMaskSpec,
  type TexturePattern,
  type MaskPattern,
  type MaskPatternStaticValue,
  type RGBA,
  type Viewport,
  type TextureRenderSpec,
  type SurfacePreset,
} from '@practice/texture'
import { createSharedRenderer } from '../../services/createSharedRenderer'

// ============================================================
// Types
// ============================================================

export type SectionType = 'background' | 'clip-group-surface' | 'clip-group-shape' | 'foreground-title' | 'foreground-description' | 'filter' | 'effect' | 'text-content'

/**
 * Options for useHeroThumbnails composable
 */
export interface UseHeroThumbnailsOptions {
  /** Texture color 1 for background patterns */
  textureColor1: ComputedRef<RGBA>
  /** Texture color 2 for background patterns */
  textureColor2: ComputedRef<RGBA>
  /** Midground texture color 1 for surface patterns */
  midgroundTextureColor1: ComputedRef<RGBA>
  /** Midground texture color 2 for surface patterns */
  midgroundTextureColor2: ComputedRef<RGBA>
  /** Selected background pattern index */
  selectedBackgroundIndex: Ref<number>
}

/**
 * Return type for useHeroThumbnails composable
 */
export interface UseHeroThumbnailsReturn {
  /** Available texture patterns */
  texturePatterns: Ref<TexturePattern[]>
  /** Available mask patterns */
  maskPatterns: Ref<MaskPattern[]>
  /** Available midground texture patterns */
  midgroundTexturePatterns: Ref<SurfacePreset[]>
  /** Currently active section */
  activeSection: Ref<SectionType | null>
  /** Get patterns for a section */
  getPatterns: (section: SectionType) => (TexturePattern | MaskPattern)[]
  /** Create midground thumbnail spec */
  createMidgroundThumbnailSpec: (preset: SurfacePreset, color1: RGBA, color2: RGBA, viewport: Viewport) => TextureRenderSpec | null
  /** Create background thumbnail spec */
  createBackgroundThumbnailSpec: (viewport: { width: number; height: number }) => TextureRenderSpec | null
  /** Open a section and render thumbnails */
  openSection: (section: SectionType) => void
  /** Destroy all thumbnail renderers */
  destroyThumbnailRenderers: () => void
  /** Render thumbnails for current section */
  renderThumbnails: () => Promise<void>
  /** Initialize patterns asynchronously */
  initPatterns: () => Promise<void>
}

// ============================================================
// Mask Thumbnail Helpers
// ============================================================

/**
 * Helper to extract static value from MaskPatternStaticValue
 */
function getStaticValue<T>(v: MaskPatternStaticValue<T> | undefined, defaultValue: T): T {
  return v?.value ?? defaultValue
}

/**
 * Create thumbnail spec for mask pattern (children-based).
 * Uses the first child's surface config to render a greymap preview.
 */
function createMaskThumbnailSpec(
  pattern: MaskPattern,
  viewport: Viewport
): TextureRenderSpec | null {
  const firstChild = pattern.children[0]
  if (!firstChild) return null

  const surfaceId = firstChild.surface.id
  const params = firstChild.surface.params

  switch (surfaceId) {
    case 'circle':
      return createCircleGreymapMaskSpec(
        {
          centerX: getStaticValue(params.centerX as MaskPatternStaticValue<number>, 0.5),
          centerY: getStaticValue(params.centerY as MaskPatternStaticValue<number>, 0.5),
          radius: getStaticValue(params.radius as MaskPatternStaticValue<number>, 0.3),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'rect':
      return createRectGreymapMaskSpec(
        {
          left: getStaticValue(params.left as MaskPatternStaticValue<number>, 0),
          right: getStaticValue(params.right as MaskPatternStaticValue<number>, 1),
          top: getStaticValue(params.top as MaskPatternStaticValue<number>, 0),
          bottom: getStaticValue(params.bottom as MaskPatternStaticValue<number>, 1),
          radiusTopLeft: getStaticValue(params.radiusTopLeft as MaskPatternStaticValue<number>, 0),
          radiusTopRight: getStaticValue(params.radiusTopRight as MaskPatternStaticValue<number>, 0),
          radiusBottomLeft: getStaticValue(params.radiusBottomLeft as MaskPatternStaticValue<number>, 0),
          radiusBottomRight: getStaticValue(params.radiusBottomRight as MaskPatternStaticValue<number>, 0),
          rotation: getStaticValue(params.rotation as MaskPatternStaticValue<number>, 0),
          perspectiveX: getStaticValue(params.perspectiveX as MaskPatternStaticValue<number>, 0),
          perspectiveY: getStaticValue(params.perspectiveY as MaskPatternStaticValue<number>, 0),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'blob':
      return createBlobGreymapMaskSpec(
        {
          centerX: getStaticValue(params.centerX as MaskPatternStaticValue<number>, 0.5),
          centerY: getStaticValue(params.centerY as MaskPatternStaticValue<number>, 0.5),
          baseRadius: getStaticValue(params.baseRadius as MaskPatternStaticValue<number>, 0.4),
          amplitude: getStaticValue(params.amplitude as MaskPatternStaticValue<number>, 0.08),
          octaves: getStaticValue(params.octaves as MaskPatternStaticValue<number>, 2),
          seed: getStaticValue(params.seed as MaskPatternStaticValue<number>, 1),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'perlin':
      return createPerlinGreymapMaskSpec(
        {
          seed: getStaticValue(params.seed as MaskPatternStaticValue<number>, 12345),
          threshold: getStaticValue(params.threshold as MaskPatternStaticValue<number>, 0.5),
          scale: getStaticValue(params.scale as MaskPatternStaticValue<number>, 4),
          octaves: getStaticValue(params.octaves as MaskPatternStaticValue<number>, 4),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'simplex':
      return createSimplexGreymapMaskSpec(
        {
          seed: getStaticValue(params.seed as MaskPatternStaticValue<number>, 12345),
          threshold: getStaticValue(params.threshold as MaskPatternStaticValue<number>, 0.5),
          scale: getStaticValue(params.scale as MaskPatternStaticValue<number>, 4),
          octaves: getStaticValue(params.octaves as MaskPatternStaticValue<number>, 4),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'curl':
      return createCurlGreymapMaskSpec(
        {
          seed: getStaticValue(params.seed as MaskPatternStaticValue<number>, 12345),
          threshold: getStaticValue(params.threshold as MaskPatternStaticValue<number>, 0.3),
          scale: getStaticValue(params.scale as MaskPatternStaticValue<number>, 4),
          octaves: getStaticValue(params.octaves as MaskPatternStaticValue<number>, 4),
          intensity: getStaticValue(params.intensity as MaskPatternStaticValue<number>, 1),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'radialGradient':
      return createRadialGradientGreymapMaskSpec(
        {
          centerX: getStaticValue(params.centerX as MaskPatternStaticValue<number>, 0.5),
          centerY: getStaticValue(params.centerY as MaskPatternStaticValue<number>, 0.5),
          innerRadius: getStaticValue(params.innerRadius as MaskPatternStaticValue<number>, 0.2),
          outerRadius: getStaticValue(params.outerRadius as MaskPatternStaticValue<number>, 0.6),
          aspectRatio: getStaticValue(params.aspectRatio as MaskPatternStaticValue<number>, 1),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'boxGradient':
      return createBoxGradientGreymapMaskSpec(
        {
          left: getStaticValue(params.left as MaskPatternStaticValue<number>, 0.15),
          right: getStaticValue(params.right as MaskPatternStaticValue<number>, 0.15),
          top: getStaticValue(params.top as MaskPatternStaticValue<number>, 0.15),
          bottom: getStaticValue(params.bottom as MaskPatternStaticValue<number>, 0.15),
          cornerRadius: getStaticValue(params.cornerRadius as MaskPatternStaticValue<number>, 0),
          curve: getStaticValue(params.curve as MaskPatternStaticValue<'linear' | 'smooth' | 'easeIn' | 'easeOut'>, 'smooth'),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    case 'wavyLine':
      return createWavyLineGreymapMaskSpec(
        {
          position: getStaticValue(params.position as MaskPatternStaticValue<number>, 0.5),
          direction: getStaticValue(params.direction as MaskPatternStaticValue<'vertical' | 'horizontal'>, 'vertical'),
          amplitude: getStaticValue(params.amplitude as MaskPatternStaticValue<number>, 0.08),
          frequency: getStaticValue(params.frequency as MaskPatternStaticValue<number>, 3),
          octaves: getStaticValue(params.octaves as MaskPatternStaticValue<number>, 2),
          seed: getStaticValue(params.seed as MaskPatternStaticValue<number>, 42),
          innerValue: 1.0,
          outerValue: 0.0,
        },
        viewport
      ) as unknown as TextureRenderSpec

    default:
      return null
  }
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for thumbnail rendering in HeroScene
 */
export function useHeroThumbnails(options: UseHeroThumbnailsOptions): UseHeroThumbnailsReturn {
  const {
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,
    selectedBackgroundIndex,
  } = options

  // ============================================================
  // Pattern Definitions
  // ============================================================
  const texturePatterns = ref<TexturePattern[]>([])
  const maskPatterns = ref<MaskPattern[]>([])
  const midgroundTexturePatterns = ref<SurfacePreset[]>([])

  // Initialize patterns asynchronously
  const initPatterns = async () => {
    const [textures, masks, surfaces] = await Promise.all([
      texturePatternRepository.getAll(),
      maskPatternRepository.getAll(),
      surfacePresetRepository.getAll(),
    ])
    texturePatterns.value = textures
    maskPatterns.value = masks
    midgroundTexturePatterns.value = surfaces
  }

  // ============================================================
  // State
  // ============================================================
  const activeSection = ref<SectionType | null>(null)
  const thumbnailRenderers: TextureRenderer[] = []

  // ============================================================
  // Thumbnail Rendering
  // ============================================================

  /**
   * Create a full-viewport spec for midground texture thumbnail
   */
  const createMidgroundThumbnailSpec = (
    preset: SurfacePreset,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ): TextureRenderSpec | null => {
    const { params } = preset

    switch (params.id) {
      case 'solid':
        return createSolidSpec({ color: color1 })
      case 'stripe':
        return createStripeSpec({
          color1,
          color2,
          width1: params.width1 as number,
          width2: params.width2 as number,
          angle: params.angle as number,
        })
      case 'grid':
        return createGridSpec({
          lineColor: color1,
          bgColor: color2,
          lineWidth: params.lineWidth as number,
          cellSize: params.cellSize as number,
        })
      case 'polkaDot':
        return createPolkaDotSpec({
          dotColor: color1,
          bgColor: color2,
          dotRadius: params.dotRadius as number,
          spacing: params.spacing as number,
          rowOffset: params.rowOffset as number,
        })
      case 'checker':
        return createCheckerSpec({
          color1,
          color2,
          cellSize: params.cellSize as number,
          angle: params.angle as number,
        })
      case 'linearGradient':
        return createLinearGradientSpec({
          angle: params.angle as number,
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          stops: [
            { color: color1, position: 0 },
            { color: color2, position: 1 },
          ],
        }, viewport)
      case 'circularGradient':
        return createLinearGradientSpec({
          depthMapType: 'circular',
          angle: 0,
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          circularInvert: params.circularInvert as boolean | undefined,
          stops: [
            { color: color1, position: 0 },
            { color: color2, position: 1 },
          ],
        }, viewport)
      case 'conicGradient':
        return createLinearGradientSpec({
          depthMapType: 'radial',
          angle: 0,
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          radialStartAngle: params.startAngle as number | undefined,
          radialSweepAngle: params.sweepAngle as number | undefined,
          stops: [
            { color: color1, position: 0 },
            { color: color2, position: 1 },
          ],
        }, viewport)
      case 'repeatLinearGradient':
        return createLinearGradientSpec({
          angle: params.angle as number,
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          repeat: params.repeat as number | undefined,
          stops: [
            { color: color1, position: 0 },
            { color: color2, position: 1 },
          ],
        }, viewport)
      case 'perlinGradient':
        return createLinearGradientSpec({
          depthMapType: 'perlin',
          angle: 0,
          perlinScale: params.scale as number | undefined,
          perlinOctaves: params.octaves as number | undefined,
          perlinSeed: params.seed as number | undefined,
          perlinContrast: params.contrast as number | undefined,
          perlinOffset: params.offset as number | undefined,
          stops: [
            { color: color1, position: 0 },
            { color: color2, position: 1 },
          ],
        }, viewport)
      case 'curlGradient':
        return createLinearGradientSpec({
          depthMapType: 'curl',
          angle: 0,
          perlinScale: params.scale as number | undefined,
          perlinOctaves: params.octaves as number | undefined,
          perlinSeed: params.seed as number | undefined,
          perlinContrast: params.contrast as number | undefined,
          perlinOffset: params.offset as number | undefined,
          curlIntensity: params.intensity as number | undefined,
          stops: [
            { color: color1, position: 0 },
            { color: color2, position: 1 },
          ],
        }, viewport)
      case 'gradientGrainLinear':
        return createGradientGrainLinearSpec({
          angle: params.angle as number,
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          colorA: color1,
          colorB: color2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainCircular':
        return createGradientGrainCircularSpec({
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          circularInvert: params.circularInvert as boolean | undefined,
          colorA: color1,
          colorB: color2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainRadial':
        return createGradientGrainRadialSpec({
          centerX: params.centerX as number | undefined,
          centerY: params.centerY as number | undefined,
          radialStartAngle: params.radialStartAngle as number | undefined,
          radialSweepAngle: params.radialSweepAngle as number | undefined,
          colorA: color1,
          colorB: color2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainPerlin':
        return createGradientGrainPerlinSpec({
          perlinScale: params.perlinScale as number | undefined,
          perlinOctaves: params.perlinOctaves as number | undefined,
          perlinContrast: params.perlinContrast as number | undefined,
          perlinOffset: params.perlinOffset as number | undefined,
          colorA: color1,
          colorB: color2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainCurl':
        return createGradientGrainCurlSpec({
          perlinScale: params.perlinScale as number | undefined,
          perlinOctaves: params.perlinOctaves as number | undefined,
          perlinContrast: params.perlinContrast as number | undefined,
          perlinOffset: params.perlinOffset as number | undefined,
          curlIntensity: params.curlIntensity as number | undefined,
          colorA: color1,
          colorB: color2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainSimplex':
        return createGradientGrainSimplexSpec({
          simplexScale: params.simplexScale as number | undefined,
          simplexOctaves: params.simplexOctaves as number | undefined,
          simplexContrast: params.simplexContrast as number | undefined,
          simplexOffset: params.simplexOffset as number | undefined,
          colorA: color1,
          colorB: color2,
          seed: params.seed as number,
          sparsity: params.sparsity as number,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'triangle':
        return createTriangleSpec({
          color1,
          color2,
          size: params.size as number,
          angle: params.angle as number,
        })
      case 'hexagon':
        return createHexagonSpec({
          color1,
          color2,
          size: params.size as number,
          angle: params.angle as number,
        })
      case 'asanoha':
        return createAsanohaSpec({
          lineColor: color1,
          bgColor: color2,
          size: params.size as number,
          lineWidth: params.lineWidth as number,
        })
      case 'seigaiha':
        return createSeigaihaSpec({
          lineColor: color1,
          bgColor: color2,
          radius: params.radius as number,
          rings: params.rings as number,
          lineWidth: params.lineWidth as number,
        })
      case 'wave':
        return createWaveSpec({
          color1,
          color2,
          amplitude: params.amplitude as number,
          wavelength: params.wavelength as number,
          thickness: params.thickness as number,
          angle: params.angle as number,
        })
      case 'scales':
        return createScalesSpec({
          color1,
          color2,
          size: params.size as number,
          overlap: params.overlap as number,
          angle: params.angle as number,
        })
      case 'ogee':
        return createOgeeSpec({
          lineColor: color1,
          bgColor: color2,
          width: params.width as number,
          height: params.height as number,
          lineWidth: params.lineWidth as number,
        })
      case 'sunburst':
        return createSunburstSpec({
          color1,
          color2,
          rays: params.rays as number,
          centerX: params.centerX as number,
          centerY: params.centerY as number,
          twist: params.twist as number,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        })
      case 'paperTexture':
        return createPaperTextureSpec({
          color: color1,
          fiberScale: params.fiberScale as number,
          fiberStrength: params.fiberStrength as number,
          fiberWarp: params.fiberWarp as number,
          grainDensity: params.grainDensity as number,
          grainSize: params.grainSize as number,
          bumpStrength: params.bumpStrength as number,
          lightAngle: params.lightAngle as number,
          seed: params.seed as number,
        }, viewport)
      default:
        return null
    }
  }

  /**
   * Create background thumbnail spec
   */
  const createBackgroundThumbnailSpec = (viewport: { width: number; height: number }): TextureRenderSpec | null => {
    const bgPattern = texturePatterns.value[selectedBackgroundIndex.value]
    if (bgPattern) {
      return bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
    }
    return null
  }

  /**
   * Get patterns for a section
   */
  const getPatterns = (section: SectionType): (TexturePattern | MaskPattern)[] => {
    if (section === 'background') return texturePatterns.value
    if (section === 'clip-group-shape') return maskPatterns.value
    return []
  }

  /**
   * Destroy all thumbnail renderers
   */
  const destroyThumbnailRenderers = () => {
    for (const r of thumbnailRenderers) {
      r.destroy()
    }
    thumbnailRenderers.length = 0
  }

  /**
   * Render thumbnails for current section
   */
  const renderThumbnails = async () => {
    const section = activeSection.value
    if (!section) return

    // Handle clip-group-surface section
    if (section === 'clip-group-surface') {
      for (let i = 0; i < thumbnailRenderers.length; i++) {
        const renderer = thumbnailRenderers[i]
        if (!renderer) continue

        const viewport = renderer.getViewport()
        const pattern = midgroundTexturePatterns.value[i]
        if (pattern) {
          const spec = createMidgroundThumbnailSpec(
            pattern,
            midgroundTextureColor1.value,
            midgroundTextureColor2.value,
            viewport
          )
          if (spec) {
            renderer.render(spec)
          }
        }
      }
      return
    }

    // Handle background section
    if (section === 'background') {
      for (let i = 0; i < thumbnailRenderers.length; i++) {
        const renderer = thumbnailRenderers[i]
        const pattern = texturePatterns.value[i]
        if (renderer && pattern) {
          const viewport = renderer.getViewport()
          const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
          renderer.render(spec)
        }
      }
      return
    }

    // Handle clip-group-shape section (mask patterns with children-based format)
    if (section === 'clip-group-shape') {
      for (let i = 0; i < thumbnailRenderers.length; i++) {
        const renderer = thumbnailRenderers[i]
        const pattern = maskPatterns.value[i]
        if (renderer && pattern) {
          const viewport = renderer.getViewport()
          const spec = createMaskThumbnailSpec(pattern, viewport)
          if (spec) {
            renderer.render(spec)
          }
        }
      }
      return
    }
  }

  /**
   * Open a section and render thumbnails
   */
  const openSection = (section: SectionType) => {
    destroyThumbnailRenderers()

    if (activeSection.value === section) {
      activeSection.value = null
      return
    }

    activeSection.value = section

    nextTick(async () => {
      const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-thumbnail-canvas]')

      // Handle clip-group-surface section separately
      if (section === 'clip-group-surface') {
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i]
          if (!canvas) continue
          canvas.width = 256
          canvas.height = 144
          try {
            const renderer = await createSharedRenderer(canvas)
            thumbnailRenderers.push(renderer)
            const pattern = midgroundTexturePatterns.value[i]
            if (pattern) {
              const viewport = renderer.getViewport()
              const spec = createMidgroundThumbnailSpec(
                pattern,
                midgroundTextureColor1.value,
                midgroundTextureColor2.value,
                viewport
              )
              if (spec) {
                renderer.render(spec)
              }
            }
          } catch (e) {
            console.error('WebGPU not available:', e)
          }
        }
        return
      }

      // Handle background section
      if (section === 'background') {
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i]
          if (!canvas) continue
          canvas.width = 256
          canvas.height = 144
          try {
            const renderer = await createSharedRenderer(canvas)
            thumbnailRenderers.push(renderer)
            const pattern = texturePatterns.value[i]
            if (pattern) {
              const viewport = renderer.getViewport()
              const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
              renderer.render(spec)
            }
          } catch (e) {
            console.error('WebGPU not available:', e)
          }
        }
        return
      }

      // Handle clip-group-shape section (mask patterns with children-based format)
      if (section === 'clip-group-shape') {
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i]
          if (!canvas) continue
          canvas.width = 256
          canvas.height = 144
          try {
            const renderer = await createSharedRenderer(canvas)
            thumbnailRenderers.push(renderer)
            const pattern = maskPatterns.value[i]
            if (pattern) {
              const viewport = renderer.getViewport()
              const spec = createMaskThumbnailSpec(pattern, viewport)
              if (spec) {
                renderer.render(spec)
              }
            }
          } catch (e) {
            console.error('WebGPU not available:', e)
          }
        }
        return
      }
    })
  }

  // ============================================================
  // Return
  // ============================================================
  return {
    texturePatterns,
    maskPatterns,
    midgroundTexturePatterns,
    activeSection,
    getPatterns,
    createMidgroundThumbnailSpec,
    createBackgroundThumbnailSpec,
    openSection,
    destroyThumbnailRenderers,
    renderThumbnails,
    initPatterns,
  }
}
