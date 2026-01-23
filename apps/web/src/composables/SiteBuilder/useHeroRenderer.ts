/**
 * useHeroRenderer
 *
 * Scene rendering logic for HeroScene
 * Handles:
 * - Preview renderer lifecycle
 * - Canvas rendering via HeroViewConfig
 * - Canvas image data capture for contrast analysis
 */

import { shallowRef, onUnmounted, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import {
  TextureRenderer,
} from '@practice/texture'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { IntensityProvider } from '@practice/timeline'
import {
  type HeroViewConfig,
  type HeroSceneConfig,
  type Object3DRendererPort,
  renderHeroConfig,
  createPropertyResolver,
  resolveHeroViewConfig,
} from '@practice/section-visual'

// ============================================================
// Types
// ============================================================

/**
 * Editor state for viewport configuration
 */
export interface HeroSceneEditorState {
  config: HeroSceneConfig
}

/**
 * Options for useHeroRenderer composable
 */
export interface UseHeroRendererOptions {
  /** Primitive palette for rendering */
  primitivePalette: ComputedRef<PrimitivePalette>
  /** Editor state with viewport configuration */
  editorState: Ref<HeroSceneEditorState>
  /** Function to build HeroViewConfig from current state */
  toHeroViewConfig: () => HeroViewConfig
  /** IntensityProvider for timeline-driven animations (optional) */
  intensityProvider?: IntensityProvider
}

/**
 * Return type for useHeroRenderer composable
 */
export interface UseHeroRendererReturn {
  /** Preview renderer instance */
  previewRenderer: ShallowRef<TextureRenderer | null>
  /** Cached canvas ImageData for contrast analysis */
  canvasImageData: ShallowRef<ImageData | null>
  /** 3D object renderers map */
  object3DRenderers: Map<string, Object3DRendererPort>
  /** Loaded model URLs map */
  loadedModelUrls: Map<string, string>
  /** Initialize preview canvas */
  initPreview: (canvas?: HTMLCanvasElement | null) => Promise<void>
  /** Destroy preview renderer */
  destroyPreview: () => void
  /** Render scene from config */
  render: () => Promise<void>
  /** Render scene using HeroViewConfig-based pipeline */
  renderSceneFromConfig: () => Promise<void>
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for scene rendering in HeroScene
 */
export function useHeroRenderer(options: UseHeroRendererOptions): UseHeroRendererReturn {
  const { primitivePalette, editorState, toHeroViewConfig, intensityProvider } = options

  // ============================================================
  // Renderer State
  // ============================================================
  const previewRenderer = shallowRef<TextureRenderer | null>(null)
  const canvasImageData = shallowRef<ImageData | null>(null)

  // 3D Object Renderers (keyed by layer ID)
  const object3DRenderers = new Map<string, Object3DRendererPort>()
  // Track loaded model URLs to avoid reloading
  const loadedModelUrls = new Map<string, string>()

  // PropertyResolver for timeline-driven params
  const propertyResolver = intensityProvider ? createPropertyResolver(intensityProvider) : null

  // Unsubscribe function for intensity change listener
  let unsubscribeIntensityChange: (() => void) | null = null

  // ============================================================
  // Rendering Functions
  // ============================================================

  /**
   * Render scene using HeroViewConfig-based pipeline
   */
  const renderSceneFromConfig = async () => {
    if (!previewRenderer.value) return

    let config = toHeroViewConfig()

    // Resolve PropertyValue RangeExpr if PropertyResolver is available
    if (propertyResolver) {
      config = resolveHeroViewConfig(config, propertyResolver)
    }

    await renderHeroConfig(previewRenderer.value, config, primitivePalette.value)

    // Update cached ImageData for contrast analysis
    try {
      canvasImageData.value = await previewRenderer.value.readPixels()
    } catch {
      // Ignore errors (e.g., if canvas is not ready)
    }
  }

  /**
   * Render the hero scene using HeroViewConfig-based pipeline
   */
  const render = async () => {
    await renderSceneFromConfig()
  }

  // ============================================================
  // Initialization & Cleanup
  // ============================================================

  /**
   * Initialize preview canvas
   */
  const initPreview = async (canvas?: HTMLCanvasElement | null) => {
    if (!canvas) return

    canvas.width = editorState.value.config.width
    canvas.height = editorState.value.config.height

    try {
      previewRenderer.value = await TextureRenderer.create(canvas)
      await render()

      // Subscribe to IntensityProvider for automatic re-rendering on intensity changes
      if (intensityProvider) {
        unsubscribeIntensityChange = intensityProvider.onIntensityChange(() => {
          // Re-render when timeline intensities change
          render()
        })
      }
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  /**
   * Destroy preview renderer and cleanup
   */
  const destroyPreview = () => {
    // Unsubscribe from IntensityProvider
    if (unsubscribeIntensityChange) {
      unsubscribeIntensityChange()
      unsubscribeIntensityChange = null
    }

    previewRenderer.value?.destroy()
    previewRenderer.value = null

    // Cleanup 3D object renderers
    for (const renderer of object3DRenderers.values()) {
      renderer.dispose()
    }
    object3DRenderers.clear()
    loadedModelUrls.clear()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    destroyPreview()
  })

  // ============================================================
  // Return
  // ============================================================
  return {
    previewRenderer,
    canvasImageData,
    object3DRenderers,
    loadedModelUrls,
    initPreview,
    destroyPreview,
    render,
    renderSceneFromConfig,
  }
}
