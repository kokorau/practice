/**
 * useHeroSceneRenderer
 *
 * WebGPUレンダラーのライフサイクル管理を担当するcomposable
 * - プレビューキャンバスの初期化・破棄
 * - シーンのレンダリング
 */

import { type ComputedRef, type ShallowRef } from 'vue'
import type { TextureRenderer } from '@practice/texture'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { IntensityProvider } from '@practice/timeline'
import {
  type HeroViewRepository,
  renderHeroConfig,
  createPropertyResolver,
  resolveHeroViewConfig,
} from '@practice/section-visual'
import { createSharedRenderer } from '../../services/createSharedRenderer'

export interface HeroSceneEditorConfig {
  width: number
  height: number
  devicePixelRatio: number
}

export interface UseHeroSceneRendererOptions {
  primitivePalette: ComputedRef<PrimitivePalette>
  heroViewRepository: HeroViewRepository
  canvasImageData: ShallowRef<ImageData | null>
  editorConfig: ComputedRef<HeroSceneEditorConfig>
  onDestroyPreview?: () => void
  /** Lazy getter for imageRegistry (to handle circular initialization order) */
  getImageRegistry?: () => Map<string, ImageBitmap>
  /** Lazy getter for IntensityProvider (to handle async mount order) */
  getIntensityProvider?: () => IntensityProvider | undefined
}

export interface UseHeroSceneRendererReturn {
  initPreview: (canvas?: HTMLCanvasElement | null) => Promise<void>
  destroyPreview: () => void
  render: () => Promise<void>
  renderSceneFromConfig: () => Promise<void>
}

export const useHeroSceneRenderer = (
  options: UseHeroSceneRendererOptions
): UseHeroSceneRendererReturn => {
  const {
    primitivePalette,
    heroViewRepository,
    canvasImageData,
    editorConfig,
    onDestroyPreview,
    getImageRegistry,
    getIntensityProvider,
  } = options

  let previewRenderer: TextureRenderer | null = null

  // Unsubscribe function for intensity change listener
  let unsubscribeIntensityChange: (() => void) | null = null

  const renderSceneFromConfig = async () => {
    if (!previewRenderer) return
    let config = heroViewRepository.get()
    const imageRegistry = getImageRegistry?.()

    // Resolve PropertyValue RangeExpr if IntensityProvider is available
    const intensityProvider = getIntensityProvider?.()
    if (intensityProvider) {
      const propertyResolver = createPropertyResolver(intensityProvider)
      config = resolveHeroViewConfig(config, propertyResolver)
    }

    await renderHeroConfig(previewRenderer, config, primitivePalette.value, {
      imageRegistry,
    })
    try {
      canvasImageData.value = await previewRenderer.readPixels()
    } catch {
      // Ignore errors
    }
  }

  const render = async () => {
    await renderSceneFromConfig()
  }

  const initPreview = async (canvas?: HTMLCanvasElement | null) => {
    if (!canvas) return
    canvas.width = editorConfig.value.width
    canvas.height = editorConfig.value.height

    try {
      // Use shared GPUDevice via createSharedRenderer
      previewRenderer = await createSharedRenderer(canvas)

      await render()

      // Subscribe to IntensityProvider for automatic re-rendering on intensity changes
      // Use getter to get the provider at subscription time
      const intensityProvider = getIntensityProvider?.()
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

  const destroyPreview = () => {
    // Unsubscribe from IntensityProvider
    if (unsubscribeIntensityChange) {
      unsubscribeIntensityChange()
      unsubscribeIntensityChange = null
    }

    previewRenderer?.destroy()
    previewRenderer = null
    onDestroyPreview?.()
  }

  return {
    initPreview,
    destroyPreview,
    render,
    renderSceneFromConfig,
  }
}
