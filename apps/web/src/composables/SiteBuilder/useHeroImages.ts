/**
 * useHeroImages
 *
 * Image handling for HeroScene layers
 * Handles:
 * - Generic image layer management via imageRegistry
 * - Random image loading from Unsplash
 * - Image restoration from URLs
 */

import { ref, onUnmounted, type Ref } from 'vue'
import {
  type HeroViewConfig,
  type HeroViewRepository,
  type ImageLayerNodeConfig,
} from '@practice/section-visual'

import { createUnsplashImageUploadAdapter } from '../../adapters/UnsplashImageUploadAdapter'

// ============================================================
// Types
// ============================================================

/**
 * Options for useHeroImages composable
 */
export interface UseHeroImagesOptions {
  /** Repository config for reading image URLs */
  repoConfig: Ref<HeroViewConfig>
  /** Repository for updating image configurations */
  heroViewRepository: HeroViewRepository
  /** Render callback */
  render: () => Promise<void>
}

/**
 * Return type for useHeroImages composable
 */
export interface UseHeroImagesReturn {
  // ============================================================
  // ImageLayer API (layer-agnostic)
  // ============================================================

  /** Image registry mapping layerId/imageId to ImageBitmap */
  imageRegistry: Ref<Map<string, ImageBitmap>>

  /** Set image for any image layer */
  setLayerImage: (layerId: string, file: File) => Promise<void>

  /** Clear image for a layer */
  clearLayerImage: (layerId: string) => void

  /** Load random image for a layer */
  loadRandomImage: (layerId: string, query?: string) => Promise<void>

  /** Get image URL for a layer */
  getImageUrl: (layerId: string) => string | null

  /** Loading state per layer */
  isLayerLoading: Ref<Map<string, boolean>>

  /** Restore image for a layer from URL */
  restoreLayerImage: (layerId: string, imageId: string) => Promise<void>
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for image handling in HeroScene
 */
export function useHeroImages(options: UseHeroImagesOptions): UseHeroImagesReturn {
  const { heroViewRepository, render } = options

  // ============================================================
  // Image Upload Adapter
  // ============================================================
  const imageUploadAdapter = createUnsplashImageUploadAdapter()

  // ============================================================
  // Image Registry
  // ============================================================

  /** Registry mapping imageId to ImageBitmap */
  const imageRegistry = ref<Map<string, ImageBitmap>>(new Map())

  /** Registry mapping layerId to imageId (Object URL) */
  const layerImageUrls = ref<Map<string, string>>(new Map())

  /** Loading state per layer */
  const isLayerLoading = ref<Map<string, boolean>>(new Map())

  /**
   * Set image for an image layer
   */
  const setLayerImage = async (layerId: string, file: File) => {
    // Cleanup existing image for this layer
    const existingUrl = layerImageUrls.value.get(layerId)
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl)
      imageRegistry.value.get(existingUrl)?.close()
      imageRegistry.value.delete(existingUrl)
    }

    // Create new image
    const imageId = URL.createObjectURL(file)
    const bitmap = await createImageBitmap(file)

    // Store in registries
    layerImageUrls.value.set(layerId, imageId)
    imageRegistry.value.set(imageId, bitmap)

    // Update repository - update the ImageLayer's imageId
    heroViewRepository.updateLayer(layerId, { imageId } as Partial<ImageLayerNodeConfig>)

    await render()
  }

  /**
   * Clear image for a layer
   */
  const clearLayerImage = (layerId: string) => {
    const imageId = layerImageUrls.value.get(layerId)
    if (imageId) {
      URL.revokeObjectURL(imageId)
      imageRegistry.value.get(imageId)?.close()
      imageRegistry.value.delete(imageId)
      layerImageUrls.value.delete(layerId)
    }

    // Update repository - clear the imageId
    heroViewRepository.updateLayer(layerId, { imageId: '' } as Partial<ImageLayerNodeConfig>)

    render()
  }

  /**
   * Load random image for a layer
   */
  const loadRandomImage = async (layerId: string, query?: string) => {
    isLayerLoading.value.set(layerId, true)
    try {
      const file = await imageUploadAdapter.fetchRandom(query)
      await setLayerImage(layerId, file)
    } finally {
      isLayerLoading.value.set(layerId, false)
    }
  }

  /**
   * Get image URL for a layer
   */
  const getImageUrl = (layerId: string): string | null => {
    return layerImageUrls.value.get(layerId) ?? null
  }

  /**
   * Restore image for a layer from URL
   */
  const restoreLayerImage = async (layerId: string, imageId: string) => {
    if (!imageId) return

    try {
      const response = await fetch(imageId)
      const blob = await response.blob()
      const file = new File([blob], `restored-${layerId}-${Date.now()}.jpg`, { type: blob.type })
      await setLayerImage(layerId, file)
    } catch (e) {
      console.error(`Failed to restore image for layer ${layerId}:`, e)
    }
  }

  // ============================================================
  // Cleanup
  // ============================================================
  onUnmounted(() => {
    // Cleanup image registry
    for (const [imageId, bitmap] of imageRegistry.value) {
      URL.revokeObjectURL(imageId)
      bitmap.close()
    }
    imageRegistry.value.clear()
    layerImageUrls.value.clear()
  })

  // ============================================================
  // Return
  // ============================================================
  return {
    // ImageLayer API
    imageRegistry,
    setLayerImage,
    clearLayerImage,
    loadRandomImage,
    getImageUrl,
    isLayerLoading,

    // Image restoration
    restoreLayerImage,
  }
}
