import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createForegroundElementUsecase,
  type ForegroundConfigPort,
  type SelectionPort,
  type ForegroundElementUsecase,
} from './ForegroundElementUsecase'
import type { ForegroundLayerConfig } from '../Domain/HeroViewConfig'

describe('ForegroundElementUsecase', () => {
  let foregroundConfig: ForegroundConfigPort
  let selection: SelectionPort
  let usecase: ForegroundElementUsecase
  let currentConfig: ForegroundLayerConfig
  let selectedId: string | null

  beforeEach(() => {
    // Initialize with default config
    currentConfig = {
      elements: [
        {
          id: 'title-1',
          type: 'title',
          visible: true,
          position: 'middle-center',
          content: 'Test Title',
          fontSize: 3,
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
    }
    selectedId = null

    foregroundConfig = {
      get: () => currentConfig,
      set: (config) => {
        currentConfig = config
      },
    }

    selection = {
      getSelectedId: () => selectedId,
      setSelectedId: (id) => {
        selectedId = id
      },
      clearCanvasSelection: vi.fn(),
    }

    usecase = createForegroundElementUsecase({ foregroundConfig, selection })
  })

  describe('getSelectedElement', () => {
    it('returns null when no element is selected', () => {
      expect(usecase.getSelectedElement()).toBeNull()
    })

    it('returns the selected element', () => {
      selectedId = 'title-1'
      const element = usecase.getSelectedElement()
      expect(element).toEqual({
        id: 'title-1',
        type: 'title',
        visible: true,
        position: 'middle-center',
        content: 'Test Title',
        fontSize: 3,
      })
    })

    it('returns null when selected ID does not match any element', () => {
      selectedId = 'non-existent'
      expect(usecase.getSelectedElement()).toBeNull()
    })
  })

  describe('selectElement', () => {
    it('selects an element and clears canvas selection', () => {
      usecase.selectElement('title-1')

      expect(selectedId).toBe('title-1')
      expect(selection.clearCanvasSelection).toHaveBeenCalled()
    })

    it('deselects when null is passed', () => {
      selectedId = 'title-1'
      usecase.selectElement(null)

      expect(selectedId).toBeNull()
      // clearCanvasSelection should NOT be called when deselecting
      expect(selection.clearCanvasSelection).not.toHaveBeenCalled()
    })
  })

  describe('addElement', () => {
    it('adds a title element with default values', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12345)

      const id = usecase.addElement('title')

      expect(id).toBe('title-12345')
      expect(currentConfig.elements).toHaveLength(3)
      expect(currentConfig.elements[2]).toEqual({
        id: 'title-12345',
        type: 'title',
        visible: true,
        position: 'middle-center',
        content: 'New Title',
        fontSize: 3,
      })
      expect(selectedId).toBe('title-12345')
    })

    it('adds a description element with default values', () => {
      vi.spyOn(Date, 'now').mockReturnValue(67890)

      const id = usecase.addElement('description')

      expect(id).toBe('description-67890')
      expect(currentConfig.elements).toHaveLength(3)
      expect(currentConfig.elements[2]).toEqual({
        id: 'description-67890',
        type: 'description',
        visible: true,
        position: 'middle-center',
        content: 'New description text',
        fontSize: 1,
      })
    })
  })

  describe('removeElement', () => {
    it('removes the specified element', () => {
      usecase.removeElement('title-1')

      expect(currentConfig.elements).toHaveLength(1)
      expect(currentConfig.elements[0]!.id).toBe('description-1')
    })

    it('clears selection if the removed element was selected', () => {
      selectedId = 'title-1'
      usecase.removeElement('title-1')

      expect(selectedId).toBeNull()
    })

    it('keeps selection if a different element was removed', () => {
      selectedId = 'description-1'
      usecase.removeElement('title-1')

      expect(selectedId).toBe('description-1')
    })
  })

  describe('updateElement', () => {
    it('updates element position', () => {
      usecase.updateElement('title-1', { position: 'top-left' })

      const element = currentConfig.elements.find((el) => el.id === 'title-1')
      expect(element?.position).toBe('top-left')
    })

    it('updates element content', () => {
      usecase.updateElement('title-1', { content: 'Updated Title' })

      const element = currentConfig.elements.find((el) => el.id === 'title-1')
      expect(element?.content).toBe('Updated Title')
    })

    it('updates multiple properties at once', () => {
      usecase.updateElement('description-1', {
        position: 'bottom-right',
        content: 'Updated Description',
        fontSize: 2,
        fontId: 'roboto',
        colorKey: 'BN0',
      })

      const element = currentConfig.elements.find((el) => el.id === 'description-1')
      expect(element).toMatchObject({
        position: 'bottom-right',
        content: 'Updated Description',
        fontSize: 2,
        fontId: 'roboto',
        colorKey: 'BN0',
      })
    })

    it('does not modify other elements', () => {
      usecase.updateElement('title-1', { content: 'Updated' })

      const description = currentConfig.elements.find((el) => el.id === 'description-1')
      expect(description?.content).toBe('Test Description')
    })
  })

  describe('updateSelectedElement', () => {
    it('updates the selected element', () => {
      selectedId = 'title-1'
      usecase.updateSelectedElement({ content: 'New Content' })

      const element = currentConfig.elements.find((el) => el.id === 'title-1')
      expect(element?.content).toBe('New Content')
    })

    it('does nothing when no element is selected', () => {
      const originalConfig = { ...currentConfig }
      usecase.updateSelectedElement({ content: 'New Content' })

      expect(currentConfig.elements).toEqual(originalConfig.elements)
    })
  })
})
