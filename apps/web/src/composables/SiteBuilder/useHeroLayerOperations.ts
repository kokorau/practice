/**
 * useHeroLayerOperations
 *
 * Layer CRUD operations for HeroScene
 * - Add/remove surface, text, image, 3D object, group layers
 * - Layer tree manipulation
 */

import type {
  HeroViewRepository,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfigType,
  Model3DLayerNodeConfig,
  ImageLayerNodeConfig,
  ImagePositionConfig,
} from '@practice/section-visual'
import { createDefaultEffectConfig, findLayerInTree, isGroupLayerConfig } from '@practice/section-visual'

// ============================================================
// Types
// ============================================================

export interface EffectManagerPort {
  setEffectConfig: (layerId: string, config: ReturnType<typeof createDefaultEffectConfig>) => void
  deleteEffectConfig: (layerId: string) => void
}

export interface LayerUsecasePort {
  addLayer: (layer: LayerNodeConfig, index?: number) => void
  removeLayer: (layerId: string) => void
}

export interface ImageManagerPort {
  releaseImage: (imageId: string) => void
}

export interface UseHeroLayerOperationsOptions {
  heroViewRepository: HeroViewRepository
  effectManager: EffectManagerPort
  layerUsecase: LayerUsecasePort
  imageManager: ImageManagerPort
  render: () => void
  baseLayerId: string
}

export interface UseHeroLayerOperationsReturn {
  addMaskLayer: () => string | null
  addTextLayer: (options?: Partial<{
    text: string
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacing: number
    lineHeight: number
    color: string
    x: number
    y: number
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    rotation: number
  }>) => string
  addObjectLayer: (options?: Partial<{
    modelUrl: string
    x: number
    y: number
    z: number
    rotationX: number
    rotationY: number
    rotationZ: number
    scale: number
  }>) => string
  addImageLayer: (options?: Partial<{
    imageId: string
    mode: 'cover' | 'positioned'
    position: ImagePositionConfig
  }>) => string
  addGroupLayer: () => string
  removeLayer: (id: string) => boolean
}

// ============================================================
// Composable
// ============================================================

export function useHeroLayerOperations(options: UseHeroLayerOperationsOptions): UseHeroLayerOperationsReturn {
  const { heroViewRepository, effectManager, layerUsecase, imageManager, render, baseLayerId } = options

  const addMaskLayer = (): string | null => {
    const id = `surface-${Date.now()}`
    const surfaceLayerConfig: SurfaceLayerNodeConfig = {
      type: 'surface',
      id,
      name: 'Surface',
      visible: true,
      surface: { id: 'solid', params: {} },
      colors: { primary: 'B', secondary: 'auto' },
    }
    layerUsecase.addLayer(surfaceLayerConfig)
    effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addTextLayer = (textOptions?: Partial<{
    text: string
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacing: number
    lineHeight: number
    color: string
    x: number
    y: number
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    rotation: number
  }>): string => {
    const id = `text-${Date.now()}`
    const textLayerConfig: TextLayerNodeConfigType = {
      type: 'text',
      id,
      name: textOptions?.text?.slice(0, 20) || 'Text Layer',
      visible: true,
      text: textOptions?.text ?? 'Text',
      fontFamily: textOptions?.fontFamily ?? 'sans-serif',
      fontSize: textOptions?.fontSize ?? 48,
      fontWeight: textOptions?.fontWeight ?? 400,
      letterSpacing: textOptions?.letterSpacing ?? 0,
      lineHeight: textOptions?.lineHeight ?? 1.2,
      color: textOptions?.color ?? '#000000',
      position: {
        x: textOptions?.x ?? 0.5,
        y: textOptions?.y ?? 0.5,
        anchor: textOptions?.anchor ?? 'center',
      },
      rotation: textOptions?.rotation ?? 0,
    }
    layerUsecase.addLayer(textLayerConfig)
    effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addObjectLayer = (objectOptions?: Partial<{
    modelUrl: string
    x: number
    y: number
    z: number
    rotationX: number
    rotationY: number
    rotationZ: number
    scale: number
  }>): string => {
    const id = `object-${Date.now()}`
    const model3DLayerConfig: Model3DLayerNodeConfig = {
      type: 'model3d',
      id,
      name: 'Object Layer',
      visible: true,
      modelUrl: objectOptions?.modelUrl ?? '',
      position: {
        x: objectOptions?.x ?? 0,
        y: objectOptions?.y ?? 0,
        z: objectOptions?.z ?? 0,
      },
      rotation: {
        x: objectOptions?.rotationX ?? 0,
        y: objectOptions?.rotationY ?? 0,
        z: objectOptions?.rotationZ ?? 0,
      },
      scale: objectOptions?.scale ?? 1,
    }
    layerUsecase.addLayer(model3DLayerConfig)
    effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addImageLayer = (imageOptions?: Partial<{
    imageId: string
    mode: 'cover' | 'positioned'
    position: ImagePositionConfig
  }>): string => {
    const id = `image-${Date.now()}`
    const imageLayerConfig: ImageLayerNodeConfig = {
      type: 'image',
      id,
      name: 'Image Layer',
      visible: true,
      imageId: imageOptions?.imageId ?? '',
      mode: imageOptions?.mode ?? 'cover',
      position: imageOptions?.position,
    }
    layerUsecase.addLayer(imageLayerConfig)
    effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addGroupLayer = (): string => {
    const id = `group-${Date.now()}`
    const groupLayerConfig: GroupLayerNodeConfig = {
      type: 'group',
      id,
      name: 'Group',
      visible: true,
      children: [],
    }
    layerUsecase.addLayer(groupLayerConfig)
    render()
    return id
  }

  const removeLayer = (id: string): boolean => {
    if (id === baseLayerId) return false
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return false

    // Find layer in tree (supports nested layers)
    const layer = findLayerInTree(existingConfig.layers, id)
    if (!layer) return false

    // Collect all descendant IDs to clean up effects and image resources
    const collectDescendantIds = (node: LayerNodeConfig): string[] => {
      const ids: string[] = [node.id]
      if (isGroupLayerConfig(node)) {
        for (const child of node.children) {
          ids.push(...collectDescendantIds(child))
        }
      }
      return ids
    }

    // Collect image layer IDs for resource cleanup
    const collectImageLayerIds = (node: LayerNodeConfig): string[] => {
      const ids: string[] = []
      if (node.type === 'image') {
        ids.push(node.id)
      }
      if (isGroupLayerConfig(node)) {
        for (const child of node.children) {
          ids.push(...collectImageLayerIds(child))
        }
      }
      return ids
    }

    // Delete effect configs for all descendants
    const descendantIds = collectDescendantIds(layer)
    for (const descendantId of descendantIds) {
      effectManager.deleteEffectConfig(descendantId)
    }

    // Release image resources for all image layers being removed
    const imageLayerIds = collectImageLayerIds(layer)
    for (const imageLayerId of imageLayerIds) {
      const imageLayer = findLayerInTree(existingConfig.layers, imageLayerId) as ImageLayerNodeConfig | undefined
      if (imageLayer?.imageId) {
        imageManager.releaseImage(imageLayer.imageId)
      }
    }

    layerUsecase.removeLayer(id)
    render()
    return true
  }

  return {
    addMaskLayer,
    addTextLayer,
    addObjectLayer,
    addImageLayer,
    addGroupLayer,
    removeLayer,
  }
}
