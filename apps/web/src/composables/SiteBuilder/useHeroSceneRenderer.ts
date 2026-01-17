/**
 * useHeroSceneRenderer
 *
 * WebGPUレンダラーのライフサイクル管理を担当するcomposable
 * - プレビューキャンバスの初期化・破棄
 * - シーンのレンダリング
 */

import { type ComputedRef, type ShallowRef } from 'vue'
import type { TextureRenderer } from '@practice/texture'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import {
  type HeroViewRepository,
  renderHeroConfig,
} from '../../modules/HeroScene'

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
  } = options

  let previewRenderer: TextureRenderer | null = null

  const renderSceneFromConfig = async () => {
    if (!previewRenderer) return
    const config = heroViewRepository.get()
    await renderHeroConfig(previewRenderer, config, primitivePalette.value)
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
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }

  const destroyPreview = () => {
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
