import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useTextLayerEditor, type UseTextLayerEditorOptions, type TextLayerConfig } from './useTextLayerEditor'
import type { HeroViewConfig, TextLayerNodeConfigType } from '@practice/section-visual'

describe('useTextLayerEditor', () => {
  let heroViewConfig: Ref<HeroViewConfig>
  let onUpdateConfig: (id: string, updates: Partial<TextLayerConfig>) => void
  let options: UseTextLayerEditorOptions

  const createTextLayerNodeConfigType = (id: string, overrides: Partial<TextLayerNodeConfigType> = {}): TextLayerNodeConfigType => ({
    id,
    name: id,
    type: 'text',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    text: 'Test Text',
    fontFamily: 'sans-serif',
    fontSize: 48,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.2,
    color: '#ffffff',
    position: {
      x: 0.5,
      y: 0.5,
      anchor: 'center',
    },
    rotation: 0,
    ...overrides,
  })

  const createMinimalHeroViewConfig = (layers: HeroViewConfig['layers']): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      brand: { hue: 200, saturation: 0.5, chroma: 0.1 },
      accent: { hue: 30, saturation: 0.7, chroma: 0.15 },
      foundation: 'light',
    },
    layers,
    foreground: { elements: [] },
  })

  beforeEach(() => {
    heroViewConfig = ref(createMinimalHeroViewConfig([
      createTextLayerNodeConfigType('text-layer-1', { text: 'Layer 1' }),
      createTextLayerNodeConfigType('text-layer-2', {
        text: 'Layer 2',
        position: { x: 0.2, y: 0.8, anchor: 'bottom-left' }
      }),
      {
        id: 'surface-layer',
        name: 'Surface Layer',
        type: 'surface',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        surface: { type: 'solid' },
      },
    ]))

    onUpdateConfig = vi.fn()

    options = {
      heroViewConfig,
      onUpdateConfig,
    }
  })

  describe('selectedTextLayerId', () => {
    it('initializes as null', () => {
      const { selectedTextLayerId } = useTextLayerEditor(options)
      expect(selectedTextLayerId.value).toBeNull()
    })
  })

  describe('selectTextLayer', () => {
    it('updates selectedTextLayerId', () => {
      const { selectedTextLayerId, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')

      expect(selectedTextLayerId.value).toBe('text-layer-1')
    })

    it('allows deselection by passing null', () => {
      const { selectedTextLayerId, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      selectTextLayer(null)

      expect(selectedTextLayerId.value).toBeNull()
    })
  })

  describe('selectedTextLayerConfig', () => {
    it('returns null when no layer is selected', () => {
      const { selectedTextLayerConfig } = useTextLayerEditor(options)

      expect(selectedTextLayerConfig.value).toBeNull()
    })

    it('returns the config of the selected text layer', () => {
      const { selectedTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')

      expect(selectedTextLayerConfig.value).toEqual(
        expect.objectContaining({
          text: 'Layer 1',
        })
      )
    })

    it('returns null when selected layer is not a text layer', () => {
      const { selectedTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('surface-layer')

      expect(selectedTextLayerConfig.value).toBeNull()
    })

    it('returns null when selected layer ID does not exist', () => {
      const { selectedTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('non-existent')

      expect(selectedTextLayerConfig.value).toBeNull()
    })
  })

  describe('updateTextLayerConfig', () => {
    it('does nothing when no layer is selected', () => {
      const { updateTextLayerConfig } = useTextLayerEditor(options)

      updateTextLayerConfig({ text: 'New Text' })

      expect(onUpdateConfig).not.toHaveBeenCalled()
    })

    it('does nothing when selected layer is not a text layer', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('surface-layer')
      updateTextLayerConfig({ text: 'New Text' })

      expect(onUpdateConfig).not.toHaveBeenCalled()
    })

    it('calls onUpdateConfig with text update', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ text: 'New Text' })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', { text: 'New Text' })
    })

    it('calls onUpdateConfig with font updates', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({
        fontFamily: 'serif',
        fontSize: 64,
        fontWeight: 700,
        letterSpacing: 0.1,
        lineHeight: 1.5,
      })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', {
        fontFamily: 'serif',
        fontSize: 64,
        fontWeight: 700,
        letterSpacing: 0.1,
        lineHeight: 1.5,
      })
    })

    it('calls onUpdateConfig with color update', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ color: '#ff0000' })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', { color: '#ff0000' })
    })

    it('calls onUpdateConfig with rotation update', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ rotation: Math.PI / 4 })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', { rotation: Math.PI / 4 })
    })

    it('merges position x with existing position values', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ x: 0.3 })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', {
        position: {
          x: 0.3,
          y: 0.5,
          anchor: 'center',
        },
      })
    })

    it('merges position y with existing position values', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ y: 0.7 })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', {
        position: {
          x: 0.5,
          y: 0.7,
          anchor: 'center',
        },
      })
    })

    it('merges anchor with existing position values', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ anchor: 'top-left' })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', {
        position: {
          x: 0.5,
          y: 0.5,
          anchor: 'top-left',
        },
      })
    })

    it('merges multiple position fields together', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({ x: 0.1, y: 0.9, anchor: 'bottom-right' })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', {
        position: {
          x: 0.1,
          y: 0.9,
          anchor: 'bottom-right',
        },
      })
    })

    it('combines position and other updates', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-1')
      updateTextLayerConfig({
        text: 'Updated Text',
        fontSize: 72,
        x: 0.25,
        anchor: 'center-left',
      })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-1', {
        text: 'Updated Text',
        fontSize: 72,
        position: {
          x: 0.25,
          y: 0.5,
          anchor: 'center-left',
        },
      })
    })

    it('uses correct existing position when selecting a different layer', () => {
      const { updateTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('text-layer-2')
      updateTextLayerConfig({ x: 0.5 })

      expect(onUpdateConfig).toHaveBeenCalledWith('text-layer-2', {
        position: {
          x: 0.5,
          y: 0.8,
          anchor: 'bottom-left',
        },
      })
    })
  })

  describe('nested groups', () => {
    it('finds text layers inside groups', () => {
      heroViewConfig.value = createMinimalHeroViewConfig([
        {
          id: 'group-1',
          name: 'Group 1',
          type: 'group',
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          children: [
            createTextLayerNodeConfigType('nested-text', { text: 'Nested Text' }),
          ],
        },
      ])

      const { selectedTextLayerConfig, selectTextLayer } = useTextLayerEditor(options)

      selectTextLayer('nested-text')

      expect(selectedTextLayerConfig.value).toEqual(
        expect.objectContaining({
          text: 'Nested Text',
        })
      )
    })
  })
})
