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
  getSurfacePresets,
  createCircleStripeSpec,
  createCircleGridSpec,
  createCirclePolkaDotSpec,
  createRectStripeSpec,
  createRectGridSpec,
  createRectPolkaDotSpec,
  createBlobStripeSpec,
  createBlobGridSpec,
  createBlobPolkaDotSpec,
  // Simple texture specs (no mask) for thumbnails
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  type TexturePattern,
  type MaskPattern,
  type RGBA,
  type CircleMaskShapeConfig,
  type RectMaskShapeConfig,
  type BlobMaskShapeConfig,
  type Viewport,
  type TextureRenderSpec,
  type SurfacePreset,
  type StripePresetParams,
  type GridPresetParams,
  type PolkaDotPresetParams,
} from '@practice/texture'
import { createThreeObjectRenderer, type ThreeObjectRenderer } from './useThreeObject'
// Filters (separate subpath for tree-shaking)
import {
  createVignetteSpec,
  chromaticAberrationShader,
  createChromaticAberrationUniforms,
  CHROMATIC_ABERRATION_BUFFER_SIZE,
} from '@practice/texture/filters'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import {
  type LayerFilterConfig,
  type HeroSceneEditorState,
  type EditorCanvasLayer,
  createHeroSceneEditorState,
  createDefaultFilterConfig,
} from '../../modules/HeroScene'

// ============================================================
// Types
// ============================================================

/**
 * Midground texture preset - filtered subset of SurfacePreset
 * Only stripe, grid, and polkaDot are supported for masked textures
 */
export type MidgroundPresetParams = StripePresetParams | GridPresetParams | PolkaDotPresetParams

export interface MidgroundSurfacePreset {
  label: string
  params: MidgroundPresetParams
}

export type SectionType = 'background' | 'mask-surface' | 'mask-shape' | 'foreground' | 'filter'

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
  OBJECT: 'object-layer',
} as const

/**
 * Filter SurfacePresets to get only midground-compatible presets (stripe, grid, polkaDot)
 */
