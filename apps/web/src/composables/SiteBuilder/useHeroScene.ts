/**
 * useHeroScene
 *
 * HeroSceneモジュールをVueのリアクティブシステムと連携するcomposable
 * 現在は2レイヤー固定（base, mask）
 */

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
import {
  type HeroScene,
  type CanvasLayer,
  createHeroScene,
  createTextureLayer,
  createMaskedTextureLayer,
  createImageLayer,
  updateCanvasLayer,
} from '../../modules/HeroScene'

// ============================================================
// Types
// ============================================================

export interface MidgroundTexturePattern {
  label: string
  type: 'stripe' | 'grid' | 'polkaDot'
  config: {
    width1?: number
    width2?: number
    angle?: number
    lineWidth?: number
    cellSize?: number
    dotRadius?: number
    spacing?: number
    rowOffset?: number
  }
}

export type SectionType = 'background' | 'mask-surface' | 'mask-shape' | 'foreground'

export interface UseHeroSceneOptions {
  primitivePalette: ComputedRef<PrimitivePalette>
  isDark: ComputedRef<boolean>
}

// ============================================================
// Constants
// ============================================================

const LAYER_IDS = {
  BASE: 'base-layer',
  MASK: 'mask-layer',
} as const

const defaultMidgroundTexturePatterns: MidgroundTexturePattern[] = [
  { label: 'Diagonal 45°', type: 'stripe', config: { width1: 20, width2: 20, angle: Math.PI / 4 } },
  { label: 'Horizontal', type: 'stripe', config: { width1: 15, width2: 15, angle: 0 } },
  { label: 'Vertical', type: 'stripe', config: { width1: 10, width2: 10, angle: Math.PI / 2 } },
  { label: 'Grid', type: 'grid', config: { lineWidth: 2, cellSize: 30 } },
  { label: 'Polka Dot', type: 'polkaDot', config: { dotRadius: 10, spacing: 40, rowOffset: 0.5 } },
]

// ============================================================
// Helpers
// ============================================================

