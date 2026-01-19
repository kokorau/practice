/**
 * useHeroImages
 *
 * Image handling for HeroScene layers
 * Handles:
 * - Generic image layer management via imageRegistry
 * - Background image upload and management (legacy)
 * - Random image loading from Unsplash
 * - Image restoration from URLs
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import {
  type HeroViewConfig,
  type HeroViewRepository,
  type NormalizedSurfaceConfig,
  type BaseLayerNodeConfig,
  type SurfaceLayerNodeConfig,
  type GroupLayerNodeConfig,
  type ImageLayerNodeConfig,
} from '@practice/section-visual'
import { createUnsplashImageUploadAdapter } from '../../adapters/UnsplashImageUploadAdapter'

// Layer IDs for template layers
const BASE_LAYER_ID = 'background'

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
  // New ImageLayer API (layer-agnostic)
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

  // ============================================================
  // Legacy Background Image API (for backward compatibility)
  // ============================================================

  /** Custom background image URL (derived from Repository) */
  customBackgroundImage: ComputedRef<string | null>
  /** Custom background image file */
  customBackgroundFile: Ref<File | null>
  /** Set background image from file */
  setBackgroundImage: (file: File) => Promise<void>
  /** Clear background image */
  clearBackgroundImage: () => void
  /** Load random background image from Unsplash */
  loadRandomBackgroundImage: (query?: string) => Promise<void>
  /** Loading state for random background */
  isLoadingRandomBackground: Ref<boolean>

  // Legacy Mask image (deprecated - use ImageLayer instead)
  /** Custom mask image URL (derived from Repository) */
  customMaskImage: ComputedRef<string | null>
  /** Custom mask image file */
  customMaskFile: Ref<File | null>
  /** Set mask image from file */
  setMaskImage: (file: File) => Promise<void>
  /** Clear mask image */
  clearMaskImage: () => void
  /** Load random mask image from Unsplash */
  loadRandomMaskImage: (query?: string) => Promise<void>
  /** Loading state for random mask */
  isLoadingRandomMask: Ref<boolean>

  // Image restoration
  /** Restore background image from URL */
  restoreBackgroundImage: (imageId: string) => Promise<void>
  /** Restore mask image from URL */
  restoreMaskImage: (imageId: string) => Promise<void>
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
  const { repoConfig, heroViewRepository, render } = options

  // ============================================================
  // Image Upload Adapter
  // ============================================================
  const imageUploadAdapter = createUnsplashImageUploadAdapter()

  // ============================================================
  // Image Registry (New API)
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
  // Legacy Background Image State
  // ============================================================
  const customBackgroundFile = ref<File | null>(null)
  let customBackgroundBitmap: ImageBitmap | null = null

  const customBackgroundImage = computed({
    get: (): string | null => {
      const config = repoConfig.value
      if (!config) return null

      // New structure: look inside background-group
      const backgroundGroup = config.layers.find(
        (l): l is GroupLayerNodeConfig => l.type === 'group' && l.id === 'background-group'
      )
      if (backgroundGroup) {
        const surfaceLayer = backgroundGroup.children.find(
          (c): c is SurfaceLayerNodeConfig => c.type === 'surface' && c.id === 'background'
        )
        if (surfaceLayer?.surface.id === 'image') {
          return surfaceLayer.surface.params.imageId as string
        }
      }

      // Fallback: legacy base layer
      const baseLayer = config.layers.find((l): l is BaseLayerNodeConfig => l.type === 'base')
      if (baseLayer?.surface.id === 'image') {
        return baseLayer.surface.params.imageId as string
      }
      return null
    },
    set: (_val: string | null) => {
      console.warn('customBackgroundImage setter: use setBackgroundImage instead')
    },
  })

  // ============================================================
  // Legacy Mask Image State (deprecated)
  // ============================================================
  const customMaskFile = ref<File | null>(null)
  let customMaskBitmap: ImageBitmap | null = null

  const customMaskImage = computed({
    get: (): string | null => {
      const config = repoConfig.value
      if (!config) return null
      for (const layer of config.layers) {
        if (layer.type === 'surface' && layer.surface.id === 'image') {
          return layer.surface.params.imageId as string
        }
        if (layer.type === 'group' && layer.children) {
          const surfaceLayer = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
          if (surfaceLayer?.surface.id === 'image') {
            return surfaceLayer.surface.params.imageId as string
          }
        }
      }
      return null
    },
    set: (_val: string | null) => {
      console.warn('customMaskImage setter: use setMaskImage instead')
    },
  })

  // ============================================================
  // Loading State
  // ============================================================
  const isLoadingRandomBackground = ref(false)
  const isLoadingRandomMask = ref(false)

  // ============================================================
  // Helper Functions
  // ============================================================

  /**
   * Update base layer surface in repository
   */
  const setBaseSurface = (surface: NormalizedSurfaceConfig) => {
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface })
  }

  // ============================================================
  // Legacy Background Image Functions
  // ============================================================

  const setBackgroundImage = async (file: File) => {
    // Cleanup existing
    if (customBackgroundImage.value) {
      URL.revokeObjectURL(customBackgroundImage.value)
    }
    if (customBackgroundBitmap) {
      customBackgroundBitmap.close()
      customBackgroundBitmap = null
    }

    // Update state
    customBackgroundFile.value = file
    const imageId = URL.createObjectURL(file)
    customBackgroundBitmap = await createImageBitmap(file)

    // Update Repository
    setBaseSurface({ id: 'image', params: { imageId } })

    await render()
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

    // Update Repository
    setBaseSurface({ id: 'solid', params: {} })

    render()
  }

  const loadRandomBackgroundImage = async (query?: string) => {
    isLoadingRandomBackground.value = true
    try {
      const file = await imageUploadAdapter.fetchRandom(query)
      await setBackgroundImage(file)
    } finally {
      isLoadingRandomBackground.value = false
    }
  }

  // ============================================================
  // Legacy Mask Image Functions (deprecated)
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
    customMaskBitmap = await createImageBitmap(file)

    await render()
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

    render()
  }

  const loadRandomMaskImage = async (query?: string) => {
    isLoadingRandomMask.value = true
    try {
      const file = await imageUploadAdapter.fetchRandom(query)
      await setMaskImage(file)
    } finally {
      isLoadingRandomMask.value = false
    }
  }

  // ============================================================
  // Image Restoration
  // ============================================================

  const restoreBackgroundImage = async (imageId: string) => {
    try {
      const response = await fetch(imageId)
      const blob = await response.blob()
      const file = new File([blob], `restored-bg-${Date.now()}.jpg`, { type: blob.type })
      await setBackgroundImage(file)
    } catch (e) {
      console.error('Failed to restore background image:', e)
    }
  }

  const restoreMaskImage = async (imageId: string) => {
    try {
      const response = await fetch(imageId)
      const blob = await response.blob()
      const file = new File([blob], `restored-mask-${Date.now()}.jpg`, { type: blob.type })
      await setMaskImage(file)
    } catch (e) {
      console.error('Failed to restore mask image:', e)
    }
  }

  // ============================================================
  // Cleanup
  // ============================================================
  onUnmounted(() => {
    // Cleanup legacy images
    clearBackgroundImage()
    clearMaskImage()

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
    // New ImageLayer API
    imageRegistry,
    setLayerImage,
    clearLayerImage,
    loadRandomImage,
    getImageUrl,
    isLayerLoading,

    // Legacy Background image
    customBackgroundImage,
    customBackgroundFile,
    setBackgroundImage,
    clearBackgroundImage,
    loadRandomBackgroundImage,
    isLoadingRandomBackground,

    // Legacy Mask image
    customMaskImage,
    customMaskFile,
    setMaskImage,
    clearMaskImage,
    loadRandomMaskImage,
    isLoadingRandomMask,

    // Image restoration
    restoreBackgroundImage,
    restoreMaskImage,
    restoreLayerImage,
  }
}