const getMidgroundPresets = (): MidgroundSurfacePreset[] => {
  return getSurfacePresets()
    .filter((p): p is SurfacePreset & { params: MidgroundPresetParams } =>
      p.params.type === 'stripe' || p.params.type === 'grid' || p.params.type === 'polkaDot'
    )
}

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
  const midgroundTexturePatterns = getMidgroundPresets()

  // ============================================================
  // Editor State (index-based for UI management)
  // ============================================================
  const editorState = ref<HeroSceneEditorState>(createHeroSceneEditorState({ width: 1280, height: 720 }))

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
  // Per-Layer Filter State
  // ============================================================
  // 選択中のレイヤーのフィルター編集用
  const selectedFilterLayerId = ref<string | null>(LAYER_IDS.BASE)

  // レイヤーごとのフィルター設定を保持（syncSceneLayersで再生成されても維持）
  const layerFilterConfigs = ref<Map<string, LayerFilterConfig>>(new Map([
    [LAYER_IDS.BASE, createDefaultFilterConfig()],
    [LAYER_IDS.MASK, createDefaultFilterConfig()],
  ]))

  // 選択中レイヤーのフィルター設定へのアクセサ
  const selectedLayerFilters = computed(() => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return null
    return layerFilterConfigs.value.get(layerId) ?? null
  })

  // フィルター設定を更新（部分更新をサポート）
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
  }

  const updateLayerFilters = (layerId: string, updates: DeepPartial<LayerFilterConfig>) => {
    const current = layerFilterConfigs.value.get(layerId) ?? createDefaultFilterConfig()
    const updated: LayerFilterConfig = {
      vignette: { ...current.vignette, ...(updates.vignette ?? {}) },
      chromaticAberration: { ...current.chromaticAberration, ...(updates.chromaticAberration ?? {}) },
    }
    layerFilterConfigs.value.set(layerId, updated)

    // エディタ状態のレイヤーも更新
    editorState.value = {
      ...editorState.value,
      canvasLayers: editorState.value.canvasLayers.map(l =>
        l.id === layerId ? { ...l, filters: updated } : l
      ),
    }
  }

  // ============================================================
  // Renderer State
  // ============================================================
  let previewRenderer: TextureRenderer | null = null
  const thumbnailRenderers: TextureRenderer[] = []
  let threeObjectRenderer: ThreeObjectRenderer | null = null
  let threeObjectBitmap: ImageBitmap | null = null
  const threeObjectModelUrl = ref<string | null>(null)

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
   * Create default layers (base + mask)
   * Called once during initialization
   */
  const createDefaultLayers = () => {
    const baseFilters = layerFilterConfigs.value.get(LAYER_IDS.BASE) ?? createDefaultFilterConfig()
    const maskFilters = layerFilterConfigs.value.get(LAYER_IDS.MASK) ?? createDefaultFilterConfig()

    const layers: EditorCanvasLayer[] = [
      {
        id: LAYER_IDS.BASE,
        name: 'Background Texture',
        visible: true,
        opacity: 1.0,
        zIndex: 0,
        blendMode: 'normal',
        filters: baseFilters,
        config: { type: 'texture', patternIndex: selectedBackgroundIndex.value },
      },
      {
        id: LAYER_IDS.MASK,
        name: 'Mask Layer',
        visible: true,
        opacity: 1.0,
        zIndex: 1,
        blendMode: 'normal',
        filters: maskFilters,
        config: {
          type: 'maskedTexture',
          maskIndex: selectedMaskIndex.value ?? 0,
          textureIndex: selectedMidgroundTextureIndex.value,
        },
      },
    ]

    editorState.value = {
      ...editorState.value,
      canvasLayers: layers,
    }
  }

  /**
   * Sync layer configs with current selection state
   * Updates existing layers' config without recreating them
   */
  const syncLayerConfigs = () => {
    const layers = editorState.value.canvasLayers

    for (const layer of layers) {
      // Update base layer config
      if (layer.id === LAYER_IDS.BASE) {
        if (customBackgroundBitmap) {
          layer.config = { type: 'image', source: customBackgroundBitmap }
          layer.name = 'Background Image'
        } else {
          layer.config = { type: 'texture', patternIndex: selectedBackgroundIndex.value }
          layer.name = 'Background Texture'
        }
      }

      // Update mask layer configs (all maskedTexture layers share the same settings)
      if (layer.config.type === 'maskedTexture') {
        layer.config = {
          type: 'maskedTexture',
          maskIndex: selectedMaskIndex.value ?? 0,
          textureIndex: selectedMidgroundTextureIndex.value,
        }
      }
    }

    // Trigger reactivity
    editorState.value = { ...editorState.value }
  }

  // ============================================================
  // Layer Operations (public API)
  // ============================================================

  /**
   * Add a new mask layer (limited to 1 mask layer)
   * Returns null if a mask layer already exists
   */
  const addMaskLayer = (): string | null => {
    // Check if mask layer already exists
    const existingMask = editorState.value.canvasLayers.find(
      l => l.config.type === 'maskedTexture'
    )
    if (existingMask) return null

    const id = `mask-${Date.now()}`
    const newLayer: EditorCanvasLayer = {
      id,
      name: 'Mask Layer',
      visible: true,
      opacity: 1.0,
      zIndex: editorState.value.canvasLayers.length,
      blendMode: 'normal',
      filters: createDefaultFilterConfig(),
      config: {
        type: 'maskedTexture',
        maskIndex: selectedMaskIndex.value ?? 0,
        textureIndex: selectedMidgroundTextureIndex.value,
      },
    }

    // Register filter config for new layer
    layerFilterConfigs.value.set(id, createDefaultFilterConfig())

    editorState.value = {
      ...editorState.value,
      canvasLayers: [...editorState.value.canvasLayers, newLayer],
    }

    renderScene()
    return id
  }

  /**
   * Remove a layer by ID (base layer cannot be removed)
   */
  const removeLayer = (id: string): boolean => {
    if (id === LAYER_IDS.BASE) return false

    const newLayers = editorState.value.canvasLayers.filter(l => l.id !== id)
    if (newLayers.length === editorState.value.canvasLayers.length) return false

    // Remove filter config
    layerFilterConfigs.value.delete(id)

    editorState.value = {
      ...editorState.value,
      canvasLayers: newLayers,
    }

    renderScene()
    return true
  }

  /**
   * Update layer visibility
   */
  const updateLayerVisibility = (id: string, visible: boolean) => {
    const layer = editorState.value.canvasLayers.find(l => l.id === id)
    if (!layer) return

    layer.visible = visible
    editorState.value = { ...editorState.value }
    renderScene()
  }

  /**
   * Toggle layer visibility
   */
  const toggleLayerVisibility = (id: string) => {
    const layer = editorState.value.canvasLayers.find(l => l.id === id)
    if (!layer) return

    layer.visible = !layer.visible
    editorState.value = { ...editorState.value }
    renderScene()
  }

  /**
   * Add a 3D object layer from GLTF model URL
   * Returns null if object layer already exists
   */
  const addThreeObjectLayer = async (modelUrl: string): Promise<string | null> => {
    // Check if object layer already exists
    const existingObject = editorState.value.canvasLayers.find(
      l => l.id === LAYER_IDS.OBJECT
    )
    if (existingObject) return null

    // Create Three.js renderer if not exists
    if (!threeObjectRenderer) {
      threeObjectRenderer = createThreeObjectRenderer({
        width: editorState.value.config.width,
        height: editorState.value.config.height,
      })
    }

    // Load and render model
    await threeObjectRenderer.loadModel(modelUrl)
    threeObjectBitmap = await threeObjectRenderer.render()
    threeObjectModelUrl.value = modelUrl

    // Create object layer
    const newLayer: EditorCanvasLayer = {
      id: LAYER_IDS.OBJECT,
      name: '3D Object',
      visible: true,
      opacity: 1.0,
      zIndex: editorState.value.canvasLayers.length,
      blendMode: 'normal',
      filters: createDefaultFilterConfig(),
      config: {
        type: 'image',
        source: threeObjectBitmap,
      },
    }

    // Register filter config for new layer
    layerFilterConfigs.value.set(LAYER_IDS.OBJECT, createDefaultFilterConfig())

    editorState.value = {
      ...editorState.value,
      canvasLayers: [...editorState.value.canvasLayers, newLayer],
    }

    renderScene()
    return LAYER_IDS.OBJECT
  }

  /**
   * Remove 3D object layer and cleanup resources
   */
  const removeThreeObjectLayer = (): boolean => {
    const result = removeLayer(LAYER_IDS.OBJECT)
    if (result) {
      if (threeObjectBitmap) {
        threeObjectBitmap.close()
        threeObjectBitmap = null
      }
      if (threeObjectRenderer) {
        threeObjectRenderer.dispose()
        threeObjectRenderer = null
      }
      threeObjectModelUrl.value = null
    }
    return result
  }

  // ============================================================
  // Rendering
  // ============================================================

  const createMaskedTextureSpec = (
    maskPattern: MaskPattern,
    preset: MidgroundSurfacePreset,
    color1: RGBA,
    color2: RGBA,
    viewport: Viewport
  ): TextureRenderSpec | null => {
    const { maskConfig } = maskPattern
    const { params } = preset

    if (maskConfig.type === 'circle') {
      const circleMask: CircleMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createCircleStripeSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createCircleGridSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createCirclePolkaDotSpec(
          color1, color2,
          { type: 'circle', centerX: circleMask.centerX, centerY: circleMask.centerY, radius: circleMask.radius },
          params,
          viewport
        )
      }
    }

    if (maskConfig.type === 'rect') {
      const rectMask: RectMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createRectStripeSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createRectGridSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createRectPolkaDotSpec(
          color1, color2,
          { type: 'rect', left: rectMask.left, right: rectMask.right, top: rectMask.top, bottom: rectMask.bottom, radiusTopLeft: rectMask.radiusTopLeft, radiusTopRight: rectMask.radiusTopRight, radiusBottomLeft: rectMask.radiusBottomLeft, radiusBottomRight: rectMask.radiusBottomRight },
          params,
          viewport
        )
      }
    }

    if (maskConfig.type === 'blob') {
      const blobMask: BlobMaskShapeConfig = maskConfig
      if (params.type === 'stripe') {
        return createBlobStripeSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed },
          params,
          viewport
        )
      }
      if (params.type === 'grid') {
        return createBlobGridSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed },
          params,
          viewport
        )
      }
      if (params.type === 'polkaDot') {
        return createBlobPolkaDotSpec(
          color1, color2,
          { type: 'blob', centerX: blobMask.centerX, centerY: blobMask.centerY, baseRadius: blobMask.baseRadius, amplitude: blobMask.amplitude, octaves: blobMask.octaves, seed: blobMask.seed },
          params,
          viewport
        )
      }
    }

    return null
  }

  /**
   * Apply filters to current canvas content for a layer
   */
  const applyLayerFilters = (layer: EditorCanvasLayer, viewport: Viewport) => {
    if (!previewRenderer) return

    const { filters } = layer

    // Chromatic Aberration (requires texture input, must be applied first)
    if (filters.chromaticAberration.enabled) {
      const inputTexture = previewRenderer.copyCanvasToTexture()
      const uniforms = createChromaticAberrationUniforms(
        { intensity: filters.chromaticAberration.intensity, angle: 0 },
        viewport
      )
      previewRenderer.applyPostEffect(
        { shader: chromaticAberrationShader, uniforms, bufferSize: CHROMATIC_ABERRATION_BUFFER_SIZE },
        inputTexture,
        { clear: true }
      )
    }

    // Vignette (overlay, applied last)
    if (filters.vignette.enabled) {
      const vignetteSpec = createVignetteSpec(
        {
          color: [0, 0, 0, 1],
          intensity: filters.vignette.intensity,
          radius: filters.vignette.radius,
          softness: filters.vignette.softness,
        },
        viewport
      )
      previewRenderer.render(vignetteSpec, { clear: false })
    }
  }

  /**
   * Render editor state based on current layer configuration
   * Each layer's filters are applied after that layer is rendered
   */
  const renderScene = async () => {
    if (!previewRenderer) return

    const viewport = previewRenderer.getViewport()

    // Iterate through editor layers in zIndex order
    let isFirstVisible = true
    for (let i = 0; i < editorState.value.canvasLayers.length; i++) {
      const layer = editorState.value.canvasLayers[i]
      if (!layer || !layer.visible) continue

      const isFirst = isFirstVisible
      isFirstVisible = false

      switch (layer.config.type) {
        case 'image':
          if (customBackgroundBitmap) {
            await previewRenderer.renderImage(customBackgroundBitmap)
          }
          break

        case 'texture': {
          const bgPattern = texturePatterns[layer.config.patternIndex]
          if (bgPattern) {
            const spec = bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
            previewRenderer.render(spec, { clear: isFirst })
          }
          break
        }

        case 'maskedTexture': {
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

      // Apply per-layer filters after rendering the layer
      applyLayerFilters(layer, viewport)
    }
  }

  // ============================================================
  // Thumbnail Rendering
  // ============================================================

  /**
   * Create a full-viewport spec for midground texture thumbnail
   * Uses simple (non-masked) texture shaders for proper display
   */
  const createMidgroundThumbnailSpec = (
    preset: MidgroundSurfacePreset,
    color1: RGBA,
    color2: RGBA,
    _viewport: Viewport
  ): TextureRenderSpec | null => {
    const { params } = preset

    if (params.type === 'stripe') {
      return createStripeSpec({
        color1,
        color2,
        width1: params.width1,
        width2: params.width2,
        angle: params.angle,
      })
    }
    if (params.type === 'grid') {
      return createGridSpec({
        lineColor: color1,
        bgColor: color2,
        lineWidth: params.lineWidth,
        cellSize: params.cellSize,
      })
    }
    if (params.type === 'polkaDot') {
      return createPolkaDotSpec({
        dotColor: color1,
        bgColor: color2,
        dotRadius: params.dotRadius,
        spacing: params.spacing,
        rowOffset: params.rowOffset,
      })
    }
    return null
  }

  const getPatterns = (section: SectionType): (TexturePattern | MaskPattern)[] => {
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

    // Handle mask-surface section separately
    if (section === 'mask-surface') {
      for (let i = 0; i < thumbnailRenderers.length; i++) {
        const renderer = thumbnailRenderers[i]
        const pattern = midgroundTexturePatterns[i]
        if (renderer && pattern) {
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
      }
      return
    }

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
      const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-thumbnail-canvas]')

      // Handle mask-surface section separately (uses midgroundTexturePatterns)
      if (section === 'mask-surface') {
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i]
          if (!canvas) continue
          canvas.width = 256
          canvas.height = 144
          try {
            const renderer = await TextureRenderer.create(canvas)
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

      // Handle background and mask-shape sections
      const patterns = getPatterns(section)
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

    canvas.width = editorState.value.config.width
    canvas.height = editorState.value.config.height

    try {
      previewRenderer = await TextureRenderer.create(canvas)

      // Create default layers only if none exist
      if (editorState.value.canvasLayers.length === 0) {
        createDefaultLayers()
      }

      await renderScene()
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  const destroyPreview = () => {
    previewRenderer?.destroy()
    previewRenderer = null
    destroyThumbnailRenderers()

    // Cleanup Three.js resources
    if (threeObjectBitmap) {
      threeObjectBitmap.close()
      threeObjectBitmap = null
    }
    if (threeObjectRenderer) {
      threeObjectRenderer.dispose()
      threeObjectRenderer = null
    }
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

    syncLayerConfigs()
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

    syncLayerConfigs()
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

    syncLayerConfigs()
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

    syncLayerConfigs()
    renderScene()
  }

  // ============================================================
  // Watchers
  // ============================================================

  watch(
    [selectedBackgroundIndex, selectedMaskIndex, selectedMidgroundTextureIndex],
    () => {
      syncLayerConfigs()
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

  // Filter watchers - watch the Map's changes via deep watch
  watch(
    layerFilterConfigs,
    () => renderScene(),
    { deep: true }
  )

  onUnmounted(() => {
    destroyPreview()
    clearBackgroundImage()
    clearMaskImage()
  })

  // ============================================================
  // Public API
  // ============================================================

  return {
    // Editor State (for debugging/inspection)
    editorState,

    // Pattern data
    texturePatterns,
    maskPatterns,
    midgroundTexturePatterns,

    // Colors for thumbnail rendering
    textureColor1,
    textureColor2,
    midgroundTextureColor1,
    midgroundTextureColor2,

    // Spec creators for thumbnails
    createMidgroundThumbnailSpec,

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

    // Per-layer filters
    selectedFilterLayerId,
    selectedLayerFilters,
    layerFilterConfigs,
    updateLayerFilters,

    // Layer operations
    addMaskLayer,
    removeLayer,
    updateLayerVisibility,
    toggleLayerVisibility,

    // 3D Object layer
    threeObjectModelUrl,
    addThreeObjectLayer,
    removeThreeObjectLayer,

    // Actions
    openSection,
    initPreview,
    destroyPreview,
  }
}
