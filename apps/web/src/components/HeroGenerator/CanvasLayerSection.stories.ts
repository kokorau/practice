import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, provide, h, computed, readonly } from 'vue'
import CanvasLayerSection from './CanvasLayerSection.vue'
import { LayerSelectionKey, type LayerSelectionReturn } from '../../composables/useLayerSelection'
import type { LayerNodeConfig, NormalizedSurfaceConfig, NormalizedMaskConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

// Mock data helpers
const createMockSurface = (
  type: string,
  params: Record<string, number | string> = {},
  colors: { color1?: string; color2?: string } = { color1: 'B', color2: 'auto' }
): NormalizedSurfaceConfig => ({
  id: type as NormalizedSurfaceConfig['id'],
  params: {
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, $PropertyValue.static(value)])
    ),
    ...(colors.color1 !== undefined ? { color1: $PropertyValue.static(colors.color1) } : {}),
    ...(colors.color2 !== undefined ? { color2: $PropertyValue.static(colors.color2) } : {}),
  },
})

const createMockMask = (type: string, params: Record<string, number | boolean>): NormalizedMaskConfig => ({
  id: type as NormalizedMaskConfig['id'],
  params: Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, $PropertyValue.static(value)])
  ),
})

// Mock layer data
const mockLayers: LayerNodeConfig[] = [
  {
    type: 'group',
    id: 'background-group',
    name: 'Background',
    visible: true,
    children: [
      {
        type: 'surface',
        id: 'background-surface',
        name: 'Surface',
        visible: true,
        surface: createMockSurface('stripe', { width1: 20, width2: 20, angle: 45 }),
              },
    ],
  },
  {
    type: 'group',
    id: 'clip-group',
    name: 'Clip Group',
    visible: true,
    children: [
      {
        type: 'surface',
        id: 'mask-surface',
        name: 'Surface',
        visible: true,
        surface: createMockSurface('solid'),
              },
      {
        type: 'processor',
        id: 'processor-mask',
        name: 'Mask',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            enabled: true,
            shape: createMockMask('circle', { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false }),
            invert: false,
            feather: 0,
          },
        ],
      },
    ],
  },
]

// Helper to create mock layer selection
function createMockLayerSelection(selectedLayerId: string | null = null): LayerSelectionReturn {
  const layerId = ref<string | null>(selectedLayerId)
  const processorType = ref<'effect' | 'mask' | 'processor' | null>(null)
  const processorLayerId = ref<string | null>(null)
  const foregroundElementId = ref<string | null>(null)

  return {
    layerId: readonly(layerId),
    processorType: readonly(processorType),
    processorLayerId: readonly(processorLayerId),
    foregroundElementId: readonly(foregroundElementId),
    selection: computed(() => ({
      layerId: layerId.value,
      processorType: processorType.value,
      processorLayerId: processorLayerId.value,
      foregroundElementId: foregroundElementId.value,
    })),
    isCanvasLayerSelected: computed(() => layerId.value !== null),
    isForegroundElementSelected: computed(() => foregroundElementId.value !== null),
    isProcessorSelected: computed(() => processorType.value !== null),
    selectCanvasLayer: (id: string) => { layerId.value = id },
    selectProcessor: (id: string, type: 'effect' | 'mask' | 'processor') => {
      processorType.value = type
      processorLayerId.value = id
    },
    selectForegroundElement: (id: string) => { foregroundElementId.value = id },
    clearSelection: () => {
      layerId.value = null
      processorType.value = null
      processorLayerId.value = null
      foregroundElementId.value = null
    },
    clearProcessorSelection: () => {
      processorType.value = null
      processorLayerId.value = null
    },
  }
}

const meta: Meta<typeof CanvasLayerSection> = {
  title: 'Components/HeroGenerator/CanvasLayerSection',
  component: CanvasLayerSection,
  tags: ['autodocs'],
  decorators: [
    (story) => {
      return {
        setup() {
          const mockLayerSelection = createMockLayerSelection()
          provide(LayerSelectionKey, mockLayerSelection)
          return () => h(story())
        },
      }
    },
  ],
  argTypes: {
    layers: { control: 'object' },
    expandedLayerIds: { control: 'object' },
  },
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof CanvasLayerSection>

export const Default: Story = {
  args: {
    layers: mockLayers,
    expandedLayerIds: new Set(['background-group', 'clip-group']),
  },
}

export const Collapsed: Story = {
  args: {
    layers: mockLayers,
    expandedLayerIds: new Set(),
  },
}

export const WithSelectedLayer: Story = {
  args: {
    layers: mockLayers,
    expandedLayerIds: new Set(['background-group', 'clip-group']),
  },
  decorators: [
    (story) => {
      return {
        setup() {
          const mockLayerSelection = createMockLayerSelection('background-surface')
          provide(LayerSelectionKey, mockLayerSelection)
          return () => h(story())
        },
      }
    },
  ],
}

export const EmptyLayers: Story = {
  args: {
    layers: [],
    expandedLayerIds: new Set(),
  },
}

// Test: Multiple surfaces with processor
const mockLayersWithProcessor: LayerNodeConfig[] = [
  {
    type: 'surface',
    id: 'surface-1',
    name: 'Surface 1',
    visible: true,
    surface: createMockSurface('solid'),
      },
  {
    type: 'surface',
    id: 'surface-2',
    name: 'Surface 2',
    visible: true,
    surface: createMockSurface('stripe', {}, { color1: 'F1', color2: 'auto' }),
  },
  {
    type: 'processor',
    id: 'processor-1',
    name: 'Processor',
    visible: true,
    modifiers: [
      {
        type: 'mask',
        enabled: true,
        shape: createMockMask('circle', { centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false }),
        invert: false,
        feather: 0,
      },
    ],
  },
]

export const WithProcessorArrows: Story = {
  args: {
    layers: mockLayersWithProcessor,
    expandedLayerIds: new Set(),
  },
}
