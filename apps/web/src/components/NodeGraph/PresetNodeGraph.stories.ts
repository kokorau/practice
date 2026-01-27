/**
 * PresetNodeGraph Stories
 *
 * LayoutPresetからNodeGraphを生成し、各ノードに段階的プレビューを表示
 * TIMELINE_PRESETSを使用してアニメーション対応プリセットを可視化
 *
 * New layout: Right-aligned pipelines with column/row based positioning
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, computed } from 'vue'
import NodeGraph from './NodeGraph.vue'
import SurfaceNode from './SurfaceNode.vue'
import FilterNode from './FilterNode.vue'
import GraymapNode from './GraymapNode.vue'
import CompositorNode from './CompositorNode.vue'
import RenderNode from './RenderNode.vue'
import { useAutoLayout, generateAutoLayout, type GraphNode, type ProcessorGroup } from './useAutoLayout'
import type { GroupBox } from './NodeGraph.vue'
import { extractPartialConfig } from './extractPartialConfig'
import type { HeroViewPreset, SurfaceLayerNodeConfig, HeroViewConfig } from '@practice/section-visual'
import { getPresetConfig, isAnimatedPreset } from '@practice/section-visual'
import { TIMELINE_PRESETS } from '../../modules/Timeline/Infra/timelinePresets'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { $Oklch } from '@practice/color'

// ============================================================
// Helpers
// ============================================================

const hsvToOklch = (h: number, s: number, v: number) => {
  const sNorm = s / 100
  const vNorm = v / 100
  const c = vNorm * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vNorm - c

  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return $Oklch.fromSrgb({ r: r + m, g: g + m, b: b + m })
}

const createPaletteFromPreset = (preset: HeroViewPreset): PrimitivePalette | null => {
  if (!preset.colorPreset) return null
  const { brand, accent, foundation } = preset.colorPreset
  return createPrimitivePalette({
    brand: hsvToOklch(brand.hue, brand.saturation, brand.value),
    foundation: hsvToOklch(foundation.hue, foundation.saturation, foundation.value),
    accent: hsvToOklch(accent.hue, accent.saturation, accent.value),
  })
}

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: { L: 0.5, C: 0.15, H: 220 },
  accent: { L: 0.7, C: 0.18, H: 30 },
  foundation: { L: 0.95, C: 0.01, H: 220 },
})

/**
 * Group nodes by column for grid-based rendering
 */
function groupNodesByColumn(nodes: GraphNode[]): Map<number, GraphNode[]> {
  const columnMap = new Map<number, GraphNode[]>()
  for (const node of nodes) {
    const col = node.column
    if (!columnMap.has(col)) {
      columnMap.set(col, [])
    }
    columnMap.get(col)!.push(node)
  }
  // Sort nodes within each column by row
  for (const nodes of columnMap.values()) {
    nodes.sort((a, b) => a.row - b.row)
  }
  return columnMap
}

/**
 * Convert ProcessorGroup to GroupBox for NodeGraph
 */
