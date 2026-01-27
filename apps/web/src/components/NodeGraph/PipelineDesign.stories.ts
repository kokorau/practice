/**
 * PipelineDesign Stories
 *
 * 新しいパイプライン設計のサンプル
 * - ProcessorPipeline: 点線枠のコンテナ（Compositorの代わり）
 * - FilterNode: Effect/Maskの大きいノード（160px）
 * - GraymapNode: Pipeline内部でMaskの下に配置
 * - 入力はすべてPipelineの左端に接続
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import NodeGraph from './NodeGraph.vue'
import SurfaceNode from './SurfaceNode.vue'
import ProcessorPipeline from './ProcessorPipeline.vue'
import FilterNode from './FilterNode.vue'
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
// Helpers
// ============================================================

const createMockSurface = (
  id: string,
  params: Record<string, number | string> = {}
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

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: { L: 0.5, C: 0.15, H: 220 },
  accent: { L: 0.7, C: 0.18, H: 30 },
  foundation: { L: 0.95, C: 0.01, H: 220 },
})

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof NodeGraph> = {
  title: 'Components/NodeGraph/PipelineDesign',
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
// Basic: Surface → Pipeline[Effect] → Render
// ============================================================

export const SingleEffect: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, RenderNode },
    setup() {
      const surface = createMockSurface('stripe', { width1: 20, width2: 20, angle: 45 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // External connections
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'pipeline-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        // Internal connections: Junction → Blur → Output
        {
          from: { nodeId: 'pipeline-1', position: 'left' },
          to: { nodeId: 'blur-1', position: 'left' },
        },
        {
          from: { nodeId: 'blur-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'right' },
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

          <!-- Column 2: Pipeline with Effect -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('pipeline-1', el)" style="width: fit-content;">
              <ProcessorPipeline
                :selected="selectedNode === 'pipeline-1'"
                @click="handleSelectNode('pipeline-1')"
              >
                <div :ref="(el) => setNodeRef('blur-1', el)">
                  <FilterNode type="effect" label="Blur" />
                </div>
              </ProcessorPipeline>
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
// Pipeline with Effect chain: Surface → Pipeline[Effect → Effect] → Render
// ============================================================

export const EffectChain: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, RenderNode },
    setup() {
      const surface = createMockSurface('grid', { cellSize: 30, lineWidth: 2 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // External connections
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'pipeline-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        // Internal connections: Junction → Blur → Contrast → Output
        {
          from: { nodeId: 'pipeline-1', position: 'left' },
          to: { nodeId: 'blur-1', position: 'left' },
        },
        {
          from: { nodeId: 'blur-1', position: 'right' },
          to: { nodeId: 'contrast-1', position: 'left' },
        },
        {
          from: { nodeId: 'contrast-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'right' },
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

          <!-- Column 2: Pipeline with Effect chain -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('pipeline-1', el)" style="width: fit-content;">
              <ProcessorPipeline
                :selected="selectedNode === 'pipeline-1'"
                @click="handleSelectNode('pipeline-1')"
              >
                <div :ref="(el) => setNodeRef('blur-1', el)">
                  <FilterNode type="effect" label="Blur" />
                </div>
                <div :ref="(el) => setNodeRef('contrast-1', el)">
                  <FilterNode type="effect" label="Contrast" />
                </div>
              </ProcessorPipeline>
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
// Pipeline with Mask: Surface → Pipeline[Mask + Graymap] → Render
// Graymap is INSIDE the pipeline, below the Mask
// ============================================================

export const SingleMask: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const surface = createMockSurface('stripe', { width1: 15, width2: 15, angle: 30 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // External connections
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'pipeline-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        // Internal connections: Junction → Mask (main), Graymap → Mask (mask), Mask → Output
        {
          from: { nodeId: 'pipeline-1', position: 'left' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'right' },
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

          <!-- Column 2: Pipeline with Graymap (left) → Mask (right) -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('pipeline-1', el)" style="width: fit-content;">
              <ProcessorPipeline
                :selected="selectedNode === 'pipeline-1'"
                @click="handleSelectNode('pipeline-1')"
              >
                <!-- Graymap on left, Mask on right -->
                <div :ref="(el) => setNodeRef('graymap-1', el)" style="align-self: flex-end;">
                  <GraymapNode label="Radial Gradient" />
                </div>
                <div :ref="(el) => setNodeRef('mask-1', el)">
                  <FilterNode type="mask" label="Vignette" />
                </div>
              </ProcessorPipeline>
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
// Full Pipeline: Surface → Pipeline[Effect → Mask + Graymap] → Render
// ============================================================

export const EffectThenMask: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const surface = createMockSurface('grid', { cellSize: 25, lineWidth: 2 })
      const renderConfig = createRenderConfig([surface])
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // External connections
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'pipeline-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        // Internal connections: Junction → Blur → Mask, Graymap → Mask, Mask → Output
        {
          from: { nodeId: 'pipeline-1', position: 'left' },
          to: { nodeId: 'blur-1', position: 'left' },
        },
        {
          from: { nodeId: 'blur-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'right' },
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

          <!-- Column 2: Pipeline with Blur → Graymap/Mask -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('pipeline-1', el)" style="width: fit-content;">
              <ProcessorPipeline
                :selected="selectedNode === 'pipeline-1'"
                @click="handleSelectNode('pipeline-1')"
              >
                <div :ref="(el) => setNodeRef('blur-1', el)">
                  <FilterNode type="effect" label="Blur" />
                </div>
                <div :ref="(el) => setNodeRef('graymap-1', el)" style="align-self: flex-end;">
                  <GraymapNode label="Linear Gradient" />
                </div>
                <div :ref="(el) => setNodeRef('mask-1', el)">
                  <FilterNode type="mask" label="Fade" />
                </div>
              </ProcessorPipeline>
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
// Multiple inputs merging into Pipeline
// [Surface1] ─┐
// [Surface2] ─┼─→ Pipeline[Effect] → Render
// ============================================================

export const MultipleInputs: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('solid'),
        createMockSurface('stripe', { width1: 12, width2: 12, angle: 45 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // External: Surfaces → Pipeline
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        // External: Pipeline → Render
        {
          from: { nodeId: 'pipeline-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        // Internal: Junction → Blur → Output
        {
          from: { nodeId: 'pipeline-1', position: 'left' },
          to: { nodeId: 'blur-1', position: 'left' },
        },
        {
          from: { nodeId: 'blur-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'right' },
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

          <!-- Column 2: Pipeline -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('pipeline-1', el)" style="width: fit-content;">
              <ProcessorPipeline
                :selected="selectedNode === 'pipeline-1'"
                @click="handleSelectNode('pipeline-1')"
              >
                <div :ref="(el) => setNodeRef('blur-1', el)">
                  <FilterNode type="effect" label="Blur" />
                </div>
              </ProcessorPipeline>
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
// Complex: Multiple inputs → Pipeline[Effect → Effect → Mask + Graymap] → Render
// ============================================================

export const ComplexPipeline: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const surfaces = [
        createMockSurface('solid'),
        createMockSurface('stripe', { width1: 15, width2: 15, angle: 30 }),
        createMockSurface('grid', { cellSize: 20, lineWidth: 1 }),
      ]
      const renderConfig = createRenderConfig(surfaces)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const connections: Connection[] = [
        // External: Surfaces → Pipeline
        {
          from: { nodeId: 'surface-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'surface-2', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        {
          from: { nodeId: 'surface-3', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'left' },
        },
        // External: Pipeline → Render
        {
          from: { nodeId: 'pipeline-1', position: 'right' },
          to: { nodeId: 'render-1', position: 'left' },
        },
        // Internal: Junction → Blur → Contrast → Mask, Graymap → Mask, Mask → Output
        {
          from: { nodeId: 'pipeline-1', position: 'left' },
          to: { nodeId: 'blur-1', position: 'left' },
        },
        {
          from: { nodeId: 'blur-1', position: 'right' },
          to: { nodeId: 'contrast-1', position: 'left' },
        },
        {
          from: { nodeId: 'contrast-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.3 },
        },
        {
          from: { nodeId: 'graymap-1', position: 'right' },
          to: { nodeId: 'mask-1', position: 'left', portOffset: 0.7 },
        },
        {
          from: { nodeId: 'mask-1', position: 'right' },
          to: { nodeId: 'pipeline-1', position: 'right' },
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

          <!-- Column 2: Pipeline with Blur → Contrast → Graymap/Mask -->
          <div style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('pipeline-1', el)" style="width: fit-content;">
              <ProcessorPipeline
                :selected="selectedNode === 'pipeline-1'"
                @click="handleSelectNode('pipeline-1')"
              >
                <div :ref="(el) => setNodeRef('blur-1', el)">
                  <FilterNode type="effect" label="Blur" />
                </div>
                <div :ref="(el) => setNodeRef('contrast-1', el)">
                  <FilterNode type="effect" label="Contrast" />
                </div>
                <div :ref="(el) => setNodeRef('graymap-1', el)" style="align-self: flex-end;">
                  <GraymapNode label="Radial Fade" />
                </div>
                <div :ref="(el) => setNodeRef('mask-1', el)">
                  <FilterNode type="mask" label="Vignette" />
                </div>
              </ProcessorPipeline>
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
