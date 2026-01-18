import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useForegroundElement } from './useForegroundElement'
import type { ForegroundLayerConfig } from '@practice/hero-scene'

// ============================================================
// Test Helpers
// ============================================================

const createMockForegroundConfig = (): ForegroundLayerConfig => ({
  elements: [
    {
      id: 'title-1',
      type: 'title',
      visible: true,
      position: 'middle-center',
      content: 'Test Title',
      fontSize: 3,
      fontId: 'roboto',
      colorKey: 'auto',
    },
    {
      id: 'description-1',
      type: 'description',
      visible: true,
      position: 'bottom-center',
      content: 'Test Description',
      fontSize: 1,
    },
  ],
})

const createMockOptions = () => {
  const foregroundConfig = ref<ForegroundLayerConfig>(createMockForegroundConfig())
  const clearCanvasSelection = vi.fn()

  return {
    foregroundConfig,
    clearCanvasSelection,
  }
}

// ============================================================
// Tests
// ============================================================

describe('useForegroundElement', () => {
  describe('selection state', () => {
    it('initializes with no selected element', () => {
      const options = createMockOptions()

      const { selectedForegroundElementId, selectedForegroundElement } = useForegroundElement(options)

      expect(selectedForegroundElementId.value).toBeNull()
      expect(selectedForegroundElement.value).toBeNull()
    })

    it('selects element and clears canvas selection', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedForegroundElementId, selectedForegroundElement } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedForegroundElementId.value).toBe('title-1')
      expect(selectedForegroundElement.value?.id).toBe('title-1')
      expect(options.clearCanvasSelection).toHaveBeenCalled()
    })
  })

  describe('handler functions', () => {
    it('adds a new title element', () => {
      const options = createMockOptions()

      const { handleAddForegroundElement, selectedForegroundElement } = useForegroundElement(options)

      handleAddForegroundElement('title')

      // Should have 3 elements now
      expect(options.foregroundConfig.value.elements).toHaveLength(3)
      // New element should be selected
      expect(selectedForegroundElement.value?.type).toBe('title')
      expect(selectedForegroundElement.value?.content).toBe('New Title')
    })

    it('adds a new description element', () => {
      const options = createMockOptions()

      const { handleAddForegroundElement, selectedForegroundElement } = useForegroundElement(options)

      handleAddForegroundElement('description')

      expect(options.foregroundConfig.value.elements).toHaveLength(3)
      expect(selectedForegroundElement.value?.type).toBe('description')
      expect(selectedForegroundElement.value?.content).toBe('New description text')
    })

    it('removes an element', () => {
      const options = createMockOptions()

      const { handleRemoveForegroundElement, handleSelectForegroundElement, selectedForegroundElementId } = useForegroundElement(options)

      // Select and then remove
      handleSelectForegroundElement('title-1')
      handleRemoveForegroundElement('title-1')

      expect(options.foregroundConfig.value.elements).toHaveLength(1)
      expect(selectedForegroundElementId.value).toBeNull()
    })
  })

  describe('selected element computed properties', () => {
    it('returns default position when no element selected', () => {
      const options = createMockOptions()

      const { selectedElementPosition } = useForegroundElement(options)

      expect(selectedElementPosition.value).toBe('middle-center')
    })

    it('returns selected element position', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementPosition } = useForegroundElement(options)

      handleSelectForegroundElement('description-1')

      expect(selectedElementPosition.value).toBe('bottom-center')
    })

    it('updates selected element position', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementPosition, selectedForegroundElement } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')
      selectedElementPosition.value = 'top-left'

      expect(selectedForegroundElement.value?.position).toBe('top-left')
    })

    it('returns selected element font', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementFont } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedElementFont.value).toBe('roboto')
    })

    it('updates selected element font', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementFont, selectedForegroundElement } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')
      selectedElementFont.value = 'inter'

      expect(selectedForegroundElement.value?.fontId).toBe('inter')
    })

    it('returns selected element font size', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementFontSize } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedElementFontSize.value).toBe(3)
    })

    it('returns default font size for title when not set', () => {
      const options = createMockOptions()
      // Remove fontSize from title
      const titleElement = options.foregroundConfig.value.elements[0]
      if (titleElement) {
        titleElement.fontSize = undefined as unknown as number
      }

      const { handleSelectForegroundElement, selectedElementFontSize } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedElementFontSize.value).toBe(3)
    })

    it('returns default font size for description when not set', () => {
      const options = createMockOptions()
      // Remove fontSize from description
      const descElement = options.foregroundConfig.value.elements[1]
      if (descElement) {
        descElement.fontSize = undefined as unknown as number
      }

      const { handleSelectForegroundElement, selectedElementFontSize } = useForegroundElement(options)

      handleSelectForegroundElement('description-1')

      expect(selectedElementFontSize.value).toBe(1)
    })

    it('returns selected element content', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementContent } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedElementContent.value).toBe('Test Title')
    })

    it('updates selected element content', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementContent, selectedForegroundElement } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')
      selectedElementContent.value = 'Updated Title'

      expect(selectedForegroundElement.value?.content).toBe('Updated Title')
    })

    it('returns selected element color key', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementColorKey } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedElementColorKey.value).toBe('auto')
    })

    it('updates selected element color key', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedElementColorKey, selectedForegroundElement } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')
      selectedElementColorKey.value = 'B'

      expect(selectedForegroundElement.value?.colorKey).toBe('B')
    })
  })

  describe('font panel state', () => {
    it('initializes with font panel closed', () => {
      const options = createMockOptions()

      const { isFontPanelOpen } = useForegroundElement(options)

      expect(isFontPanelOpen.value).toBe(false)
    })

    it('opens font panel', () => {
      const options = createMockOptions()

      const { isFontPanelOpen, openFontPanel } = useForegroundElement(options)

      openFontPanel()

      expect(isFontPanelOpen.value).toBe(true)
    })

    it('closes font panel', () => {
      const options = createMockOptions()

      const { isFontPanelOpen, openFontPanel, closeFontPanel } = useForegroundElement(options)

      openFontPanel()
      closeFontPanel()

      expect(isFontPanelOpen.value).toBe(false)
    })

    it('returns all font presets', () => {
      const options = createMockOptions()

      const { allFontPresets } = useForegroundElement(options)

      expect(allFontPresets.value.length).toBeGreaterThan(0)
    })

    it('returns selected font preset', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedFontPreset } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedFontPreset.value?.id).toBe('roboto')
    })

    it('returns null for selected font preset when no font', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedFontPreset } = useForegroundElement(options)

      handleSelectForegroundElement('description-1')

      expect(selectedFontPreset.value).toBeNull()
    })

    it('returns font display name', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedFontDisplayName } = useForegroundElement(options)

      handleSelectForegroundElement('title-1')

      expect(selectedFontDisplayName.value).toBe('Roboto')
    })

    it('returns System Default when no font selected', () => {
      const options = createMockOptions()

      const { handleSelectForegroundElement, selectedFontDisplayName } = useForegroundElement(options)

      handleSelectForegroundElement('description-1')

      expect(selectedFontDisplayName.value).toBe('System Default')
    })
  })
})