function processorGroupsToGroupBoxes(processorGroups: ProcessorGroup[]): GroupBox[] {
  return processorGroups.map(pg => ({
    id: pg.processorId,
    nodeIds: pg.nodeIds,
    label: 'Processor',
  }))
}

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof NodeGraph> = {
  title: 'Components/NodeGraph/PresetNodeGraph',
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
// Helper: Create story for a specific preset
// ============================================================

const createPresetStory = (preset: HeroViewPreset): Story => ({
  render: () => ({
    components: { NodeGraph, SurfaceNode, FilterNode, GraymapNode, CompositorNode, RenderNode },
    setup() {
      const config = ref(getPresetConfig(preset))
      const layout = useAutoLayout(config)
      const selectedNode = ref<string | null>(null)
      const palette = createPaletteFromPreset(preset) ?? DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const getNodePreviewConfig = (nodeId: string | undefined) => {
        if (!nodeId) return undefined
        const c = config.value
        if (!c) return undefined
        const result = extractPartialConfig(c, nodeId)
        return result.found ? result.config : undefined
      }

      const getSurfaceConfig = (nodeId: string) => {
        const l = layout.value
        if (!l) return null
        const node = l.sourceNodes.find(n => n.id === nodeId)
        if (node?.config && 'surface' in (node.config as SurfaceLayerNodeConfig)) {
          return (node.config as SurfaceLayerNodeConfig).surface
        }
        return null
      }

      // Group all pipeline nodes by column
      const nodesByColumn = computed(() => {
        const l = layout.value
        if (!l) return new Map<number, GraphNode[]>()
        const pipelineNodes = l.nodes.filter(n => n.type !== 'composite' && n.type !== 'render')
        return groupNodesByColumn(pipelineNodes)
      })

      // Convert processor groups to group boxes
      const groupBoxes = computed(() => {
        const l = layout.value
        if (!l) return []
        return processorGroupsToGroupBoxes(l.processorGroups)
      })

      const presetName = preset.name
      const isAnimated = isAnimatedPreset(preset)

      return {
        layout,
        config,
        selectedNode,
        palette,
        presetName,
        isAnimated,
        handleSelectNode,
        getNodePreviewConfig,
        getSurfaceConfig,
        nodesByColumn,
        groupBoxes,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #ccc; font-size: 14px; font-weight: 600;">{{ presetName }}</span>
          <span v-if="isAnimated" style="background: #4a5a8a; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Animated</span>
        </div>
        <div v-if="!layout" style="color: #666;">No config available</div>
        <NodeGraph v-else :connections="layout.connections" :columns="layout.columnCount" :groups="groupBoxes" gap="2rem">
          <template #default="{ setNodeRef }">
            <!-- Render each column -->
            <template v-for="col in layout.columnCount" :key="col">
              <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;">
                <!-- Pipeline nodes for this column -->
                <template v-for="node in (nodesByColumn.get(col - 1) || [])" :key="node.id">
                  <!-- Surface/Image nodes -->
                  <div v-if="node.type === 'surface' || node.type === 'image'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <SurfaceNode
                      :surface="getSurfaceConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                  <!-- Effect nodes -->
                  <div v-else-if="node.type === 'effect'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <FilterNode
                      type="effect"
                      :label="node.label"
                      :config="getNodePreviewConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                  <!-- Mask nodes -->
                  <div v-else-if="node.type === 'mask'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <FilterNode
                      type="mask"
                      :label="node.label"
                      :config="getNodePreviewConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                  <!-- Graymap nodes -->
                  <div v-else-if="node.type === 'graymap'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <GraymapNode
                      :label="node.label"
                      :config="getNodePreviewConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                </template>

                <!-- Composite node (only in its column) -->
                <div v-if="layout.compositeNode && layout.compositeNode.column === col - 1"
                     :ref="(el) => setNodeRef('composite', el)"
                     style="width: fit-content;">
                  <CompositorNode
                    label="Composite"
                    :config="config"
                    :palette="palette"
                    :selected="selectedNode === 'composite'"
                    @click="handleSelectNode('composite')"
                  />
                </div>

                <!-- Render node (only in its column) -->
                <div v-if="layout.renderNode && layout.renderNode.column === col - 1"
                     :ref="(el) => setNodeRef('render', el)"
                     style="width: fit-content;">
                  <RenderNode
                    :config="getNodePreviewConfig('render')"
                    :palette="palette"
                    :selected="selectedNode === 'render'"
                    @click="handleSelectNode('render')"
                  />
                </div>
              </div>
            </template>
          </template>
        </NodeGraph>
      </div>
    `,
  }),
})

// ============================================================
// Interactive: Dropdown to select preset
// ============================================================

export const Interactive: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, FilterNode, GraymapNode, CompositorNode, RenderNode },
    setup() {
      const selectedPresetId = ref(TIMELINE_PRESETS[0]?.id ?? '')
      const preset = computed(() => TIMELINE_PRESETS.find(p => p.id === selectedPresetId.value))
      const config = computed(() => preset.value ? getPresetConfig(preset.value) : null)
      const layout = computed(() => {
        const c = config.value
        if (!c) return null
        return generateAutoLayout(c)
      })
      const selectedNode = ref<string | null>(null)
      const palette = computed(() => preset.value ? (createPaletteFromPreset(preset.value) ?? DEFAULT_PALETTE) : DEFAULT_PALETTE)

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const handlePresetChange = (event: Event) => {
        const select = event.target as HTMLSelectElement
        selectedPresetId.value = select.value
        selectedNode.value = null
      }

      const getNodePreviewConfig = (nodeId: string | undefined) => {
        if (!nodeId) return undefined
        const c = config.value
        if (!c) return undefined
        const result = extractPartialConfig(c, nodeId)
        return result.found ? result.config : undefined
      }

      const getSurfaceConfig = (nodeId: string) => {
        const l = layout.value
        if (!l) return null
        const node = l.sourceNodes.find(n => n.id === nodeId)
        if (node?.config && 'surface' in (node.config as SurfaceLayerNodeConfig)) {
          return (node.config as SurfaceLayerNodeConfig).surface
        }
        return null
      }

      // Group all nodes by column
      const nodesByColumn = computed(() => {
        const l = layout.value
        if (!l) return new Map()
        const pipelineNodes = l.nodes.filter(n => n.type !== 'composite' && n.type !== 'render')
        return groupNodesByColumn(pipelineNodes)
      })

      // Convert processor groups to group boxes
      const groupBoxes = computed(() => {
        const l = layout.value
        if (!l) return []
        return processorGroupsToGroupBoxes(l.processorGroups)
      })

      const presetName = computed(() => preset.value?.name ?? 'Unknown')
      const presetDescription = computed(() => preset.value?.description ?? '')
      const isAnimated = computed(() => preset.value ? isAnimatedPreset(preset.value) : false)
      const nodeCount = computed(() => layout.value?.nodes.length ?? 0)
      const connectionCount = computed(() => layout.value?.connections.length ?? 0)

      return {
        layout,
        config,
        selectedNode,
        palette,
        presetName,
        presetDescription,
        isAnimated,
        nodeCount,
        connectionCount,
        selectedPresetId,
        presets: TIMELINE_PRESETS,
        handleSelectNode,
        handlePresetChange,
        getNodePreviewConfig,
        getSurfaceConfig,
        nodesByColumn,
        groupBoxes,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #888;">Preset:</span>
            <select
              :value="selectedPresetId"
              @change="handlePresetChange"
              style="background: #2a2a3a; color: #fff; border: 1px solid #4a4a5a; border-radius: 4px; padding: 4px 8px;"
            >
              <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <span v-if="isAnimated" style="background: #4a5a8a; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Animated</span>
          </div>
          <div style="color: #666; font-size: 12px;">{{ presetDescription }}</div>
          <div style="color: #555; font-size: 11px; margin-top: 4px;">Nodes: {{ nodeCount }} | Connections: {{ connectionCount }}</div>
        </div>

        <div v-if="!layout" style="color: #666;">No config available</div>
        <NodeGraph v-else :connections="layout.connections" :columns="layout.columnCount" :groups="groupBoxes" gap="2rem">
          <template #default="{ setNodeRef }">
            <!-- Render each column -->
            <template v-for="col in layout.columnCount" :key="col">
              <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;">
                <!-- Pipeline nodes for this column -->
                <template v-for="node in (nodesByColumn.get(col - 1) || [])" :key="node.id">
                  <!-- Surface/Image nodes -->
                  <div v-if="node.type === 'surface' || node.type === 'image'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <SurfaceNode
                      :surface="getSurfaceConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                  <!-- Effect nodes -->
                  <div v-else-if="node.type === 'effect'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <FilterNode
                      type="effect"
                      :label="node.label"
                      :config="getNodePreviewConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                  <!-- Mask nodes -->
                  <div v-else-if="node.type === 'mask'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <FilterNode
                      type="mask"
                      :label="node.label"
                      :config="getNodePreviewConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                  <!-- Graymap nodes -->
                  <div v-else-if="node.type === 'graymap'"
                       :ref="(el) => setNodeRef(node.id, el)"
                       style="width: fit-content;">
                    <GraymapNode
                      :label="node.label"
                      :config="getNodePreviewConfig(node.id)"
                      :palette="palette"
                      :selected="selectedNode === node.id"
                      @click="handleSelectNode(node.id)"
                    />
                  </div>
                </template>

                <!-- Composite node (only in its column) -->
                <div v-if="layout.compositeNode && layout.compositeNode.column === col - 1"
                     :ref="(el) => setNodeRef('composite', el)"
                     style="width: fit-content;">
                  <CompositorNode
                    label="Composite"
                    :config="config"
                    :palette="palette"
                    :selected="selectedNode === 'composite'"
                    @click="handleSelectNode('composite')"
                  />
                </div>

                <!-- Render node (only in its column) -->
                <div v-if="layout.renderNode && layout.renderNode.column === col - 1"
                     :ref="(el) => setNodeRef('render', el)"
                     style="width: fit-content;">
                  <RenderNode
                    :config="getNodePreviewConfig('render')"
                    :palette="palette"
                    :selected="selectedNode === 'render'"
                    @click="handleSelectNode('render')"
                  />
                </div>
              </div>
            </template>
          </template>
        </NodeGraph>
      </div>
    `,
  }),
}

// ============================================================
// Generate stories for each preset
// ============================================================

export const Preset1: Story = TIMELINE_PRESETS[0] ? createPresetStory(TIMELINE_PRESETS[0]) : { render: () => ({ template: '<div>No preset</div>' }) }
export const Preset2: Story = TIMELINE_PRESETS[1] ? createPresetStory(TIMELINE_PRESETS[1]) : { render: () => ({ template: '<div>No preset</div>' }) }
export const Preset3: Story = TIMELINE_PRESETS[2] ? createPresetStory(TIMELINE_PRESETS[2]) : { render: () => ({ template: '<div>No preset</div>' }) }
