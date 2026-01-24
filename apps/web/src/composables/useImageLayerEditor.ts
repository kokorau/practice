import { computed, type ComputedRef, type Ref } from 'vue'
import type { LayerNodeConfig, ImageLayerNodeConfig } from '@practice/section-visual'
import { isImageLayerConfig } from '@practice/section-visual'

// ============================================================
// Types
// ============================================================

export interface UseImageLayerEditorOptions {
  /** Currently selected layer */
  selectedLayer: ComputedRef<LayerNodeConfig | null>
  /** Map of layer ID to loading state */
  isLayerLoading: Ref<Map<string, boolean>>
  /** Get image URL for a layer */
  getImageUrl: (layerId: string) => string | null
  /** Set image file for a layer */
  setLayerImage: (layerId: string, file: File) => void
  /** Clear image from a layer */
  clearLayerImage: (layerId: string) => void
  /** Load random image for a layer */
  loadRandomImage: (layerId: string, query?: string) => void
  /** Update layer configuration */
  updateLayer: (layerId: string, updates: Partial<ImageLayerNodeConfig>) => void
}

export interface ImageLayerPropsType {
  layerId: string
  imageId: string
  mode: 'cover' | 'positioned'
  position: ImageLayerNodeConfig['position']
  imageUrl: string | null
  isLoading: boolean
}

export interface UseImageLayerEditorReturn {
  /** Computed props for image layer panel (null if not an image layer) */
  imageLayerProps: ComputedRef<ImageLayerPropsType | null>
  /** Handle image layer updates from UI */
  handleImageUpdate: (key: string, value: unknown) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing image layer editor state
 *
 * Provides:
 * - Computed props for image layer UI
 * - Update handler for image operations (upload, clear, random, mode, position)
 *
 * @example
 * ```ts
 * const { imageLayerProps, handleImageUpdate } = useImageLayerEditor({
 *   selectedLayer,
 *   isLayerLoading: heroScene.images.isLayerLoading,
 *   getImageUrl: heroScene.images.getImageUrl,
 *   setLayerImage: heroScene.images.setLayerImage,
 *   clearLayerImage: heroScene.images.clearLayerImage,
 *   loadRandomImage: heroScene.images.loadRandomImage,
 *   updateLayer: heroScene.usecase.layerUsecase.updateLayer,
 * })
 * ```
 */
export function useImageLayerEditor(options: UseImageLayerEditorOptions): UseImageLayerEditorReturn {
  const {
    selectedLayer,
    isLayerLoading,
    getImageUrl,
    setLayerImage,
    clearLayerImage,
    loadRandomImage,
    updateLayer,
  } = options

  const imageLayerProps = computed<ImageLayerPropsType | null>(() => {
    const layer = selectedLayer.value
    if (!layer || !isImageLayerConfig(layer)) return null

    const layerId = layer.id
    const isLoading = isLayerLoading.value.get(layerId) ?? false
    const imageUrl = getImageUrl(layerId)

    return {
      layerId,
      imageId: layer.imageId,
      mode: layer.mode ?? 'cover',
      position: layer.position,
      imageUrl,
      isLoading,
    }
  })

  const handleImageUpdate = (key: string, value: unknown) => {
    const layer = selectedLayer.value
    if (!layer || !isImageLayerConfig(layer)) return

    const layerId = layer.id

    switch (key) {
      case 'uploadImage':
        setLayerImage(layerId, value as File)
        break
      case 'clearImage':
        clearLayerImage(layerId)
        break
      case 'loadRandom':
        loadRandomImage(layerId, value as string | undefined)
        break
      case 'mode':
        updateLayer(layerId, { mode: value as 'cover' | 'positioned' })
        break
      case 'position':
        updateLayer(layerId, { position: value as ImageLayerNodeConfig['position'] })
        break
    }
  }

  return {
    imageLayerProps,
    handleImageUpdate,
  }
}
