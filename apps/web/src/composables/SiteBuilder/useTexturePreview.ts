import { ref, computed, watch, nextTick, onUnmounted, type ComputedRef } from 'vue'
import {
  TextureRenderer,
  getDefaultTexturePatterns,
  getDefaultMaskPatterns,
  createCircleStripeSpec,
  createCircleGridSpec,
  createCirclePolkaDotSpec,
  createRectStripeSpec,
  createRectGridSpec,
  createRectPolkaDotSpec,
  createBlobStripeSpec,
  createBlobGridSpec,
  createBlobPolkaDotSpec,
  type TexturePattern,
  type MaskPattern,
  type RGBA,
  type CircleMaskShapeConfig,
  type RectMaskShapeConfig,
  type BlobMaskShapeConfig,
  type Viewport,
  type TextureRenderSpec,
} from '@practice/texture'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'

/**
 * Midground texture pattern definition
 */
export interface MidgroundTexturePattern {
  label: string
  type: 'stripe' | 'grid' | 'polkaDot'
  config: {
    // Stripe
    width1?: number
    width2?: number
    angle?: number
    // Grid
    lineWidth?: number
    cellSize?: number
    // PolkaDot
    dotRadius?: number
    spacing?: number
    rowOffset?: number
  }
}

/**
 * Default midground texture patterns
 */
const defaultMidgroundTexturePatterns: MidgroundTexturePattern[] = [
  { label: 'Diagonal 45°', type: 'stripe', config: { width1: 20, width2: 20, angle: Math.PI / 4 } },
  { label: 'Horizontal', type: 'stripe', config: { width1: 15, width2: 15, angle: 0 } },
  { label: 'Vertical', type: 'stripe', config: { width1: 10, width2: 10, angle: Math.PI / 2 } },
  { label: 'Grid', type: 'grid', config: { lineWidth: 2, cellSize: 30 } },
  { label: 'Polka Dot', type: 'polkaDot', config: { dotRadius: 10, spacing: 40, rowOffset: 0.5 } },
]

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
  const midgroundTexturePatterns = defaultMidgroundTexturePatterns

  // Selection state
  const selectedBackgroundIndex = ref(4) // Grid
  const selectedMaskIndex = ref<number | null>(1) // Circle Large
  const selectedMidgroundTextureIndex = ref<number | null>(null) // Midground texture (null = solid color)
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

  // Midground texture colors: canvas.surface with ΔL=5 shifted inward
  // dark mode: +5 (brighter), light mode: -5 (darker)
  const midgroundTextureColor1 = computed((): RGBA => {
    const surface = primitivePalette.value[canvasSurfaceKey.value]
    const deltaL = isDark.value ? 0.05 : -0.05
    const shifted: Oklch = { L: surface.L + deltaL, C: surface.C, H: surface.H }
    return paletteToRgba(shifted)
  })
  const midgroundTextureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

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

  /**
   * Create masked texture spec based on mask shape and texture pattern
   */
  const createMaskedTextureSpec = (
    maskPattern: MaskPattern,
    texturePattern: MidgroundTexturePattern,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ): TextureRenderSpec | null => {
    const { maskConfig } = maskPattern
    const { type: textureType, config } = texturePattern

    // Circle mask
    if (maskConfig.type === 'circle') {
      const circleMask: CircleMaskShapeConfig = maskConfig
      if (textureType === 'stripe') {
        return createCircleStripeSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius },
          { type: 'stripe', width1: config.width1!, width2: config.width2!, angle: config.angle! },
          viewport
        )
      }
      if (textureType === 'grid') {
        return createCircleGridSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius },
          { type: 'grid', lineWidth: config.lineWidth!, cellSize: config.cellSize! },
          viewport
        )
      }
      if (textureType === 'polkaDot') {
        return createCirclePolkaDotSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius },
          { type: 'polkaDot', dotRadius: config.dotRadius!, spacing: config.spacing!, rowOffset: config.rowOffset! },
          viewport
        )
      }
    }

    // Rect mask
    if (maskConfig.type === 'rect') {
      const rectMask: RectMaskShapeConfig = maskConfig
      if (textureType === 'stripe') {
        return createRectStripeSpec(
          color1, color2,
          {
            type: 'rect',
            left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom,
            radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight,
            radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight,
          },
          { type: 'stripe', width1: config.width1!, width2: config.width2!, angle: config.angle! },
          viewport
        )
      }
      if (textureType === 'grid') {
        return createRectGridSpec(
          color1, color2,
          {
            type: 'rect',
            left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom,
            radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight,
            radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight,
          },
          { type: 'grid', lineWidth: config.lineWidth!, cellSize: config.cellSize! },
          viewport
        )
      }
      if (textureType === 'polkaDot') {
        return createRectPolkaDotSpec(
          color1, color2,
          {
            type: 'rect',
            left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom,
            radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight,
            radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight,
          },
          { type: 'polkaDot', dotRadius: config.dotRadius!, spacing: config.spacing!, rowOffset: config.rowOffset! },
          viewport
        )
      }
    }

    // Blob mask
    if (maskConfig.type === 'blob') {
      const blobMask: BlobMaskShapeConfig = maskConfig
      if (textureType === 'stripe') {
        return createBlobStripeSpec(
          color1, color2,
          {
            type: 'blob',
            centerX: blobMask.centerX, centerY: blobMask.centerY,
            baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude,
            octaves: blobMask.octaves, seed: blobMask.seed,
          },
          { type: 'stripe', width1: config.width1!, width2: config.width2!, angle: config.angle! },
          viewport
        )
      }
      if (textureType === 'grid') {
        return createBlobGridSpec(
          color1, color2,
          {
            type: 'blob',
            centerX: blobMask.centerX, centerY: blobMask.centerY,
            baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude,
            octaves: blobMask.octaves, seed: blobMask.seed,
          },
          { type: 'grid', lineWidth: config.lineWidth!, cellSize: config.cellSize! },
          viewport
        )
      }
      if (textureType === 'polkaDot') {
        return createBlobPolkaDotSpec(
          color1, color2,
          {
            type: 'blob',
            centerX: blobMask.centerX, centerY: blobMask.centerY,
            baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude,
            octaves: blobMask.octaves, seed: blobMask.seed,
          },
          { type: 'polkaDot', dotRadius: config.dotRadius!, spacing: config.spacing!, rowOffset: config.rowOffset! },
          viewport
        )
      }
    }

    return null
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

    // 2. Composite midground (mask + optional texture)
    if (selectedMaskIndex.value !== null) {
      const maskPattern = maskPatterns[selectedMaskIndex.value]
      if (maskPattern) {
        // If midground texture is selected, use masked texture shader
        if (selectedMidgroundTextureIndex.value !== null) {
          const texturePattern = midgroundTexturePatterns[selectedMidgroundTextureIndex.value]
          if (texturePattern) {
            const spec = createMaskedTextureSpec(
              maskPattern,
              texturePattern,
              midgroundTextureColor1.value,
              midgroundTextureColor2.value,
              viewport
            )
            if (spec) {
              previewRenderer.render(spec, { clear: false })
              return
            }
          }
        }
        // Fallback to solid color mask
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
    [
      selectedBackgroundIndex,
      selectedMaskIndex,
      selectedMidgroundTextureIndex,
      textureColor1,
      textureColor2,
      maskInnerColor,
      maskOuterColor,
      midgroundTextureColor1,
      midgroundTextureColor2,
    ],
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
    midgroundTexturePatterns,
    // Selection state
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    activeSection,
    // Actions
    openSection,
    initPreview,
    destroyPreview,
  }
}
