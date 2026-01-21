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
import type { ParamResolver } from '@practice/timeline'
import {
  type HeroViewRepository,
  renderHeroConfig,
  createPropertyResolver,
  resolveHeroViewConfig,
} from '@practice/section-visual'

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
  /** Lazy getter for ParamResolver (to handle async mount order) */
  getParamResolver?: () => ParamResolver | undefined
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
    getParamResolver,
  } = options

  let previewRenderer: TextureRenderer | null = null

  // Unsubscribe function for param change listener
  let unsubscribeParamChange: (() => void) | null = null

  const renderSceneFromConfig = async () => {
    if (!previewRenderer) return
    let config = heroViewRepository.get()
    const imageRegistry = getImageRegistry?.()

    // Resolve PropertyValue bindings if ParamResolver is available
    const paramResolver = getParamResolver?.()
    if (paramResolver) {
      const propertyResolver = createPropertyResolver(paramResolver)
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
      const { TextureRenderer } = await import('@practice/texture')
      previewRenderer = await TextureRenderer.create(canvas)
      await render()

      // Subscribe to ParamResolver for automatic re-rendering on param changes
      // Use getter to get the resolver at subscription time
      const paramResolver = getParamResolver?.()
      if (paramResolver) {
        unsubscribeParamChange = paramResolver.onParamChange(() => {
          // Re-render when timeline params change
          render()
        })
      }
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  const destroyPreview = () => {
    // Unsubscribe from ParamResolver
    if (unsubscribeParamChange) {
      unsubscribeParamChange()
      unsubscribeParamChange = null
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
