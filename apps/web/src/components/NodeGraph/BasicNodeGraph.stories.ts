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
import ProcessorNode from './ProcessorNode.vue'
import GraymapNode from './GraymapNode.vue'
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
    components: { NodeGraph, SurfaceNode, CompositorNode, ProcessorNode, RenderNode },
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

// ============================================================
// Surface → Effect → Render
// ============================================================

export const SurfaceToEffectToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, RenderNode },
    setup() {
      const surface = createMockSurface('stripe', { width1: 20, width2: 20, angle: 45 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'effect-1', position: 'left' },
        },
        {
          from: { nodeId: 'effect-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="3" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surface -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surface"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
          </div>

          <!-- Column 2: Effect -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('effect-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Blur"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-1'"
                @click="handleSelectNode('effect-1')"
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

// ============================================================
// Surface → Mask (with Graymap) → Render
// ============================================================

export const SurfaceToMaskToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, GraymapNode, RenderNode },
    setup() {
      const surface = createMockSurface('grid', { cellSize: 40, lineWidth: 2 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surface → Mask (main input, top port at 30%)
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        // Graymap → Mask (mask input, bottom port at 70%)
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        // Mask → Render
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="3" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surface + Graymap -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surface"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('graymap-1', el)" style="width: fit-content;">
              <GraymapNode
                label="Linear Gradient"
                :palette="palette"
                :selected="selectedNode === 'graymap-1'"
                @click="handleSelectNode('graymap-1')"
              />
            </div>
          </div>

          <!-- Column 2: Mask -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('mask-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="mask"
                label="Gradient Mask"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'mask-1'"
                @click="handleSelectNode('mask-1')"
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

// ============================================================
// Complex: Surface → Effect → Mask (with Graymap) → Render
// ============================================================

export const SurfaceToEffectToMaskToRender: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, GraymapNode, RenderNode },
    setup() {
      const surface = createMockSurface('stripe', { width1: 15, width2: 15, angle: 30 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surface → Effect
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'effect-1', position: 'left' },
        },
        // Effect → Mask (main input at 30%)
        {
          from: { nodeId: 'effect-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        // Graymap → Mask (mask input at 70%)
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        // Mask → Render
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="4" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surface -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surface"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
          </div>

          <!-- Column 2: Effect + Graymap -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('effect-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Blur"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-1'"
                @click="handleSelectNode('effect-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('graymap-1', el)" style="width: fit-content;">
              <GraymapNode
                label="Radial Gradient"
                :palette="palette"
                :selected="selectedNode === 'graymap-1'"
                @click="handleSelectNode('graymap-1')"
              />
            </div>
          </div>

          <!-- Column 3: Mask -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('mask-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="mask"
                label="Gradient Mask"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'mask-1'"
                @click="handleSelectNode('mask-1')"
              />
            </div>
          </div>

          <!-- Column 4: Render -->
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
// Complex: Parallel Effects → Compositor → Render
// Two surfaces processed independently then composited
// ============================================================

export const ParallelEffectsToCompositor: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, CompositorNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('stripe', { width1: 20, width2: 20, angle: 45 }),
        createMockSurface('grid', { cellSize: 30, lineWidth: 2 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surface1 → Effect1 (Blur)
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'effect-1', position: 'left' },
        },
        // Surface2 → Effect2 (Sharpen)
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'effect-2', position: 'left' },
        },
        // Effect1 → Compositor
        {
          from: { nodeId: 'effect-1', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.35 },
        },
        // Effect2 → Compositor
        {
          from: { nodeId: 'effect-2', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.65 },
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
      <NodeGraph :connections="connections" :columns="4" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surfaces -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[0]"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('surface-2', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[1]"
                :palette="palette"
                :selected="selectedNode === 'surface-2'"
                @click="handleSelectNode('surface-2')"
              />
            </div>
          </div>

          <!-- Column 2: Effects -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('effect-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Blur"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-1'"
                @click="handleSelectNode('effect-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('effect-2', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Sharpen"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-2'"
                @click="handleSelectNode('effect-2')"
              />
            </div>
          </div>

          <!-- Column 3: Compositor -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('compositor-1', el)" style="width: fit-content;">
              <CompositorNode
                label="Blend"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'compositor-1'"
                @click="handleSelectNode('compositor-1')"
              />
            </div>
          </div>

          <!-- Column 4: Render -->
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
// Complex: Multi-Layer with Post-Compositor Mask
// Multiple surfaces → Compositor → Mask → Render
// ============================================================

export const MultiLayerWithMask: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, CompositorNode, GraymapNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('solid'),
        createMockSurface('stripe', { width1: 15, width2: 15, angle: 30 }),
        createMockSurface('grid', { cellSize: 25, lineWidth: 1 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surfaces → Compositor
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.25 },
        },
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.5 },
        },
        {
          from: { nodeId: 'surface-3', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.75 },
        },
        // Compositor → Mask (main input)
        {
          from: { nodeId: 'compositor-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        // Graymap → Mask (mask input)
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        // Mask → Render
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surfaces, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="4" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surfaces -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[0]"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('surface-2', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[1]"
                :palette="palette"
                :selected="selectedNode === 'surface-2'"
                @click="handleSelectNode('surface-2')"
              />
            </div>
            <div :ref="(el) => setNodeRef('surface-3', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[2]"
                :palette="palette"
                :selected="selectedNode === 'surface-3'"
                @click="handleSelectNode('surface-3')"
              />
            </div>
          </div>

          <!-- Column 2: Compositor + Graymap -->
          <div style="display: flex; flex-direction: column; gap: 1rem; justify-content: center;">
            <div :ref="(el) => setNodeRef('compositor-1', el)" style="width: fit-content;">
              <CompositorNode
                label="Layer Stack"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'compositor-1'"
                @click="handleSelectNode('compositor-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('graymap-1', el)" style="width: fit-content;">
              <GraymapNode
                label="Vignette"
                :palette="palette"
                :selected="selectedNode === 'graymap-1'"
                @click="handleSelectNode('graymap-1')"
              />
            </div>
          </div>

          <!-- Column 3: Mask -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('mask-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="mask"
                label="Vignette Mask"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'mask-1'"
                @click="handleSelectNode('mask-1')"
              />
            </div>
          </div>

          <!-- Column 4: Render -->
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
// Complex: Dual Mask Chain
// Surface → Effect → Mask1 → Mask2 → Render
// ============================================================

export const DualMaskChain: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, GraymapNode, RenderNode },
    setup() {
      const surface = createMockSurface('stripe', { width1: 25, width2: 25, angle: 60 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surface → Effect
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'effect-1', position: 'left' },
        },
        // Effect → Mask1 (main)
        {
          from: { nodeId: 'effect-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        // Graymap1 → Mask1 (mask)
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        // Mask1 → Mask2 (main)
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'mask-2', position: 'left', portOffset: 0.3 },
        },
        // Graymap2 → Mask2 (mask)
        {
          from: { nodeId: 'graymap-2', position: 'right' },
          to: { nodeId: 'mask-2', position: 'left', portOffset: 0.7 },
        },
        // Mask2 → Render
        {
          from: { nodeId: 'mask-2', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surface, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="5" gap="1.5rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surface -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surface"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
          </div>

          <!-- Column 2: Effect + Graymap1 -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('effect-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Color Adjust"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-1'"
                @click="handleSelectNode('effect-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('graymap-1', el)" style="width: fit-content;">
              <GraymapNode
                label="Horizontal Grad"
                :palette="palette"
                :selected="selectedNode === 'graymap-1'"
                @click="handleSelectNode('graymap-1')"
              />
            </div>
          </div>

          <!-- Column 3: Mask1 + Graymap2 -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('mask-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="mask"
                label="Left Fade"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'mask-1'"
                @click="handleSelectNode('mask-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('graymap-2', el)" style="width: fit-content;">
              <GraymapNode
                label="Vertical Grad"
                :palette="palette"
                :selected="selectedNode === 'graymap-2'"
                @click="handleSelectNode('graymap-2')"
              />
            </div>
          </div>

          <!-- Column 4: Mask2 -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('mask-2', el)" style="width: fit-content;">
              <ProcessorNode
                type="mask"
                label="Top Fade"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'mask-2'"
                @click="handleSelectNode('mask-2')"
              />
            </div>
          </div>

          <!-- Column 5: Render -->
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
// Complex: Full Pipeline
// Multiple sources → Effects → Compositor → Effect → Mask → Render
// ============================================================

export const FullPipeline: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorNode, CompositorNode, GraymapNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('solid'),
        createMockSurface('stripe', { width1: 12, width2: 12, angle: 45 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // Surface1 → Effect1
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'effect-1', position: 'left' },
        },
        // Surface2 (direct to compositor, skips Effect1)
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.65 },
        },
        // Effect1 → Compositor
        {
          from: { nodeId: 'effect-1', position: 'right' },
          to: { nodeId: 'compositor-1', position: 'left', portOffset: 0.35 },
        },
        // Compositor → Effect2
        {
          from: { nodeId: 'compositor-1', position: 'right' },
          to: { nodeId: 'effect-2', position: 'left' },
        },
        // Effect2 → Mask (main)
        {
          from: { nodeId: 'effect-2', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        // Graymap → Mask
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        // Mask → Render
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
      ]

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      return { surfaces, renderConfig, selectedNode, connections, handleSelectNode, palette }
    },
    template: `
      <NodeGraph :connections="connections" :columns="6" gap="1.25rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Surfaces -->
          <div style="display: flex; flex-direction: column; gap: 1rem; justify-content: center;">
            <div :ref="(el) => setNodeRef('surface-1', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[0]"
                :palette="palette"
                :selected="selectedNode === 'surface-1'"
                @click="handleSelectNode('surface-1')"
              />
            </div>
            <div :ref="(el) => setNodeRef('surface-2', el)" style="width: fit-content;">
              <SurfaceNode
                :surface="surfaces[1]"
                :palette="palette"
                :selected="selectedNode === 'surface-2'"
                @click="handleSelectNode('surface-2')"
              />
            </div>
          </div>

          <!-- Column 2: Effect1 (processes Surface1 only) -->
          <div style="display: flex; align-items: flex-start; padding-top: 0;">
            <div :ref="(el) => setNodeRef('effect-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Blur"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-1'"
                @click="handleSelectNode('effect-1')"
              />
            </div>
          </div>

          <!-- Column 3: Compositor (merges Effect1 output + Surface2) -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('compositor-1', el)" style="width: fit-content;">
              <CompositorNode
                label="Overlay"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'compositor-1'"
                @click="handleSelectNode('compositor-1')"
              />
            </div>
          </div>

          <!-- Column 4: Effect2 + Graymap -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div :ref="(el) => setNodeRef('effect-2', el)" style="width: fit-content;">
              <ProcessorNode
                type="effect"
                label="Contrast"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'effect-2'"
                @click="handleSelectNode('effect-2')"
              />
            </div>
            <div :ref="(el) => setNodeRef('graymap-1', el)" style="width: fit-content;">
              <GraymapNode
                label="Radial Fade"
                :palette="palette"
                :selected="selectedNode === 'graymap-1'"
                @click="handleSelectNode('graymap-1')"
              />
            </div>
          </div>

          <!-- Column 5: Mask -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('mask-1', el)" style="width: fit-content;">
              <ProcessorNode
                type="mask"
                label="Vignette"
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'mask-1'"
                @click="handleSelectNode('mask-1')"
              />
            </div>
          </div>

          <!-- Column 6: Render -->
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