const paletteToRgba = (oklch: Oklch, alpha: number = 1.0): RGBA => {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

// ============================================================
// Composable
// ============================================================

export const useHeroScene = (options: UseHeroSceneOptions) => {
  const { primitivePalette, isDark } = options

  // ============================================================
  // Pattern Definitions
  // ============================================================
  const texturePatterns = getDefaultTexturePatterns()
  const maskPatterns = getDefaultMaskPatterns()
  const midgroundTexturePatterns = defaultMidgroundTexturePatterns

  // ============================================================
  // Scene State (using HeroScene types internally)
  // ============================================================
  const scene = ref<HeroScene>(createHeroScene({ width: 1280, height: 720 }))

  // Selection state (UI bindings)
  const selectedBackgroundIndex = ref(3)
  const selectedMaskIndex = ref<number | null>(21)
  const selectedMidgroundTextureIndex = ref<number | null>(null)
  const activeSection = ref<SectionType | null>(null)

  // Custom background image
  const customBackgroundImage = ref<string | null>(null)
  const customBackgroundFile = ref<File | null>(null)
  let customBackgroundBitmap: ImageBitmap | null = null

  // Custom mask image
  const customMaskImage = ref<string | null>(null)
  const customMaskFile = ref<File | null>(null)
  let customMaskBitmap: ImageBitmap | null = null

  // ============================================================
  // Renderer State
  // ============================================================
  let previewRenderer: TextureRenderer | null = null
  const thumbnailRenderers: TextureRenderer[] = []

  // ============================================================
  // Computed Colors
  // ============================================================
  const canvasSurfaceKey = computed((): 'F1' | 'F8' => (isDark.value ? 'F8' : 'F1'))
  const textureColor1 = computed((): RGBA => paletteToRgba(primitivePalette.value.B))
  const textureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))
  const maskInnerColor = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value], 0))
  const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

  const midgroundTextureColor1 = computed((): RGBA => {
    const surface = primitivePalette.value[canvasSurfaceKey.value]
    const deltaL = isDark.value ? 0.05 : -0.05
    const shifted: Oklch = { L: surface.L + deltaL, C: surface.C, H: surface.H }
    return paletteToRgba(shifted)
  })
  const midgroundTextureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

  // ============================================================
  // Layer Management (internal)
  // ============================================================

  /**
   * Update internal scene layers based on current selection
   */
  const syncSceneLayers = () => {
    const layers: CanvasLayer[] = []

    // Base layer (background)
    if (customBackgroundBitmap) {
      layers.push(createImageLayer(LAYER_IDS.BASE, customBackgroundBitmap, {
        zIndex: 0,
        name: 'Background Image',
      }))
    } else {
      layers.push(createTextureLayer(LAYER_IDS.BASE, selectedBackgroundIndex.value, {
        zIndex: 0,
        name: 'Background Texture',
      }))
    }

    // Mask layer (midground)
    if (selectedMaskIndex.value !== null) {
      layers.push(createMaskedTextureLayer(
        LAYER_IDS.MASK,
        selectedMaskIndex.value,
        selectedMidgroundTextureIndex.value,
        { zIndex: 1, name: 'Mask Layer' }
      ))
    }

    scene.value = {
      ...scene.value,
      canvasLayers: layers,
    }
  }

  // ============================================================
  // Rendering
  // ============================================================

  const createMaskedTextureSpec = (
    maskPattern: MaskPattern,
    texturePattern: MidgroundTexturePattern,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ): TextureRenderSpec | null => {
    const { maskConfig } = maskPattern
    const { type: textureType, config } = texturePattern

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

    if (maskConfig.type === 'rect') {
      const rectMask: RectMaskShapeConfig = maskConfig
      if (textureType === 'stripe') {
        return createRectStripeSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight },
          { type: 'stripe', width1: config.width1!, width2: config.width2!, angle: config.angle! },
          viewport
        )
      }
      if (textureType === 'grid') {
        return createRectGridSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight },
          { type: 'grid', lineWidth: config.lineWidth!, cellSize: config.cellSize! },
          viewport
        )
      }
      if (textureType === 'polkaDot') {
        return createRectPolkaDotSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight },
          { type: 'polkaDot', dotRadius: config.dotRadius!, spacing: config.spacing!, rowOffset: config.rowOffset! },
          viewport
        )
      }
    }

    if (maskConfig.type === 'blob') {
      const blobMask: BlobMaskShapeConfig = maskConfig
      if (textureType === 'stripe') {
        return createBlobStripeSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed },
          { type: 'stripe', width1: config.width1!, width2: config.width2!, angle: config.angle! },
          viewport
        )
      }
      if (textureType === 'grid') {
        return createBlobGridSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed },
          { type: 'grid', lineWidth: config.lineWidth!, cellSize: config.cellSize! },
          viewport
        )
      }
      if (textureType === 'polkaDot') {
        return createBlobPolkaDotSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed },
          { type: 'polkaDot', dotRadius: config.dotRadius!, spacing: config.spacing!, rowOffset: config.rowOffset! },
          viewport
        )
      }
    }

    return null
  }

  /**
   * Render scene based on current layer configuration
   */
  const renderScene = async () => {
    if (!previewRenderer) return

    const viewport = previewRenderer.getViewport()

    // Iterate through layers in zIndex order
    for (let i = 0; i < scene.value.canvasLayers.length; i++) {
      const layer = scene.value.canvasLayers[i]
      if (!layer.visible) continue

      const isFirst = i === 0

      switch (layer.config.type) {
        case 'image':
          if (customBackgroundBitmap) {
            await previewRenderer.renderImage(customBackgroundBitmap)
          }
          break

        case 'texture':
          const bgPattern = texturePatterns[layer.config.patternIndex]
          if (bgPattern) {
            const spec = bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
            previewRenderer.render(spec, { clear: isFirst })
          }
          break

        case 'maskedTexture':
          const maskPattern = maskPatterns[layer.config.maskIndex]
          if (maskPattern) {
            if (layer.config.textureIndex !== null) {
              const texturePattern = midgroundTexturePatterns[layer.config.textureIndex]
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
                  break
                }
              }
            }
            // Fallback to solid color mask
            const spec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
            previewRenderer.render(spec, { clear: false })
          }
          break
      }
    }
  }

  // ============================================================
  // Thumbnail Rendering
  // ============================================================

  const getPatterns = (section: SectionType): TexturePattern[] => {
    if (section === 'background') return texturePatterns
    if (section === 'mask-shape') return maskPatterns
    return []
  }

  const destroyThumbnailRenderers = () => {
    for (const r of thumbnailRenderers) {
      r.destroy()
    }
    thumbnailRenderers.length = 0
  }

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

  const openSection = (section: SectionType) => {
    destroyThumbnailRenderers()

    if (activeSection.value === section) {
      activeSection.value = null
      return
    }

    activeSection.value = section

    nextTick(async () => {
      const patterns = getPatterns(section)
      const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-thumbnail-canvas]')

      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i]
        if (!canvas) continue
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

  // ============================================================
  // Initialization & Cleanup
  // ============================================================

  const initPreview = async (canvas?: HTMLCanvasElement | null) => {
    if (!canvas) return

    canvas.width = scene.value.config.width
    canvas.height = scene.value.config.height

    try {
      previewRenderer = await TextureRenderer.create(canvas)
      syncSceneLayers()
      await renderScene()
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  const destroyPreview = () => {
    previewRenderer?.destroy()
    previewRenderer = null
    destroyThumbnailRenderers()
  }

  // ============================================================
  // Background Image Handling
  // ============================================================

  const setBackgroundImage = async (file: File) => {
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }

    customBackgroundFile.value = file
    customBackgroundImage.value = URL.createObjectURL(file)
    customBackgroundBitmap = await createImageBitmap(file)

    syncSceneLayers()
    await renderScene()
  }

  const clearBackgroundImage = () => {
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }
    customBackgroundFile.value = null
    customBackgroundImage.value = null

    syncSceneLayers()
    renderScene()
  }

  // ============================================================
  // Mask Image Handling
  // ============================================================

  const setMaskImage = async (file: File) => {
    if (customMaskImage.value) {
      URL.revokeObjectURL(customMaskImage.value)
    }
    if (customMaskBitmap) {
      customMaskBitmap.close()
      customMaskBitmap = null
    }

    customMaskFile.value = file
    customMaskImage.value = URL.createObjectURL(file)
    customMaskBitmap = await createImageBitmap(file)

    syncSceneLayers()
    await renderScene()
  }

  const clearMaskImage = () => {
    if (customMaskImage.value) {
      URL.revokeObjectURL(customMaskImage.value)
    }
    if (customMaskBitmap) {
      customMaskBitmap.close()
      customMaskBitmap = null
    }
    customMaskFile.value = null
    customMaskImage.value = null

    syncSceneLayers()
    renderScene()
  }

  // ============================================================
  // Watchers
  // ============================================================

  watch(
    [selectedBackgroundIndex, selectedMaskIndex, selectedMidgroundTextureIndex],
    () => {
      syncSceneLayers()
      renderScene()
    }
  )

  watch(
    [textureColor1, textureColor2, maskInnerColor, maskOuterColor, midgroundTextureColor1, midgroundTextureColor2],
    () => {
      renderScene()
    }
  )

  watch([textureColor1, textureColor2], renderThumbnails)

  onUnmounted(() => {
    destroyPreview()
    clearBackgroundImage()
    clearMaskImage()
  })

  // ============================================================
  // Public API
  // ============================================================

  return {
    // Scene (for debugging/inspection)
    scene,

    // Pattern data
    texturePatterns,
    maskPatterns,
    midgroundTexturePatterns,

    // Selection state
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    activeSection,

    // Custom background
    customBackgroundImage,
    customBackgroundFile,
    setBackgroundImage,
    clearBackgroundImage,

    // Custom mask
    customMaskImage,
    customMaskFile,
    setMaskImage,
    clearMaskImage,

    // Actions
    openSection,
    initPreview,
    destroyPreview,
  }
}
