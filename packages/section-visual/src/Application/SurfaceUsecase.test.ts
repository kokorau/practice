import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createSurfaceUsecase,
  type SurfaceUsecase,
  type SelectionPort,
} from './SurfaceUsecase'
import type { HeroViewRepository } from './ports/HeroViewRepository'
import type {
  LayerNodeConfig,
  NormalizedSurfaceConfig,
  SurfaceLayerNodeConfig,
  BaseLayerNodeConfig,
  ProcessorNodeConfig,
  MaskProcessorConfig,
} from '../Domain/HeroViewConfig'
import { $PropertyValue, type PropertyValue } from '../Domain/SectionVisual'

/**
 * Mock HeroViewRepository factory
 */
const createMockRepository = (layers: LayerNodeConfig[]): HeroViewRepository => {
  let layerStore = [...layers]

  return {
    get: vi.fn(),
    set: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    findLayer: vi.fn((layerId: string) => layerStore.find((l) => l.id === layerId)),
    updateColors: vi.fn(),
    updateViewport: vi.fn(),
    updateForeground: vi.fn(),
    updateLayer: vi.fn((layerId: string, updates: Partial<LayerNodeConfig>) => {
      layerStore = layerStore.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    }),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    reorderLayers: vi.fn(),
    wrapLayerInGroup: vi.fn(),
    wrapLayerWithMask: vi.fn(),
    moveLayer: vi.fn(),
    moveModifier: vi.fn(),
  }
}

/**
 * Mock SelectionPort factory
 */
const createMockSelection = (initialLayerId: string | null = null): SelectionPort & { setSelectedLayerId: (id: string | null) => void } => {
  let selectedLayerId = initialLayerId
  return {
    getSelectedLayerId: () => selectedLayerId,
    setSelectedLayerId: (id: string | null) => {
      selectedLayerId = id
    },
  }
}

