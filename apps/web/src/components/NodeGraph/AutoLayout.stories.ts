/**
 * AutoLayout Stories
 *
 * HeroViewConfigからの自動レイアウト生成のサンプル
 * useAutoLayoutを使用してノードとコネクションを自動生成
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, computed } from 'vue'
import NodeGraph from './NodeGraph.vue'
import SurfaceNode from './SurfaceNode.vue'
import ProcessorPipeline from './ProcessorPipeline.vue'
import FilterNode from './FilterNode.vue'
import GraymapNode from './GraymapNode.vue'
import RenderNode from './RenderNode.vue'
import { useAutoLayout } from './useAutoLayout'
import type { HeroViewConfig, SurfaceLayerNodeConfig, SingleEffectConfig, MaskProcessorConfig } from '@practice/section-visual'
import { $PropertyValue, HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'

// ============================================================
// Helpers
// ============================================================

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: { l: 0.5, c: 0.15, h: 220 },
  accent: { l: 0.7, c: 0.18, h: 30 },
  foundation: { l: 0.95, c: 0.01, h: 220 },
})

// ============================================================
// Sample HeroViewConfigs
// ============================================================

const simpleConfig: HeroViewConfig = {
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'surface',
      id: 'surface-1',
      name: 'Stripe Pattern',
      visible: true,
      surface: {
        id: 'stripe',
        params: {
          width1: $PropertyValue.static(20),
          width2: $PropertyValue.static(20),
          angle: $PropertyValue.static(45),
          color1: $PropertyValue.static('B'),
          color2: $PropertyValue.static('F1'),
        },
      },
    },
    {
      type: 'processor',
      id: 'processor-1',
      name: 'Effects',
      visible: true,
      modifiers: [
        {
          type: 'effect',
          id: 'blur',
          params: { radius: $PropertyValue.static(8) },
        } satisfies SingleEffectConfig,
      ],
    },
  ],
  foreground: { elements: [] },
}

const multiSurfaceConfig: HeroViewConfig = {
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'surface',
      id: 'surface-1',
      name: 'Solid Background',
      visible: true,
      surface: {
        id: 'solid',
        params: {
          color1: $PropertyValue.static('B'),
        },
      },
    },
    {
      type: 'surface',
      id: 'surface-2',
      name: 'Stripe Overlay',
      visible: true,
      surface: {
        id: 'stripe',
        params: {
          width1: $PropertyValue.static(15),
          width2: $PropertyValue.static(15),
          angle: $PropertyValue.static(30),
          color1: $PropertyValue.static('B'),
          color2: $PropertyValue.static('F1'),
        },
      },
    },
    {
      type: 'processor',
      id: 'processor-1',
      name: 'Layer Effects',
      visible: true,
      modifiers: [
        {
          type: 'effect',
          id: 'blur',
          params: { radius: $PropertyValue.static(4) },
        } satisfies SingleEffectConfig,
        {
          type: 'effect',
          id: 'vignette',
          params: {
            intensity: $PropertyValue.static(0.5),
            size: $PropertyValue.static(0.3),
            roundness: $PropertyValue.static(0.5),
          },
        } satisfies SingleEffectConfig,
      ],
    },
  ],
  foreground: { elements: [] },
}

const withMaskConfig: HeroViewConfig = {
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'surface',
      id: 'surface-1',
      name: 'Grid Pattern',
      visible: true,
      surface: {
        id: 'grid',
        params: {
          cellSize: $PropertyValue.static(25),
          lineWidth: $PropertyValue.static(2),
          color1: $PropertyValue.static('B'),
          color2: $PropertyValue.static('F1'),
        },
      },
    },
    {
      type: 'processor',
      id: 'processor-1',
      name: 'Masked Effects',
      visible: true,
      modifiers: [
        {
          type: 'effect',
          id: 'blur',
          params: { radius: $PropertyValue.static(8) },
        } satisfies SingleEffectConfig,
        {
          type: 'mask',
          enabled: true,
          children: [
            {
              type: 'surface',
              id: 'mask-surface',
              name: 'Radial Gradient',
              visible: true,
              surface: {
                id: 'radialGradient',
                params: {
                  centerX: $PropertyValue.static(0.5),
                  centerY: $PropertyValue.static(0.5),
                  innerRadius: $PropertyValue.static(0.2),
                  outerRadius: $PropertyValue.static(0.8),
                  aspectRatio: $PropertyValue.static(1),
                },
              },
            },
          ],
          invert: false,
          feather: 0,
        } satisfies MaskProcessorConfig,
      ],
    },
  ],
  foreground: { elements: [] },
}

const complexConfig: HeroViewConfig = {
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'surface',
      id: 'surface-1',
      name: 'Solid Base',
      visible: true,
      surface: {
        id: 'solid',
        params: { color1: $PropertyValue.static('B') },
      },
    },
    {
      type: 'surface',
      id: 'surface-2',
      name: 'Stripe Pattern',
      visible: true,
      surface: {
        id: 'stripe',
        params: {
          width1: $PropertyValue.static(12),
          width2: $PropertyValue.static(12),
          angle: $PropertyValue.static(45),
          color1: $PropertyValue.static('B'),
          color2: $PropertyValue.static('F1'),
        },
      },
    },
    {
      type: 'surface',
      id: 'surface-3',
      name: 'Polka Dots',
      visible: true,
      surface: {
        id: 'polkaDot',
        params: {
          dotRadius: $PropertyValue.static(10),
          spacing: $PropertyValue.static(30),
          rowOffset: $PropertyValue.static(0.5),
          color1: $PropertyValue.static('B'),
          color2: $PropertyValue.static('F1'),
        },
      },
    },
    {
      type: 'processor',
      id: 'processor-1',
      name: 'Full Pipeline',
      visible: true,
      modifiers: [
        {
          type: 'effect',
          id: 'blur',
          params: { radius: $PropertyValue.static(4) },
        } satisfies SingleEffectConfig,
        {
          type: 'effect',
          id: 'chromaticAberration',
          params: {
            intensity: $PropertyValue.static(0.01),
            angle: $PropertyValue.static(0),
          },
        } satisfies SingleEffectConfig,
        {
          type: 'mask',
          enabled: true,
          children: [
            {
              type: 'surface',
              id: 'mask-surface',
              name: 'Box Gradient',
              visible: true,
              surface: {
                id: 'boxGradient',
                params: {
                  left: $PropertyValue.static(0.1),
                  right: $PropertyValue.static(0.1),
                  top: $PropertyValue.static(0.1),
                  bottom: $PropertyValue.static(0.1),
                  cornerRadius: $PropertyValue.static(0.05),
                  curve: $PropertyValue.static('smooth'),
                },
              },
            },
          ],
          invert: false,
          feather: 0,
        } satisfies MaskProcessorConfig,
      ],
    },
  ],
  foreground: { elements: [] },
}

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof NodeGraph> = {
  title: 'Components/NodeGraph/AutoLayout',
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
// Simple: 1 Surface → 1 Effect → Render
// ============================================================

export const Simple: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, RenderNode },
    setup() {
      const config = ref(simpleConfig)
      const layout = useAutoLayout(config)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      // Get render config for preview
      const renderConfig = computed(() => config.value)

      // Get source surface configs
      const getSurfaceConfig = (nodeId: string) => {
        const node = layout.value.sourceNodes.find(n => n.id === nodeId)
        if (node?.config && 'surface' in (node.config as SurfaceLayerNodeConfig)) {
          return (node.config as SurfaceLayerNodeConfig).surface
        }
        return null
      }

      // Get filter configs for a processor
      const getProcessorFilters = (processorId: string) => {
        return layout.value.filterNodes.filter(f => f.parentPipelineId === processorId)
      }

      return {
        layout,
        selectedNode,
        palette,
        renderConfig,
        handleSelectNode,
        getSurfaceConfig,
        getProcessorFilters,
      }
    },
    template: `
      <NodeGraph :connections="layout.connections" :columns="layout.columnCount" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Sources -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="source in layout.sourceNodes"
              :key="source.id"
              :ref="(el) => setNodeRef(source.id, el)"
              style="width: fit-content;"
            >
              <SurfaceNode
                :surface="getSurfaceConfig(source.id)"
                :palette="palette"
                :selected="selectedNode === source.id"
                @click="handleSelectNode(source.id)"
              />
            </div>
          </div>

          <!-- Column 2: Processors -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="processor in layout.processorNodes"
              :key="processor.id"
              :ref="(el) => setNodeRef(processor.id, el)"
              style="width: fit-content;"
            >
              <ProcessorPipeline
                :selected="selectedNode === processor.id"
                @click="handleSelectNode(processor.id)"
              >
                <FilterNode
                  v-for="filter in getProcessorFilters(processor.id)"
                  :key="filter.id"
                  :type="filter.type === 'effect' ? 'effect' : 'mask'"
                  :label="filter.label"
                />
              </ProcessorPipeline>
            </div>
          </div>

          <!-- Column 3: Render -->
          <div v-if="layout.renderNode" style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
              <RenderNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'render'"
                @click="handleSelectNode('render')"
              />
            </div>
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// MultiSurface: 2 Surfaces → Multiple Effects → Render
// ============================================================

export const MultiSurface: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, RenderNode },
    setup() {
      const config = ref(multiSurfaceConfig)
      const layout = useAutoLayout(config)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const renderConfig = computed(() => config.value)

      const getSurfaceConfig = (nodeId: string) => {
        const node = layout.value.sourceNodes.find(n => n.id === nodeId)
        if (node?.config && 'surface' in (node.config as SurfaceLayerNodeConfig)) {
          return (node.config as SurfaceLayerNodeConfig).surface
        }
        return null
      }

      const getProcessorFilters = (processorId: string) => {
        return layout.value.filterNodes.filter(f => f.parentPipelineId === processorId)
      }

      return {
        layout,
        selectedNode,
        palette,
        renderConfig,
        handleSelectNode,
        getSurfaceConfig,
        getProcessorFilters,
      }
    },
    template: `
      <NodeGraph :connections="layout.connections" :columns="layout.columnCount" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Sources -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="source in layout.sourceNodes"
              :key="source.id"
              :ref="(el) => setNodeRef(source.id, el)"
              style="width: fit-content;"
            >
              <SurfaceNode
                :surface="getSurfaceConfig(source.id)"
                :palette="palette"
                :selected="selectedNode === source.id"
                @click="handleSelectNode(source.id)"
              />
            </div>
          </div>

          <!-- Column 2: Processors -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="processor in layout.processorNodes"
              :key="processor.id"
              :ref="(el) => setNodeRef(processor.id, el)"
              style="width: fit-content;"
            >
              <ProcessorPipeline
                :selected="selectedNode === processor.id"
                @click="handleSelectNode(processor.id)"
              >
                <FilterNode
                  v-for="filter in getProcessorFilters(processor.id)"
                  :key="filter.id"
                  :type="filter.type === 'effect' ? 'effect' : 'mask'"
                  :label="filter.label"
                />
              </ProcessorPipeline>
            </div>
          </div>

          <!-- Column 3: Render -->
          <div v-if="layout.renderNode" style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
              <RenderNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'render'"
                @click="handleSelectNode('render')"
              />
            </div>
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// WithMask: Surface → Effect + Mask + Graymap → Render
// ============================================================

export const WithMask: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const config = ref(withMaskConfig)
      const layout = useAutoLayout(config)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const renderConfig = computed(() => config.value)

      const getSurfaceConfig = (nodeId: string) => {
        const node = layout.value.sourceNodes.find(n => n.id === nodeId)
        if (node?.config && 'surface' in (node.config as SurfaceLayerNodeConfig)) {
          return (node.config as SurfaceLayerNodeConfig).surface
        }
        return null
      }

      const getProcessorFilters = (processorId: string) => {
        return layout.value.filterNodes.filter(f => f.parentPipelineId === processorId)
      }

      const getProcessorGraymaps = (processorId: string) => {
        return layout.value.graymapNodes.filter(g => g.parentPipelineId === processorId)
      }

      // Get mask filter that corresponds to a graymap
      const getMaskForGraymap = (graymapId: string) => {
        const graymapIndex = graymapId.replace(/.*-graymap-/, '')
        return layout.value.filterNodes.find(f =>
          f.parentPipelineId && f.id.endsWith(`-mask-${graymapIndex}`)
        )
      }

      return {
        layout,
        selectedNode,
        palette,
        renderConfig,
        handleSelectNode,
        getSurfaceConfig,
        getProcessorFilters,
        getProcessorGraymaps,
        getMaskForGraymap,
      }
    },
    template: `
      <NodeGraph :connections="layout.connections" :columns="layout.columnCount" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Sources -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="source in layout.sourceNodes"
              :key="source.id"
              :ref="(el) => setNodeRef(source.id, el)"
              style="width: fit-content;"
            >
              <SurfaceNode
                :surface="getSurfaceConfig(source.id)"
                :palette="palette"
                :selected="selectedNode === source.id"
                @click="handleSelectNode(source.id)"
              />
            </div>
          </div>

          <!-- Column 2: Processors -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="processor in layout.processorNodes"
              :key="processor.id"
              :ref="(el) => setNodeRef(processor.id, el)"
              style="width: fit-content;"
            >
              <ProcessorPipeline
                :selected="selectedNode === processor.id"
                @click="handleSelectNode(processor.id)"
              >
                <template v-for="filter in getProcessorFilters(processor.id)" :key="filter.id">
                  <!-- If it's a mask with graymap, render them together -->
                  <template v-if="filter.type === 'mask'">
                    <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                      <FilterNode
                        :type="'mask'"
                        :label="filter.label"
                      />
                      <GraymapNode
                        v-for="graymap in getProcessorGraymaps(processor.id).filter(g => g.id.includes(filter.id.replace('mask', 'graymap').split('-').pop()))"
                        :key="graymap.id"
                        :label="graymap.label"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <FilterNode
                      :type="'effect'"
                      :label="filter.label"
                    />
                  </template>
                </template>
              </ProcessorPipeline>
            </div>
          </div>

          <!-- Column 3: Render -->
          <div v-if="layout.renderNode" style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
              <RenderNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'render'"
                @click="handleSelectNode('render')"
              />
            </div>
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}

// ============================================================
// Complex: 3 Surfaces → Effect + Effect + Mask + Graymap → Render
// ============================================================

export const Complex: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const config = ref(complexConfig)
      const layout = useAutoLayout(config)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const renderConfig = computed(() => config.value)

      const getSurfaceConfig = (nodeId: string) => {
        const node = layout.value.sourceNodes.find(n => n.id === nodeId)
        if (node?.config && 'surface' in (node.config as SurfaceLayerNodeConfig)) {
          return (node.config as SurfaceLayerNodeConfig).surface
        }
        return null
      }

      const getProcessorFilters = (processorId: string) => {
        return layout.value.filterNodes.filter(f => f.parentPipelineId === processorId)
      }

      const getProcessorGraymaps = (processorId: string) => {
        return layout.value.graymapNodes.filter(g => g.parentPipelineId === processorId)
      }

      return {
        layout,
        selectedNode,
        palette,
        renderConfig,
        handleSelectNode,
        getSurfaceConfig,
        getProcessorFilters,
        getProcessorGraymaps,
      }
    },
    template: `
      <NodeGraph :connections="layout.connections" :columns="layout.columnCount" gap="2rem">
        <template #default="{ setNodeRef }">
          <!-- Column 1: Sources -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: center;">
            <div
              v-for="source in layout.sourceNodes"
              :key="source.id"
              :ref="(el) => setNodeRef(source.id, el)"
              style="width: fit-content;"
            >
              <SurfaceNode
                :surface="getSurfaceConfig(source.id)"
                :palette="palette"
                :selected="selectedNode === source.id"
                @click="handleSelectNode(source.id)"
              />
            </div>
          </div>

          <!-- Column 2: Processors -->
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div
              v-for="processor in layout.processorNodes"
              :key="processor.id"
              :ref="(el) => setNodeRef(processor.id, el)"
              style="width: fit-content;"
            >
              <ProcessorPipeline
                :selected="selectedNode === processor.id"
                @click="handleSelectNode(processor.id)"
              >
                <template v-for="filter in getProcessorFilters(processor.id)" :key="filter.id">
                  <!-- If it's a mask with graymap, render them together -->
                  <template v-if="filter.type === 'mask'">
                    <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                      <FilterNode
                        :type="'mask'"
                        :label="filter.label"
                      />
                      <GraymapNode
                        v-for="graymap in getProcessorGraymaps(processor.id)"
                        :key="graymap.id"
                        :label="graymap.label"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <FilterNode
                      :type="'effect'"
                      :label="filter.label"
                    />
                  </template>
                </template>
              </ProcessorPipeline>
            </div>
          </div>

          <!-- Column 3: Render -->
          <div v-if="layout.renderNode" style="display: flex; align-items: center;">
            <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
              <RenderNode
                :config="renderConfig"
                :palette="palette"
                :selected="selectedNode === 'render'"
                @click="handleSelectNode('render')"
              />
            </div>
          </div>
        </template>
      </NodeGraph>
    `,
  }),
}
