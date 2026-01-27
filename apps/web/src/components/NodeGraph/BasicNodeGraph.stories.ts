/**
 * BasicNodeGraph Stories
 *
 * 基本的なノードグラフUI: [Surface] → [Render]
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import NodeGraph from './NodeGraph.vue'
import SurfaceNode from './SurfaceNode.vue'
import CompositorNode from './CompositorNode.vue'
import RenderNode from './RenderNode.vue'
import type { Connection } from './types'
import {
  $PropertyValue,
  type NormalizedSurfaceConfig,
  type HeroViewConfig,
  HERO_CANVAS_WIDTH,
  HERO_CANVAS_HEIGHT,
} from '@practice/section-visual'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'

// ============================================================
// Helper: Create mock surface config
// ============================================================

const createMockSurface = (
  id: string,
  params: Record<string, number | string> = {},
): NormalizedSurfaceConfig => ({
  id: id as NormalizedSurfaceConfig['id'],
  params: {
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, $PropertyValue.static(value)])
    ),
    color1: $PropertyValue.static('B'),
    color2: $PropertyValue.static('F1'),
  },
})

// Helper: Create HeroViewConfig from surfaces
const createRenderConfig = (surfaces: NormalizedSurfaceConfig[]): HeroViewConfig => ({
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: surfaces.map((surface, index) => ({
    id: `surface-${index}`,
    name: `Surface ${index}`,
    type: 'surface' as const,
    visible: true,
    surface,
  })),
  foreground: { elements: [] },
})

// Default palette
const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: { l: 0.5, c: 0.15, h: 220 },
  accent: { l: 0.7, c: 0.18, h: 30 },
  foundation: { l: 0.95, c: 0.01, h: 220 },
})

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof NodeGraph> = {
  title: 'Components/NodeGraph/BasicNodeGraph',
  component: NodeGraph,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
        { name: 'light', value: '#f5f5f5' },
      ],
    },
  },
  decorators: [
    () => ({
      template: '<div style="padding: 40px;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof NodeGraph>

// ============================================================
// Basic: Surface → Render
// ============================================================

export const SurfaceToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, RenderNode },
    setup() {
      const surface = createMockSurface('solid')
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="2" gap="3rem">
        <template #default="{ setNodeRef }">
          <div :ref="(el) => setNodeRef('surface-1', el)" style="display: flex; align-items: center;">
            <SurfaceNode
              :surface="surface"
              :palette="palette"
              :selected="selectedNode === 'surface-1'"
              @click="handleSelectNode('surface-1')"
            />
          </div>
          <div :ref="(el) => setNodeRef('render-1', el)" style="display: flex; align-items: center;">
            <RenderNode
              :config="renderConfig"
              :palette="palette"
              :selected="selectedNode === 'render-1'"
              @click="handleSelectNode('render-1')"
            />
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// Stripe Surface → Render
// ============================================================

export const StripeSurfaceToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, RenderNode },
    setup() {
      const surface = createMockSurface('stripe', { width1: 20, width2: 20, angle: 45 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="2" gap="3rem">
        <template #default="{ setNodeRef }">
          <div :ref="(el) => setNodeRef('surface-1', el)" style="display: flex; align-items: center;">
            <SurfaceNode
              :surface="surface"
              :palette="palette"
              :selected="selectedNode === 'surface-1'"
              @click="handleSelectNode('surface-1')"
            />
          </div>
          <div :ref="(el) => setNodeRef('render-1', el)" style="display: flex; align-items: center;">
            <RenderNode
              :config="renderConfig"
              :palette="palette"
              :selected="selectedNode === 'render-1'"
              @click="handleSelectNode('render-1')"
            />
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// Grid Surface → Render
// ============================================================

export const GridSurfaceToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, RenderNode },
    setup() {
      const surface = createMockSurface('grid', { cellSize: 40, lineWidth: 2 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="2" gap="3rem">
        <template #default="{ setNodeRef }">
          <div :ref="(el) => setNodeRef('surface-1', el)" style="display: flex; align-items: center;">
            <SurfaceNode
              :surface="surface"
              :palette="palette"
              :selected="selectedNode === 'surface-1'"
              @click="handleSelectNode('surface-1')"
            />
          </div>
          <div :ref="(el) => setNodeRef('render-1', el)" style="display: flex; align-items: center;">
            <RenderNode
              :config="renderConfig"
              :palette="palette"
              :selected="selectedNode === 'render-1'"
              @click="handleSelectNode('render-1')"
            />
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// Multiple Surfaces (stacked) → Render
// ============================================================

export const MultipleSurfacesToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('solid'),
        createMockSurface('stripe', { width1: 10, width2: 10, angle: 45 }),
        createMockSurface('grid', { cellSize: 32, lineWidth: 2 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        {
          from: { nodeId: 'surface-3', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surfaces, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="2" gap="3rem">
        <template #default="{ setNodeRef }">
          <div style="display: flex; flex-direction: column; gap: 1rem; width: fit-content;">
            <div
              v-for="(surface, index) in surfaces"
              :key="'surface-' + (index + 1)"
              :ref="(el) => setNodeRef('surface-' + (index + 1), el)"
              style="width: fit-content;"
            >
              <SurfaceNode
                :surface="surface"
                :palette="palette"
                :selected="selectedNode === 'surface-' + (index + 1)"
                @click="handleSelectNode('surface-' + (index + 1))"
              />
            </div>
          </div>
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('render-1', el)" style="width: fit-content;">
              <RenderNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'render-1'"
                @click="handleSelectNode('render-1')"
              />
            </div>
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// Surfaces → Compositor → Render
// ============================================================

export const SurfacesToCompositorToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, CompositorNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('solid'),
        createMockSurface('stripe', { width1: 15, width2: 15, angle: 45 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surfaces → Compositor
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left' },
        },
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left' },
        },
        // Compositor → Render
        {
          from: { nodeId: 'compositor-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surfaces, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="3" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surfaces -->
          <div style="display: flex; flex-direction: column; gap: 1rem; width: fit-content;">
            <div
              v-for="(surface, index) in surfaces"
              :key="'surface-' + (index + 1)"
              :ref="(el) => setNodeRef('surface-' + (index + 1), el)"
              style="width: fit-content;"
            >
              <SurfaceNode
                :surface="surface"
                :palette="palette"
                :selected="selectedNode === 'surface-' + (index + 1)"
                @click="handleSelectNode('surface-' + (index + 1))"
              />
            </div>
          </div>

          <!-- Column 2: Compositor -->
          <div style="display: flex; align-items: center; justify-content: center;">
            <div :ref="(el) => setNodeRef('compositor-1', el)" style="width: fit-content;">
              <CompositorNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'compositor-1'"
                @click="handleSelectNode('compositor-1')"
              />
            </div>
          </div>

          <!-- Column 3: Render -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('render-1', el)" style="width: fit-content;">
              <RenderNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'render-1'"
                @click="handleSelectNode('render-1')"
              />
            </div>
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}