describe('SurfaceUsecase', () => {
  describe('updateSurfaceParams', () => {
    it('does nothing when no layer is selected', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParams({ id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when selected layer is not found', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection('non-existent')
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParams({ id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when selected layer is not base or surface type', () => {
      const textLayer: LayerNodeConfig = {
        id: 'text-1',
        type: 'text',
        visible: true,
        content: 'Hello',
        position: { x: 0, y: 0, anchor: 'middle-center' },
        font: { size: 1, weight: 400, family: 'sans-serif' },
      }
      const repository = createMockRepository([textLayer])
      const selection = createMockSelection('text-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParams({ id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when surface id does not match', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'grid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      // Trying to update stripe params on a grid surface
      usecase.updateSurfaceParams({ id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('updates surface params and converts to PropertyValue', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(5),
            width2: $PropertyValue.static(10),
            angle: $PropertyValue.static(45),
          },
        },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParams({ id: 'stripe', width1: 20 })

      expect(repository.updateLayer).toHaveBeenCalledWith('surface-1', {
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(20),
            width2: $PropertyValue.static(10),
            angle: $PropertyValue.static(45),
          },
        },
      })
    })

    it('preserves existing PropertyValue (including RangeExpr) for unchanged params', () => {
      const rangeExpr: PropertyValue = {
        type: 'range',
        trackId: 'scroll',
        min: 0,
        max: 90,
      }
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(5),
            width2: $PropertyValue.static(10),
            angle: rangeExpr, // This is a RangeExpr that should be preserved
          },
        },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      // Update only width1, angle should remain as RangeExpr
      usecase.updateSurfaceParams({ id: 'stripe', width1: 20 })

      expect(repository.updateLayer).toHaveBeenCalledWith('surface-1', {
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(20),
            width2: $PropertyValue.static(10),
            angle: rangeExpr, // Should be preserved!
          },
        },
      })
    })

    it('works with base layer type', () => {
      const baseLayer: BaseLayerNodeConfig = {
        id: 'background',
        type: 'base',
        visible: true,
        surface: {
          id: 'checker',
          params: {
            cellSize: $PropertyValue.static(20),
            angle: $PropertyValue.static(0),
          },
        },
      }
      const repository = createMockRepository([baseLayer])
      const selection = createMockSelection('background')
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParams({ id: 'checker', cellSize: 30, angle: 45 })

      expect(repository.updateLayer).toHaveBeenCalledWith('background', {
        surface: {
          id: 'checker',
          params: {
            cellSize: $PropertyValue.static(30),
            angle: $PropertyValue.static(45),
          },
        },
      })
    })

    it('handles gradientGrain params', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: {
          id: 'gradientGrain',
          params: {
            angle: $PropertyValue.static(0),
            centerX: $PropertyValue.static(0.5),
            centerY: $PropertyValue.static(0.5),
          },
        },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParams({
        id: 'gradientGrain',
        angle: 45,
        perlinScale: 2.0,
      })

      expect(repository.updateLayer).toHaveBeenCalledWith('surface-1', {
        surface: {
          id: 'gradientGrain',
          params: {
            angle: $PropertyValue.static(45),
            centerX: $PropertyValue.static(0.5),
            centerY: $PropertyValue.static(0.5),
            perlinScale: $PropertyValue.static(2.0),
          },
        },
      })
    })
  })

  describe('selectSurface', () => {
    it('does nothing when no layer is selected', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.selectSurface({ id: 'stripe', params: {} })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('updates the selected layer surface', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'solid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      const newSurface: NormalizedSurfaceConfig = {
        id: 'stripe',
        params: { width1: $PropertyValue.static(10) },
      }
      usecase.selectSurface(newSurface)

      expect(repository.updateLayer).toHaveBeenCalledWith('surface-1', {
        surface: newSurface,
      })
    })
  })

  describe('selectSurfaceForLayer', () => {
    it('updates the specified layer surface directly', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'solid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection(null) // No selection needed
      const usecase = createSurfaceUsecase({ repository, selection })

      const newSurface: NormalizedSurfaceConfig = {
        id: 'grid',
        params: { lineWidth: $PropertyValue.static(2) },
      }
      usecase.selectSurfaceForLayer('surface-1', newSurface)

      expect(repository.updateLayer).toHaveBeenCalledWith('surface-1', {
        surface: newSurface,
      })
    })
  })

  describe('getSelectedLayer', () => {
    it('returns null when no layer is selected', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      expect(usecase.getSelectedLayer()).toBeNull()
    })

    it('returns null when selected layer is not found', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection('non-existent')
      const usecase = createSurfaceUsecase({ repository, selection })

      expect(usecase.getSelectedLayer()).toBeNull()
    })

    it('returns the selected layer', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'solid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      expect(usecase.getSelectedLayer()).toEqual(surfaceLayer)
    })
  })

  describe('getColorConfigPath', () => {
    it('returns null when no layer is selected', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      expect(usecase.getColorConfigPath()).toBeNull()
    })

    it('returns "background" for base layer', () => {
      const baseLayer: BaseLayerNodeConfig = {
        id: 'background',
        type: 'base',
        visible: true,
        surface: { id: 'solid', params: {} },
      }
      const repository = createMockRepository([baseLayer])
      const selection = createMockSelection('background')
      const usecase = createSurfaceUsecase({ repository, selection })

      expect(usecase.getColorConfigPath()).toBe('background')
    })

    it('returns "mask" for surface layer', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'solid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection('surface-1')
      const usecase = createSurfaceUsecase({ repository, selection })

      expect(usecase.getColorConfigPath()).toBe('mask')
    })
  })

  describe('updateSurfaceParamsForLayer', () => {
    it('does nothing when specified layer is not found', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParamsForLayer('non-existent', { id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when specified layer is not base or surface type', () => {
      const textLayer: LayerNodeConfig = {
        id: 'text-1',
        type: 'text',
        visible: true,
        content: 'Hello',
        position: { x: 0, y: 0, anchor: 'middle-center' },
        font: { size: 1, weight: 400, family: 'sans-serif' },
      }
      const repository = createMockRepository([textLayer])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParamsForLayer('text-1', { id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when surface id does not match', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'grid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParamsForLayer('surface-1', { id: 'stripe', width1: 10 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('updates surface params for specified layer regardless of selection', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(5),
            width2: $PropertyValue.static(10),
            angle: $PropertyValue.static(45),
          },
        },
      }
      const repository = createMockRepository([surfaceLayer])
      // Selection is null - but updateSurfaceParamsForLayer should still work
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateSurfaceParamsForLayer('surface-1', { id: 'stripe', width1: 20 })

      expect(repository.updateLayer).toHaveBeenCalledWith('surface-1', {
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(20),
            width2: $PropertyValue.static(10),
            angle: $PropertyValue.static(45),
          },
        },
      })
    })

    it('preserves existing PropertyValue (including RangeExpr) for unchanged params', () => {
      const rangeExpr: PropertyValue = {
        type: 'range',
        trackId: 'scroll',
        min: 0,
        max: 90,
      }
      const baseLayer: BaseLayerNodeConfig = {
        id: 'background',
        type: 'base',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(5),
            width2: $PropertyValue.static(10),
            angle: rangeExpr,
          },
        },
      }
      const repository = createMockRepository([baseLayer])
      const selection = createMockSelection('other-layer') // Different selection
      const usecase = createSurfaceUsecase({ repository, selection })

      // Update only width1 on background layer
      usecase.updateSurfaceParamsForLayer('background', { id: 'stripe', width1: 20 })

      expect(repository.updateLayer).toHaveBeenCalledWith('background', {
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(20),
            width2: $PropertyValue.static(10),
            angle: rangeExpr, // RangeExpr should be preserved
          },
        },
      })
    })
  })

  describe('updateMaskShapeParams', () => {
    const createProcessorWithMask = (maskParams: Record<string, PropertyValue>): ProcessorNodeConfig => ({
      id: 'processor-1',
      type: 'processor',
      visible: true,
      modifiers: [
        {
          type: 'mask',
          shape: { id: 'circle', params: maskParams },
          invert: false,
          feather: 0,
        } as MaskProcessorConfig,
      ],
    })

    it('does nothing when processor layer is not found', () => {
      const repository = createMockRepository([])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateMaskShapeParams('non-existent', { id: 'circle', radius: 0.5 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when layer is not a processor type', () => {
      const surfaceLayer: SurfaceLayerNodeConfig = {
        id: 'surface-1',
        type: 'surface',
        visible: true,
        surface: { id: 'solid', params: {} },
      }
      const repository = createMockRepository([surfaceLayer])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateMaskShapeParams('surface-1', { id: 'circle', radius: 0.5 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when processor has no mask modifier', () => {
      const processor: ProcessorNodeConfig = {
        id: 'processor-1',
        type: 'processor',
        visible: true,
        modifiers: [], // No mask
      }
      const repository = createMockRepository([processor])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateMaskShapeParams('processor-1', { id: 'circle', radius: 0.5 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('does nothing when mask shape id does not match', () => {
      const processor = createProcessorWithMask({
        centerX: $PropertyValue.static(0.5),
        centerY: $PropertyValue.static(0.5),
        radius: $PropertyValue.static(0.3),
      })
      const repository = createMockRepository([processor])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      // Trying to update rect params on a circle mask
      usecase.updateMaskShapeParams('processor-1', { id: 'rect', width: 0.8 })

      expect(repository.updateLayer).not.toHaveBeenCalled()
    })

    it('updates mask shape params and preserves existing PropertyValue', () => {
      const rangeExpr: PropertyValue = {
        type: 'range',
        trackId: 'mask-radius',
        min: 0.2,
        max: 0.5,
      }
      const processor: ProcessorNodeConfig = {
        id: 'processor-1',
        type: 'processor',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            shape: {
              id: 'circle',
              params: {
                centerX: $PropertyValue.static(0.5),
                centerY: $PropertyValue.static(0.5),
                radius: rangeExpr, // RangeExpr to preserve
              },
            },
            invert: false,
            feather: 0,
          } as MaskProcessorConfig,
        ],
      }
      const repository = createMockRepository([processor])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      // Update only centerX
      usecase.updateMaskShapeParams('processor-1', { id: 'circle', centerX: 0.3 })

      expect(repository.updateLayer).toHaveBeenCalledWith('processor-1', {
        modifiers: [
          {
            type: 'mask',
            shape: {
              id: 'circle',
              params: {
                centerX: $PropertyValue.static(0.3),
                centerY: $PropertyValue.static(0.5),
                radius: rangeExpr, // Preserved!
              },
            },
            invert: false,
            feather: 0,
          },
        ],
      })
    })

    it('updates multiple mask params at once', () => {
      const processor = createProcessorWithMask({
        centerX: $PropertyValue.static(0.5),
        centerY: $PropertyValue.static(0.5),
        radius: $PropertyValue.static(0.3),
      })
      const repository = createMockRepository([processor])
      const selection = createMockSelection(null)
      const usecase = createSurfaceUsecase({ repository, selection })

      usecase.updateMaskShapeParams('processor-1', {
        id: 'circle',
        centerX: 0.2,
        centerY: 0.8,
        radius: 0.4,
      })

      expect(repository.updateLayer).toHaveBeenCalledWith('processor-1', {
        modifiers: [
          {
            type: 'mask',
            shape: {
              id: 'circle',
              params: {
                centerX: $PropertyValue.static(0.2),
                centerY: $PropertyValue.static(0.8),
                radius: $PropertyValue.static(0.4),
              },
            },
            invert: false,
            feather: 0,
          },
        ],
      })
    })
  })
})
