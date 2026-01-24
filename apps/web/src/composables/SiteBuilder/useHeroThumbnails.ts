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
          width1: params.width1,
          width2: params.width2,
          angle: params.angle,
        })
      case 'grid':
        return createGridSpec({
          lineColor: color1,
          bgColor: color2,
          lineWidth: params.lineWidth,
          cellSize: params.cellSize,
        })
      case 'polkaDot':
        return createPolkaDotSpec({
          dotColor: color1,
          bgColor: color2,
          dotRadius: params.dotRadius,
          spacing: params.spacing,
          rowOffset: params.rowOffset,
        })
      case 'checker':
        return createCheckerSpec({
          color1,
          color2,
          cellSize: params.cellSize,
          angle: params.angle,
        })
      case 'gradientGrainLinear':
        return createGradientGrainLinearSpec({
          angle: params.angle,
          centerX: params.centerX,
          centerY: params.centerY,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainCircular':
        return createGradientGrainCircularSpec({
          centerX: params.centerX,
          centerY: params.centerY,
          circularInvert: params.circularInvert,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainRadial':
        return createGradientGrainRadialSpec({
          centerX: params.centerX,
          centerY: params.centerY,
          radialStartAngle: params.radialStartAngle,
          radialSweepAngle: params.radialSweepAngle,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainPerlin':
        return createGradientGrainPerlinSpec({
          perlinScale: params.perlinScale,
          perlinOctaves: params.perlinOctaves,
          perlinContrast: params.perlinContrast,
          perlinOffset: params.perlinOffset,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainCurl':
        return createGradientGrainCurlSpec({
          perlinScale: params.perlinScale,
          perlinOctaves: params.perlinOctaves,
          perlinContrast: params.perlinContrast,
          perlinOffset: params.perlinOffset,
          curlIntensity: params.curlIntensity,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'gradientGrainSimplex':
        return createGradientGrainSimplexSpec({
          simplexScale: params.simplexScale,
          simplexOctaves: params.simplexOctaves,
          simplexContrast: params.simplexContrast,
          simplexOffset: params.simplexOffset,
          colorA: color1,
          colorB: color2,
          seed: params.seed,
          sparsity: params.sparsity,
          curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
        }, viewport)
      case 'triangle':
        return createTriangleSpec({
          color1,
          color2,
          size: params.size,
          angle: params.angle,
        })
      case 'hexagon':
        return createHexagonSpec({
          color1,
          color2,
          size: params.size,
          angle: params.angle,
        })
      case 'asanoha':
        return createAsanohaSpec({
          lineColor: color1,
          bgColor: color2,
          size: params.size,
          lineWidth: params.lineWidth,
        })
      case 'seigaiha':
        return createSeigaihaSpec({
          lineColor: color1,
          bgColor: color2,
          radius: params.radius,
          rings: params.rings,
          lineWidth: params.lineWidth,
        })
      case 'wave':
        return createWaveSpec({
          color1,
          color2,
          amplitude: params.amplitude,
          wavelength: params.wavelength,
          thickness: params.thickness,
          angle: params.angle,
        })
      case 'scales':
        return createScalesSpec({
          color1,
          color2,
          size: params.size,
          overlap: params.overlap,
          angle: params.angle,
        })
      case 'ogee':
        return createOgeeSpec({
          lineColor: color1,
          bgColor: color2,
          width: params.width,
          height: params.height,
          lineWidth: params.lineWidth,
        })
      case 'sunburst':
        return createSunburstSpec({
          color1,
          color2,
          rays: params.rays,
          centerX: params.centerX,
          centerY: params.centerY,
          twist: params.twist,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        })
      case 'paperTexture':
        return createPaperTextureSpec({
          color: color1,
          fiberScale: params.fiberScale,
          fiberStrength: params.fiberStrength,
          fiberWarp: params.fiberWarp,
          grainDensity: params.grainDensity,
          grainSize: params.grainSize,
          bumpStrength: params.bumpStrength,
          lightAngle: params.lightAngle,
          seed: params.seed,
        }, viewport)
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
