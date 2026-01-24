/**
 * useBatchPreviewRenderer
 *
 * 複数のHeroViewConfigを単一のオフスクリーンレンダラーで順次レンダリングし、
 * 結果をdata URLとしてキャッシュするcomposable
 *
 * これにより、複数のHeroPreviewThumbnailが同時にWebGPUコンテキストを作成する問題を回避
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { TextureRenderer } from '@practice/texture'
import type { HeroViewConfig } from '@practice/section-visual'
import { renderHeroConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import {
  PREVIEW_ORIGINAL_WIDTH,
  PREVIEW_THUMBNAIL_WIDTH,
  PREVIEW_THUMBNAIL_HEIGHT,
} from '../constants/preview'
import { createSharedRenderer } from '../services/createSharedRenderer'

export interface BatchPreviewRendererOptions {
  /** Preview width (default: PREVIEW_THUMBNAIL_WIDTH) */
  width?: number
  /** Preview height (default: PREVIEW_THUMBNAIL_HEIGHT for 16:9) */
  height?: number
  /** Texture scale for rendering (default: calculated from width) */
  scale?: number
}

export function useBatchPreviewRenderer(
  configs: Ref<(HeroViewConfig | null)[]>,
  palette: Ref<PrimitivePalette | undefined>,
  options: BatchPreviewRendererOptions = {}
) {
  const width = options.width ?? PREVIEW_THUMBNAIL_WIDTH
  const height = options.height ?? PREVIEW_THUMBNAIL_HEIGHT
  const scale = options.scale ?? width / PREVIEW_ORIGINAL_WIDTH

  // Cached preview data URLs
  const previews = ref<(string | null)[]>([])
  const isRendering = ref(false)
  const error = ref<Error | null>(null)

  // Offscreen canvas and renderer (created lazily)
  let canvas: OffscreenCanvas | null = null
  let renderer: TextureRenderer | null = null
  let isDestroyed = false
  let initFailed = false // Track if WebGPU initialization has already failed

  /**
   * Initialize renderer lazily
   */
  const initRenderer = async (): Promise<TextureRenderer | null> => {
    if (isDestroyed) return null
    if (renderer) return renderer
    if (initFailed) return null // Skip if WebGPU initialization has already failed

    try {
      canvas = new OffscreenCanvas(width, height)
      // Use shared GPUDevice via createSharedRenderer
      renderer = await createSharedRenderer(canvas)
      return renderer
    } catch (e) {
      initFailed = true // Mark as failed to prevent repeated attempts
      error.value = e instanceof Error ? e : new Error('Failed to create renderer')
      console.error('WebGPU not available:', e)
      return null
    }
  }

  /**
   * Render a single config and return data URL
   */
  const renderSingle = async (
    r: TextureRenderer,
    config: HeroViewConfig,
    pal: PrimitivePalette
  ): Promise<string | null> => {
    try {
      await renderHeroConfig(r, config, pal, { scale })

      // Convert to blob then data URL
      if (!canvas) return null
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return URL.createObjectURL(blob)
    } catch (e) {
      console.error('Failed to render preview:', e)
      return null
    }
  }

  /**
   * Render all configs sequentially
   */
  const renderAll = async () => {
    if (isDestroyed) return

    const configList = configs.value
    const pal = palette.value
    if (!pal || configList.length === 0) {
      previews.value = []
      return
    }

    isRendering.value = true
    error.value = null

    try {
      const r = await initRenderer()
      if (!r || isDestroyed) {
        isRendering.value = false
        return
      }

      const results: (string | null)[] = []

      for (const config of configList) {
        if (isDestroyed) break
        if (config) {
          const dataUrl = await renderSingle(r, config, pal)
          results.push(dataUrl)
        } else {
          results.push(null)
        }
      }

      if (!isDestroyed) {
        // Revoke old URLs
        for (const url of previews.value) {
          if (url) URL.revokeObjectURL(url)
        }
        previews.value = results
      }
    } finally {
      if (!isDestroyed) {
        isRendering.value = false
      }
    }
  }

  /**
   * Cleanup
   */
  const destroy = () => {
    isDestroyed = true
    // Revoke all URLs
    for (const url of previews.value) {
      if (url) URL.revokeObjectURL(url)
    }
    previews.value = []

    renderer?.destroy()
    renderer = null
    canvas = null
  }

  // Watch for config/palette changes and re-render
  watch(
    [configs, palette],
    () => {
      renderAll()
    },
    { immediate: true, deep: true }
  )

  onUnmounted(() => {
    destroy()
  })

  return {
    previews,
    isRendering,
    error,
    refresh: renderAll,
    destroy,
  }
}
