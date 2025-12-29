import { ref, computed, watch, nextTick, onUnmounted, type ComputedRef } from 'vue'
import {
  TextureRenderer,
  getDefaultTexturePatterns,
  getDefaultMaskPatterns,
  type TexturePattern,
  type RGBA,
} from '@practice/texture'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'

export type SectionType = 'background' | 'midground' | 'foreground'

export type UseTexturePreviewOptions = {
  primitivePalette: ComputedRef<PrimitivePalette>
  isDark: ComputedRef<boolean>
}

/**
 * Convert Oklch to RGBA for texture rendering.
 */
const paletteToRgba = (oklch: Oklch, alpha: number = 1.0): RGBA => {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

/**
 * Composable for managing texture preview rendering with WebGPU.
 * Handles background textures, mask patterns, and thumbnail generation.
 */
export const useTexturePreview = (options: UseTexturePreviewOptions) => {
  const { primitivePalette, isDark } = options

  // Pattern definitions
  const texturePatterns = getDefaultTexturePatterns()
  const maskPatterns = getDefaultMaskPatterns()

  // Selection state
  const selectedBackgroundIndex = ref(4) // Grid
  const selectedMaskIndex = ref<number | null>(1) // Circle Large
  const activeSection = ref<SectionType | null>(null)

  // Canvas refs and renderers
  const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
  let previewRenderer: TextureRenderer | null = null
  const thumbnailRenderers: TextureRenderer[] = []

  // Texture colors derived from palette
  const canvasSurfaceKey = computed((): 'F1' | 'F8' => (isDark.value ? 'F8' : 'F1'))
  const textureColor1 = computed((): RGBA => paletteToRgba(primitivePalette.value.B))
  const textureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

  // Mask colors (inner transparent, outer opaque)
  const maskInnerColor = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value], 0))
  const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

  // Get patterns for a section
  const getPatterns = (section: SectionType): TexturePattern[] => {
    if (section === 'background') return texturePatterns
    if (section === 'midground') return maskPatterns
    return []
  }

  // Destroy thumbnail renderers
  const destroyThumbnailRenderers = () => {
    for (const r of thumbnailRenderers) {
      r.destroy()
    }
    thumbnailRenderers.length = 0
  }

  // Render thumbnails
  const renderThumbnails = async () => {
    const section = activeSection.value
    if (!section) return

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

  // Open section panel and initialize thumbnails
  const openSection = (section: SectionType) => {
    destroyThumbnailRenderers()

    if (activeSection.value === section) {
      activeSection.value = null
      return
    }

    activeSection.value = section

    // Initialize renderers after DOM update
    nextTick(async () => {
      const patterns = getPatterns(section)
      const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-thumbnail-canvas]')

      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i]
        if (!canvas) continue
        // 16:9 aspect ratio for thumbnails
        canvas.width = 256
        canvas.height = 144
        try {
          const renderer = await TextureRenderer.create(canvas)
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

  // Update main preview
  const updatePreview = () => {
    if (!previewRenderer) return

    const viewport = previewRenderer.getViewport()

    // 1. Render background
    const bgPattern = texturePatterns[selectedBackgroundIndex.value]
    if (bgPattern) {
      const spec = bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
      previewRenderer.render(spec)
    }

    // 2. Composite mask (if selected)
    if (selectedMaskIndex.value !== null) {
      const maskPattern = maskPatterns[selectedMaskIndex.value]
      if (maskPattern) {
        const spec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
        previewRenderer.render(spec, { clear: false })
      }
    }
  }

  // Initialize preview renderer
  // Can optionally accept an external canvas (e.g., from a child component)
  const initPreview = async (externalCanvas?: HTMLCanvasElement | null) => {
    const canvas = externalCanvas ?? previewCanvasRef.value
    if (!canvas) return

    canvas.width = 1280
    canvas.height = 720
    try {
      previewRenderer = await TextureRenderer.create(canvas)
      updatePreview()
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  // Destroy all renderers
  const destroyPreview = () => {
    previewRenderer?.destroy()
    previewRenderer = null
    destroyThumbnailRenderers()
  }

  // Watch for changes
  watch(
    [selectedBackgroundIndex, selectedMaskIndex, textureColor1, textureColor2, maskInnerColor, maskOuterColor],
    updatePreview
  )
  watch([textureColor1, textureColor2], renderThumbnails)

  // Cleanup on unmount
  onUnmounted(destroyPreview)

  return {
    // Canvas ref
    previewCanvasRef,
    // Pattern data
    texturePatterns,
    maskPatterns,
    // Selection state
    selectedBackgroundIndex,
    selectedMaskIndex,
    activeSection,
    // Actions
    openSection,
    initPreview,
    destroyPreview,
  }
}
