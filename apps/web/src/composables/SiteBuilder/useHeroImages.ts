/**
 * useHeroImages
 *
 * Image handling for HeroScene background and mask layers
 * Handles:
 * - Background image upload and management
 * - Mask image upload and management
 * - Random image loading from Unsplash
 * - Image restoration from URLs
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import {
  type HeroViewConfig,
  type HeroViewRepository,
  type HeroSurfaceConfig,
  type BaseLayerNodeConfig,
  type SurfaceLayerNodeConfig,
  type GroupLayerNodeConfig,
  createUnsplashImageUploadAdapter,
} from '../../modules/HeroScene'

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
  // Background image
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

  // Mask image
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
  // Background Image State
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
        if (surfaceLayer?.surface.type === 'image') {
          return surfaceLayer.surface.imageId
        }
      }

      // Fallback: legacy base layer
      const baseLayer = config.layers.find((l): l is BaseLayerNodeConfig => l.type === 'base')
      if (baseLayer?.surface.type === 'image') {
        return baseLayer.surface.imageId
      }
      return null
    },
    set: (_val: string | null) => {
      console.warn('customBackgroundImage setter: use setBackgroundImage instead')
    },
  })

  // ============================================================
  // Mask Image State
  // ============================================================
  const customMaskFile = ref<File | null>(null)
  let customMaskBitmap: ImageBitmap | null = null

  const customMaskImage = computed({
    get: (): string | null => {
      const config = repoConfig.value
      if (!config) return null
      for (const layer of config.layers) {
        if (layer.type === 'surface' && layer.surface.type === 'image') {
          return layer.surface.imageId
        }
        if (layer.type === 'group' && layer.children) {
          const surfaceLayer = layer.children.find((c): c is SurfaceLayerNodeConfig => c.type === 'surface')
          if (surfaceLayer?.surface.type === 'image') {
            return surfaceLayer.surface.imageId
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
  const setBaseSurface = (surface: HeroSurfaceConfig) => {
    heroViewRepository.updateLayer(BASE_LAYER_ID, { surface })
  }

  // ============================================================
  // Background Image Functions
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
    setBaseSurface({ type: 'image', imageId })

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
    setBaseSurface({ type: 'solid' })

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
  // Mask Image Functions
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
    clearBackgroundImage()
    clearMaskImage()
  })

  // ============================================================
  // Return
  // ============================================================
  return {
    // Background image
    customBackgroundImage,
    customBackgroundFile,
    setBackgroundImage,
    clearBackgroundImage,
    loadRandomBackgroundImage,
    isLoadingRandomBackground,

    // Mask image
    customMaskImage,
    customMaskFile,
    setMaskImage,
    clearMaskImage,
    loadRandomMaskImage,
    isLoadingRandomMask,

    // Image restoration
    restoreBackgroundImage,
    restoreMaskImage,
  }
}
