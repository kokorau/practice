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
  getDefaultTexturePatterns,
  getDefaultMaskPatterns,
  getSurfacePresets,
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
  type TexturePattern,
  type MaskPattern,
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
  texturePatterns: TexturePattern[]
  /** Available mask patterns */
  maskPatterns: MaskPattern[]
  /** Available midground texture patterns */
  midgroundTexturePatterns: SurfacePreset[]
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
  const texturePatterns = getDefaultTexturePatterns()
  const maskPatterns = getDefaultMaskPatterns()
  const midgroundTexturePatterns = getSurfacePresets()

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

    switch (params.type) {
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
    const bgPattern = texturePatterns[selectedBackgroundIndex.value]
    if (bgPattern) {
      return bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
    }
    return null
  }

  /**
   * Get patterns for a section
   */
  const getPatterns = (section: SectionType): (TexturePattern | MaskPattern)[] => {
    if (section === 'background') return texturePatterns
    if (section === 'clip-group-shape') return maskPatterns
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
        const pattern = midgroundTexturePatterns[i]
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

    // Handle background and clip-group-shape sections
    const patterns = getPatterns(section)
    for (let i = 0; i < thumbnailRenderers.length; i++) {
      const renderer = thumbnailRenderers[i]
      const pattern = patterns[i]
      if (renderer && pattern) {
        const viewport = renderer.getViewport()
        const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
        renderer.render(spec)
      }
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
            const pattern = midgroundTexturePatterns[i]
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

      // Handle background and clip-group-shape sections
      const patterns = getPatterns(section)
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i]
        if (!canvas) continue
        canvas.width = 256
        canvas.height = 144
        try {
          const renderer = await createSharedRenderer(canvas)
          thumbnailRenderers.push(renderer)
          const pattern = patterns[i]
          if (pattern) {
            const viewport = renderer.getViewport()
            const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
            renderer.render(spec)
          }
        } catch (e) {
          console.error('WebGPU not available:', e)
        }
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
  }
}
