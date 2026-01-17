import { describe, it, expect, vi } from 'vitest'
import { createHeroEditorInMemoryRepository } from './HeroEditorInMemoryRepository'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'

describe('HeroEditorInMemoryRepository', () => {
  describe('Core Operations', () => {
    it('should create repository with default state', () => {
      const repo = createHeroEditorInMemoryRepository()
      const state = repo.get()

      expect(state.ui.activeSection).toBe(null)
      expect(state.ui.background.selectedPresetIndex).toBe(3)
      expect(state.config.viewport.width).toBe(1280)
    })

    it('should create repository with initial config', () => {
      const config = createDefaultHeroViewConfig()
      config.viewport = { width: 1920, height: 1080 }

      const repo = createHeroEditorInMemoryRepository({ initialConfig: config })
      const state = repo.get()

      expect(state.config.viewport.width).toBe(1920)
      expect(state.config.viewport.height).toBe(1080)
    })

    it('should create repository with initial UI state', () => {
      const repo = createHeroEditorInMemoryRepository({
        initialUI: {
          activeSection: 'background',
          background: {
            selectedPresetIndex: 5,
          },
        },
      })
      const state = repo.get()

      expect(state.ui.activeSection).toBe('background')
      expect(state.ui.background.selectedPresetIndex).toBe(5)
    })

    it('should notify subscribers on state change', () => {
      const repo = createHeroEditorInMemoryRepository()
      const subscriber = vi.fn()

      repo.subscribe(subscriber)
      repo.setActiveSection('mask-shape')

      expect(subscriber).toHaveBeenCalledTimes(1)
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          ui: expect.objectContaining({
            activeSection: 'mask-shape',
          }),
        })
      )
    })

    it('should unsubscribe correctly', () => {
      const repo = createHeroEditorInMemoryRepository()
      const subscriber = vi.fn()

      const unsubscribe = repo.subscribe(subscriber)
      unsubscribe()
      repo.setActiveSection('mask-shape')

      expect(subscriber).not.toHaveBeenCalled()
    })
  })

  describe('UI State Operations', () => {
    it('should update active section', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.setActiveSection('background')

      expect(repo.get().ui.activeSection).toBe('background')
    })

    it('should update background UI state', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateBackgroundUI({ selectedPresetIndex: 5 })

      expect(repo.get().ui.background.selectedPresetIndex).toBe(5)
    })

    it('should update mask UI state', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateMaskUI({ selectedShapePresetIndex: 2 })

      expect(repo.get().ui.mask.selectedShapePresetIndex).toBe(2)
    })

    it('should update filter UI state', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateFilterUI({ selectedLayerId: 'layer-1' })

      expect(repo.get().ui.filter.selectedLayerId).toBe('layer-1')
    })

    it('should update foreground UI state', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateForegroundUI({ selectedElementId: 'title-1' })

      expect(repo.get().ui.foreground.selectedElementId).toBe('title-1')
    })

    it('should update preset UI state', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updatePresetUI({ selectedPresetId: 'modern-dark' })

      expect(repo.get().ui.preset.selectedPresetId).toBe('modern-dark')
    })
  })

  describe('Config Operations', () => {
    it('should update config partially', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateConfig({ viewport: { width: 1920, height: 1080 } })

      expect(repo.get().config.viewport.width).toBe(1920)
    })

    it('should set config completely', () => {
      const repo = createHeroEditorInMemoryRepository()
      const newConfig = createDefaultHeroViewConfig()
      newConfig.viewport = { width: 800, height: 600 }

      repo.setConfig(newConfig)

      expect(repo.get().config.viewport.width).toBe(800)
    })

    it('should update colors', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateColors({ semanticContext: 'sectionTint' })

      expect(repo.get().config.colors.semanticContext).toBe('sectionTint')
    })

    it('should update viewport', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateViewport({ width: 1440 })

      expect(repo.get().config.viewport.width).toBe(1440)
    })

    it('should update foreground', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateForeground({
        elements: [
          { id: 'title-1', type: 'title', visible: true, position: 'top-left', content: 'Hello' },
        ],
      })

      expect(repo.get().config.foreground.elements[0]!.content).toBe('Hello')
    })
  })

  describe('Layer Operations', () => {
    it('should find layer by id', () => {
      const repo = createHeroEditorInMemoryRepository()
      // Find nested layer inside background-group
      const layer = repo.findLayer('background')

      expect(layer).toBeDefined()
      expect(layer?.id).toBe('background')
    })

    it('should update layer', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.updateLayer('background', { visible: false })

      const layer = repo.findLayer('background')
      expect(layer?.visible).toBe(false)
    })

    it('should add layer', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.addLayer({
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { type: 'solid' },
      })

      const layer = repo.findLayer('surface-1')
      expect(layer).toBeDefined()
      expect(layer?.name).toBe('Surface 1')
    })

    it('should add layer at specific index', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.addLayer(
        {
          type: 'surface',
          id: 'surface-1',
          name: 'Surface 1',
          visible: true,
          surface: { type: 'solid' },
        },
        0
      )

      expect(repo.get().config.layers[0]!.id).toBe('surface-1')
    })

    it('should remove layer', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.addLayer({
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { type: 'solid' },
      })

      repo.removeLayer('surface-1')

      const layer = repo.findLayer('surface-1')
      expect(layer).toBeUndefined()
    })

    it('should reorder layers', () => {
      const repo = createHeroEditorInMemoryRepository()
      repo.addLayer({
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: { type: 'solid' },
      })
      repo.addLayer({
        type: 'surface',
        id: 'surface-2',
        name: 'Surface 2',
        visible: true,
        surface: { type: 'solid' },
      })

      repo.reorderLayers(['surface-2', 'surface-1', 'background-group'])

      const layers = repo.get().config.layers
      expect(layers[0]!.id).toBe('surface-2')
      expect(layers[1]!.id).toBe('surface-1')
      expect(layers[2]!.id).toBe('background-group')
    })
  })

  describe('Snapshot Operations', () => {
    it('should create snapshot', () => {
      const repo = createHeroEditorInMemoryRepository()
      const snapshot = repo.snapshot()

      expect(typeof snapshot).toBe('string')
      const parsed = JSON.parse(snapshot)
      expect(parsed.viewport.width).toBe(1280)
    })

    it('should restore from snapshot', () => {
      const repo = createHeroEditorInMemoryRepository()

      // Change config
      repo.updateViewport({ width: 1920 })
      expect(repo.get().config.viewport.width).toBe(1920)

      // Create snapshot of changed state
      const snapshot = repo.snapshot()

      // Change config again
      repo.updateViewport({ width: 800 })
      expect(repo.get().config.viewport.width).toBe(800)

      // Restore from snapshot
      repo.restore(snapshot)
      expect(repo.get().config.viewport.width).toBe(1920)
    })

    it('should preserve UI state when restoring snapshot', () => {
      const repo = createHeroEditorInMemoryRepository()

      // Set UI state
      repo.setActiveSection('background')
      repo.updateBackgroundUI({ selectedPresetIndex: 5 })

      // Create snapshot and change config
      const snapshot = repo.snapshot()
      repo.updateViewport({ width: 800 })

      // Restore
      repo.restore(snapshot)

      // UI state should be preserved
      expect(repo.get().ui.activeSection).toBe('background')
      expect(repo.get().ui.background.selectedPresetIndex).toBe(5)
    })

    it('should handle invalid snapshot gracefully', () => {
      const repo = createHeroEditorInMemoryRepository()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      repo.restore('invalid json')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore snapshot: invalid JSON')
      consoleSpy.mockRestore()
    })
  })

  describe('Unified State Source', () => {
    it('should provide single source of truth', () => {
      const repo = createHeroEditorInMemoryRepository()

      // Update both UI and config
      repo.setActiveSection('background')
      repo.updateBackgroundUI({ selectedPresetIndex: 3 })
      repo.updateLayer('background', { surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 } })

      // Verify single state object contains all
      const state = repo.get()

      expect(state.ui.activeSection).toBe('background')
      expect(state.ui.background.selectedPresetIndex).toBe(3)
      // New structure: layers[0] is 'background-group', children[0] is 'background'
      const backgroundGroup = state.config.layers[0]
      expect(backgroundGroup).toBeDefined()
      expect(backgroundGroup!.type).toBe('group')
      if (backgroundGroup && backgroundGroup.type === 'group') {
        const bgLayer = backgroundGroup.children[0]
        expect(bgLayer?.type).toBe('surface')
        if (bgLayer?.type === 'surface') {
          expect(bgLayer.surface.type).toBe('stripe')
        }
      }
    })
  })
})
