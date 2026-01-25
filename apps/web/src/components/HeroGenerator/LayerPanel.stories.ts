import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, provide, h, computed, readonly } from 'vue'
import LayerPanel from './LayerPanel.vue'
import { LayerSelectionKey, type LayerSelectionReturn } from '../../composables/useLayerSelection'
import type { LayerNodeConfig, ForegroundElementConfig, NormalizedSurfaceConfig, NormalizedMaskConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

// Mock data for stories
const createMockSurface = (type: string, params: Record<string, number | string> = {}): NormalizedSurfaceConfig => ({
  id: type as NormalizedSurfaceConfig['id'],
  params: Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, $PropertyValue.static(value)])
  ),
})

const createMockMask = (type: string, params: Record<string, number | boolean>): NormalizedMaskConfig => ({
  id: type as NormalizedMaskConfig['id'],
  params: Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, $PropertyValue.static(value)])
  ),
})

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
        colors: { primary: 'B', secondary: 'auto' },
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
        colors: { primary: 'auto', secondary: 'auto' },
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

const mockForegroundElements: ForegroundElementConfig[] = [
  {
    id: 'title-1',
    type: 'title',
    visible: true,
    position: 'middle-center',
    content: 'Build Amazing',
  },
  {
    id: 'description-1',
    type: 'description',
    visible: true,
    position: 'middle-center',
    content: 'Create beautiful, responsive websites.',
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

const meta: Meta<typeof LayerPanel> = {
  title: 'Components/HeroGenerator/LayerPanel',
  component: LayerPanel,
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
    foregroundElements: { control: 'object' },
    selectedForegroundElementId: { control: 'text' },
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
type Story = StoryObj<typeof LayerPanel>

export const Default: Story = {
  args: {
    layers: mockLayers,
    foregroundElements: mockForegroundElements,
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(['background-group', 'clip-group']),
  },
}

export const Collapsed: Story = {
  args: {
    layers: mockLayers,
    foregroundElements: mockForegroundElements,
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(),
  },
}

export const WithSelectedLayer: Story = {
  args: {
    layers: mockLayers,
    foregroundElements: mockForegroundElements,
    selectedForegroundElementId: null,
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

export const WithSelectedForegroundElement: Story = {
  args: {
    layers: mockLayers,
    foregroundElements: mockForegroundElements,
    selectedForegroundElementId: 'title-1',
    expandedLayerIds: new Set(['background-group', 'clip-group']),
  },
}

export const EmptyLayers: Story = {
  args: {
    layers: [],
    foregroundElements: [],
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(),
  },
}

// Test Effect: Blur preset structure - processor at top level
const mockLayersWithTopLevelProcessor: LayerNodeConfig[] = [
  {
    type: 'group',
    id: 'background-group',
    name: 'Background',
    visible: true,
    children: [
      {
        type: 'surface',
        id: 'background',
        name: 'Background Surface',
        visible: true,
        surface: createMockSurface('grid', { lineWidth: 2, cellSize: 32 }),
        colors: { primary: 'B', secondary: 'F1' },
      },
    ],
  },
  {
    type: 'processor',
    id: 'processor-blur',
    name: 'Blur Effect',
    visible: true,
    modifiers: [
      {
        type: 'effect',
        id: 'blur',
        params: {
          enabled: $PropertyValue.static(true),
          radius: $PropertyValue.static(15),
        },
      },
    ],
  },
]

export const TopLevelProcessor: Story = {
  args: {
    layers: mockLayersWithTopLevelProcessor,
    foregroundElements: [],
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(['background-group']),
  },
}

// Test: Group with 2 surfaces and processor - arrow should extend to both surfaces
const mockLayersWithTwoSurfacesAndProcessor: LayerNodeConfig[] = [
  {
    type: 'group',
    id: 'test-group',
    name: 'Test Group',
    visible: true,
    children: [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: createMockSurface('solid'),
        colors: { primary: 'B', secondary: 'auto' },
      },
      {
        type: 'surface',
        id: 'surface-2',
        name: 'Surface 2',
        visible: true,
        surface: createMockSurface('stripe', { width1: 10, width2: 10 }),
        colors: { primary: 'F1', secondary: 'auto' },
      },
      {
        type: 'processor',
        id: 'processor-effect',
        name: 'Effect Processor',
        visible: true,
        modifiers: [
          {
            type: 'effect',
            id: 'vignette',
            params: {
              enabled: $PropertyValue.static(true),
              radius: $PropertyValue.static(0.5),
            },
          },
        ],
      },
    ],
  },
]

export const TwoSurfacesWithProcessor: Story = {
  args: {
    layers: mockLayersWithTwoSurfacesAndProcessor,
    foregroundElements: [],
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(['test-group']),
  },
}

// Test 1: Nested group with processor
// Expected: surface-1 ↑, nested-group │, surface-3 │, processor └
const mockLayersNestedGroup: LayerNodeConfig[] = [
  {
    type: 'group',
    id: 'outer-group',
    name: 'Outer Group',
    visible: true,
    children: [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface 1',
        visible: true,
        surface: createMockSurface('solid'),
        colors: { primary: 'B', secondary: 'auto' },
      },
      {
        type: 'group',
        id: 'nested-group',
        name: 'Nested Group',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'nested-surface',
            name: 'Nested Surface',
            visible: true,
            surface: createMockSurface('grid'),
            colors: { primary: 'F1', secondary: 'auto' },
          },
        ],
      },
      {
        type: 'surface',
        id: 'surface-3',
        name: 'Surface 3',
        visible: true,
        surface: createMockSurface('stripe'),
        colors: { primary: 'F2', secondary: 'auto' },
      },
      {
        type: 'processor',
        id: 'processor-1',
        name: 'Processor',
        visible: true,
        modifiers: [
          {
            type: 'effect',
            id: 'blur',
            params: { enabled: $PropertyValue.static(true), radius: $PropertyValue.static(10) },
          },
        ],
      },
    ],
  },
]

export const NestedGroupWithProcessor: Story = {
  args: {
    layers: mockLayersNestedGroup,
    foregroundElements: [],
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(['outer-group', 'nested-group']),
  },
}

// Test 2: Root level - processor applies to all surfaces before it
// Expected: surface-1 ↑, surface-2 │, processor └
const mockLayersRootMultipleSurfaces: LayerNodeConfig[] = [
  {
    type: 'surface',
    id: 'surface-1',
    name: 'Surface 1',
    visible: true,
    surface: createMockSurface('solid'),
    colors: { primary: 'B', secondary: 'auto' },
  },
  {
    type: 'surface',
    id: 'surface-2',
    name: 'Surface 2',
    visible: true,
    surface: createMockSurface('stripe'),
    colors: { primary: 'F1', secondary: 'auto' },
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

export const RootProcessorMultipleSurfaces: Story = {
  args: {
    layers: mockLayersRootMultipleSurfaces,
    foregroundElements: [],
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(),
  },
}

// Test 3: Root level - processor applies to group and surfaces before it
// Expected: surface-1 ↑, group │, processor └
const mockLayersRootWithGroup: LayerNodeConfig[] = [
  {
    type: 'surface',
    id: 'surface-1',
    name: 'Surface 1',
    visible: true,
    surface: createMockSurface('solid'),
    colors: { primary: 'B', secondary: 'auto' },
  },
  {
    type: 'group',
    id: 'middle-group',
    name: 'Middle Group',
    visible: true,
    children: [
      {
        type: 'surface',
        id: 'group-surface-1',
        name: 'Group Surface 1',
        visible: true,
        surface: createMockSurface('grid'),
        colors: { primary: 'F1', secondary: 'auto' },
      },
      {
        type: 'surface',
        id: 'group-surface-2',
        name: 'Group Surface 2',
        visible: true,
        surface: createMockSurface('stripe'),
        colors: { primary: 'F2', secondary: 'auto' },
      },
    ],
  },
  {
    type: 'processor',
    id: 'processor-1',
    name: 'Processor',
    visible: true,
    modifiers: [
      {
        type: 'effect',
        id: 'vignette',
        params: { enabled: $PropertyValue.static(true), radius: $PropertyValue.static(0.5) },
      },
    ],
  },
]

export const RootProcessorWithGroup: Story = {
  args: {
    layers: mockLayersRootWithGroup,
    foregroundElements: [],
    selectedForegroundElementId: null,
    expandedLayerIds: new Set(['middle-group']),
  },
}
