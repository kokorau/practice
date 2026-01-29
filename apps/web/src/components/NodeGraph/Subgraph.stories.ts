/**
 * Subgraph Stories
 *
 * extractSubgraphを使用した断片化グラフのサンプル
 * 特定のノードIDを指定して上流フローのみを表示
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
import { useSubgraph } from './extractSubgraph'
import type { HeroViewConfig, SurfaceLayerNodeConfig, SingleEffectConfig, MaskProcessorConfig } from '@practice/section-visual'
import { $PropertyValue, HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'

// ============================================================
// Helpers
// ============================================================

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: { L: 0.5, C: 0.15, H: 220 },
  accent: { L: 0.7, C: 0.18, H: 30 },
  foundation: { L: 0.95, C: 0.01, H: 220 },
})

// ============================================================
// Sample HeroViewConfig with Effect and Mask
// ============================================================

/**
 * Complete config with:
 * - 2 surfaces (surface-1, surface-2)
 * - 1 processor with 2 effects and 1 mask (processor-1)
 * - render output
 */
const completeConfig: HeroViewConfig = {
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
          width1: $PropertyValue.static(15),
          width2: $PropertyValue.static(15),
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
        {
          type: 'effect',
          id: 'vignette',
          params: { intensity: $PropertyValue.static(0.5) },
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
  title: 'Components/NodeGraph/Subgraph',
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
// SingleEffect: Extract subgraph up to first effect
// ============================================================

export const SingleEffect: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, RenderNode },
    setup() {
      const config = ref(completeConfig)
      const fullLayout = useAutoLayout(config)
      // Extract subgraph up to first effect (blur)
      const layout = useSubgraph(fullLayout, 'processor-1-effect-0')
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

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
        handleSelectNode,
        getSurfaceConfig,
        getProcessorFilters,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; color: #999; font-family: monospace;">
          Target: processor-1-effect-0 (Blur)
        </div>
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
                  <div
                    v-for="filter in getProcessorFilters(processor.id)"
                    :key="filter.id"
                    :ref="(el) => setNodeRef(filter.id, el)"
                  >
                    <FilterNode
                      :type="filter.type === 'effect' ? 'effect' : 'mask'"
                      :label="filter.label"
                    />
                  </div>
                </ProcessorPipeline>
              </div>
            </div>

            <!-- Column 3: Render (will be empty for this subgraph) -->
            <div v-if="layout.renderNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
                <RenderNode
                  :palette="palette"
                  :selected="selectedNode === 'render'"
                  @click="handleSelectNode('render')"
                />
              </div>
            </div>
          </template>
        </NodeGraph>
      </div>
    `,
  }),
}

// ============================================================
// MaskWithGraymap: Extract subgraph up to mask (includes graymap)
// ============================================================

export const MaskWithGraymap: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const config = ref(completeConfig)
      const fullLayout = useAutoLayout(config)
      // Extract subgraph up to mask (includes graymap via connection)
      const layout = useSubgraph(fullLayout, 'processor-1-mask-2')
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

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

      const getGraymapForMask = (maskId: string) => {
        const maskIndex = maskId.split('-').pop()
        return layout.value.graymapNodes.find(g => g.id.endsWith(`-graymap-${maskIndex}`))
      }

      return {
        layout,
        selectedNode,
        palette,
        handleSelectNode,
        getSurfaceConfig,
        getProcessorFilters,
        getGraymapForMask,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; color: #999; font-family: monospace;">
          Target: processor-1-mask-2 (Mask with Graymap)
        </div>
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
                        <div :ref="(el) => setNodeRef(filter.id, el)">
                          <FilterNode
                            :type="'mask'"
                            :label="filter.label"
                          />
                        </div>
                        <div
                          v-if="getGraymapForMask(filter.id)"
                          :ref="(el) => setNodeRef(getGraymapForMask(filter.id)?.id, el)"
                        >
                          <GraymapNode
                            :label="getGraymapForMask(filter.id)?.label"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div :ref="(el) => setNodeRef(filter.id, el)">
                        <FilterNode
                          :type="'effect'"
                          :label="filter.label"
                        />
                      </div>
                    </template>
                  </template>
                </ProcessorPipeline>
              </div>
            </div>

            <!-- Column 3: Render -->
            <div v-if="layout.renderNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
                <RenderNode
                  :palette="palette"
                  :selected="selectedNode === 'render'"
                  @click="handleSelectNode('render')"
                />
              </div>
            </div>
          </template>
        </NodeGraph>
      </div>
    `,
  }),
}

// ============================================================
// InteractiveTarget: Dropdown to switch target node
// ============================================================

export const InteractiveTarget: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, RenderNode },
    setup() {
      const config = ref(completeConfig)
      const fullLayout = useAutoLayout(config)
      const targetNodeId = ref('render')
      const layout = useSubgraph(fullLayout, targetNodeId)
      const selectedNode = ref<string | null>(null)
      const palette = DEFAULT_PALETTE

      // Get all available node IDs for dropdown
      const availableNodes = computed(() => {
        return fullLayout.value.nodes.map(n => ({
          id: n.id,
          label: `${n.type}: ${n.label || n.id}`,
        }))
      })

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const handleTargetChange = (event: Event) => {
        const select = event.target as HTMLSelectElement
        targetNodeId.value = select.value
      }

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

      const getGraymapForMask = (maskId: string) => {
        const maskIndex = maskId.split('-').pop()
        return layout.value.graymapNodes.find(g => g.id.endsWith(`-graymap-${maskIndex}`))
      }

      return {
        layout,
        targetNodeId,
        availableNodes,
        selectedNode,
        palette,
        handleSelectNode,
        handleTargetChange,
        getSurfaceConfig,
        getProcessorFilters,
        getGraymapForMask,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <label style="color: #999; font-family: monospace;">Target Node:</label>
          <select
            :value="targetNodeId"
            @change="handleTargetChange"
            style="background: #2a2a3e; color: #fff; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; font-family: monospace;"
          >
            <option v-for="node in availableNodes" :key="node.id" :value="node.id">
              {{ node.label }}
            </option>
          </select>
        </div>
        <div style="margin-bottom: 16px; color: #666; font-family: monospace; font-size: 12px;">
          Nodes: {{ layout.nodes.length }} / {{ availableNodes.length }} |
          Connections: {{ layout.connections.length }}
        </div>
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
                        <div :ref="(el) => setNodeRef(filter.id, el)">
                          <FilterNode
                            :type="'mask'"
                            :label="filter.label"
                          />
                        </div>
                        <div
                          v-if="getGraymapForMask(filter.id)"
                          :ref="(el) => setNodeRef(getGraymapForMask(filter.id)?.id, el)"
                        >
                          <GraymapNode
                            :label="getGraymapForMask(filter.id)?.label"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div :ref="(el) => setNodeRef(filter.id, el)">
                        <FilterNode
                          :type="'effect'"
                          :label="filter.label"
                        />
                      </div>
                    </template>
                  </template>
                </ProcessorPipeline>
              </div>
            </div>

            <!-- Column 3: Render -->
            <div v-if="layout.renderNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
                <RenderNode
                  :palette="palette"
                  :selected="selectedNode === 'render'"
                  @click="handleSelectNode('render')"
                />
              </div>
            </div>
          </template>
        </NodeGraph>
      </div>
    `,
  }),
}
