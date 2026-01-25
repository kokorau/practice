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
  getSurfaceDefinition,
  type TexturePattern,
  type MaskPattern,
  type RGBA,
  type Viewport,
  type TextureRenderSpec,
  type SurfacePreset,
  type GenericSurfaceParams,
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
   * Uses SurfaceRegistry for centralized pattern creation
   */
  const createMidgroundThumbnailSpec = (
    preset: SurfacePreset,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ): TextureRenderSpec | null => {
    const { params } = preset
    const def = getSurfaceDefinition(params.type)
    if (!def) {
      console.warn(`Unknown surface type: ${params.type}`)
      return null
    }
    // Convert SurfacePresetParams to GenericSurfaceParams
    const genericParams: GenericSurfaceParams = { ...params } as GenericSurfaceParams
    return def.createSpec(genericParams, { c1: color1, c2: color2 }, viewport)
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
