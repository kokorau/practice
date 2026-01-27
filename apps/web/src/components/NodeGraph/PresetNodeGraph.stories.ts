/**
 * PresetNodeGraph Stories
 *
 * LayoutPresetからNodeGraphを生成し、各ノードに段階的プレビューを表示
 * TIMELINE_PRESETSを使用してアニメーション対応プリセットを可視化
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, computed } from 'vue'
import NodeGraph from './NodeGraph.vue'
import SurfaceNode from './SurfaceNode.vue'
import ProcessorPipeline from './ProcessorPipeline.vue'
import FilterNode from './FilterNode.vue'
import GraymapNode from './GraymapNode.vue'
import CompositorNode from './CompositorNode.vue'
import RenderNode from './RenderNode.vue'
import { useAutoLayout } from './useAutoLayout'
import { extractPartialConfig } from './extractPartialConfig'
import type { HeroViewPreset, SurfaceLayerNodeConfig } from '@practice/section-visual'
import { getPresetConfig, isAnimatedPreset } from '@practice/section-visual'
import { TIMELINE_PRESETS } from '../../modules/Timeline/Infra/timelinePresets'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { $Oklch } from '@practice/color'

// ============================================================
// Helpers
// ============================================================

/**
 * Convert HSV to Oklch
 */
const hsvToOklch = (h: number, s: number, v: number) => {
  // Simple HSV to RGB to Oklch conversion
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

/**
 * Create PrimitivePalette from preset's colorPreset
 */
const createPaletteFromPreset = (preset: HeroViewPreset): PrimitivePalette | null => {
  if (!preset.colorPreset) return null
  const { brand, accent, foundation } = preset.colorPreset
  return createPrimitivePalette({
    brand: hsvToOklch(brand.hue, brand.saturation, brand.value),
    foundation: hsvToOklch(foundation.hue, foundation.saturation, foundation.value),
    accent: hsvToOklch(accent.hue, accent.saturation, accent.value),
  })
}

/**
 * Default palette for presets without colorPreset
 */
const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: { L: 0.5, C: 0.15, H: 220 },
  accent: { L: 0.7, C: 0.18, H: 30 },
  foundation: { L: 0.95, C: 0.01, H: 220 },
})

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
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, CompositorNode, RenderNode },
    setup() {
      const config = computed(() => getPresetConfig(preset))
      const layout = computed(() => {
        const c = config.value
        if (!c) return null
        return useAutoLayout(ref(c)).value
      })
      const selectedNode = ref<string | null>(null)
      const palette = createPaletteFromPreset(preset) ?? DEFAULT_PALETTE

      const handleSelectNode = (nodeId: string) => {
        selectedNode.value = selectedNode.value === nodeId ? null : nodeId
      }

      const getNodePreviewConfig = (nodeId: string) => {
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

      const getProcessorFilters = (processorId: string) => {
        return layout.value?.filterNodes.filter(f => f.parentPipelineId === processorId) ?? []
      }

      const getGraymapForMask = (maskId: string) => {
        const maskIndex = maskId.split('-').pop()
        return layout.value?.graymapNodes.find(g => g.id.endsWith(`-graymap-${maskIndex}`))
      }

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
        getProcessorFilters,
        getGraymapForMask,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #ccc; font-size: 14px; font-weight: 600;">{{ presetName }}</span>
          <span v-if="isAnimated" style="background: #4a5a8a; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Animated</span>
        </div>
        <div v-if="!layout" style="color: #666;">No config available</div>
        <NodeGraph v-else :connections="layout.connections" :columns="layout.columnCount" gap="2rem">
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

            <!-- Column 2: Processors with step-by-step previews -->
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
                    <template v-if="filter.type === 'mask'">
                      <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                        <div :ref="(el) => setNodeRef(filter.id, el)">
                          <FilterNode
                            :type="'mask'"
                            :label="filter.label"
                            :config="getNodePreviewConfig(filter.id)"
                            :palette="palette"
                          />
                        </div>
                        <div
                          v-if="getGraymapForMask(filter.id)"
                          :ref="(el) => setNodeRef(getGraymapForMask(filter.id)?.id, el)"
                        >
                          <GraymapNode
                            :label="getGraymapForMask(filter.id)?.label"
                            :config="getNodePreviewConfig(getGraymapForMask(filter.id)?.id)"
                            :palette="palette"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div :ref="(el) => setNodeRef(filter.id, el)">
                        <FilterNode
                          :type="'effect'"
                          :label="filter.label"
                          :config="getNodePreviewConfig(filter.id)"
                          :palette="palette"
                        />
                      </div>
                    </template>
                  </template>
                </ProcessorPipeline>
              </div>
            </div>

            <!-- Column 3: Composite (if multiple groups) -->
            <div v-if="layout.compositeNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('composite', el)" style="width: fit-content;">
                <CompositorNode
                  label="Composite"
                  :config="config"
                  :palette="palette"
                  :selected="selectedNode === 'composite'"
                  @click="handleSelectNode('composite')"
                />
              </div>
            </div>

            <!-- Column 4: Render -->
            <div v-if="layout.renderNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
                <RenderNode
                  :config="getNodePreviewConfig('render')"
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
})

// ============================================================
// Interactive: Dropdown to select preset
// ============================================================

export const Interactive: Story = {
  render: () => ({
    components: { NodeGraph, SurfaceNode, ProcessorPipeline, FilterNode, GraymapNode, CompositorNode, RenderNode },
    setup() {
      const selectedPresetId = ref(TIMELINE_PRESETS[0]?.id ?? '')
      const preset = computed(() => TIMELINE_PRESETS.find(p => p.id === selectedPresetId.value))
      const config = computed(() => preset.value ? getPresetConfig(preset.value) : undefined)
      const layout = computed(() => {
        const c = config.value
        if (!c) return null
        return useAutoLayout(ref(c)).value
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

      const getNodePreviewConfig = (nodeId: string) => {
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

      const getProcessorFilters = (processorId: string) => {
        return layout.value?.filterNodes.filter(f => f.parentPipelineId === processorId) ?? []
      }

      const getGraymapForMask = (maskId: string) => {
        const maskIndex = maskId.split('-').pop()
        return layout.value?.graymapNodes.find(g => g.id.endsWith(`-graymap-${maskIndex}`))
      }

      const presets = TIMELINE_PRESETS

      return {
        layout,
        config,
        selectedNode,
        palette,
        presets,
        selectedPresetId,
        preset,
        handleSelectNode,
        handlePresetChange,
        getNodePreviewConfig,
        getSurfaceConfig,
        getProcessorFilters,
        getGraymapForMask,
      }
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
          <label style="color: #999; font-size: 13px;">Preset:</label>
          <select
            :value="selectedPresetId"
            @change="handlePresetChange"
            style="background: #2a2a3e; color: #fff; border: 1px solid #444; padding: 6px 10px; border-radius: 4px; font-size: 13px; min-width: 200px;"
          >
            <option v-for="p in presets" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
          <span v-if="preset?.timeline" style="background: #4a5a8a; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Animated</span>
        </div>
        <div v-if="preset?.description" style="margin-bottom: 16px; color: #666; font-size: 12px;">
          {{ preset.description }}
        </div>
        <div v-if="layout" style="margin-bottom: 16px; color: #555; font-size: 11px; font-family: monospace;">
          Nodes: {{ layout.nodes.length }} | Connections: {{ layout.connections.length }}
        </div>
        <div v-if="!layout" style="color: #666; padding: 40px; text-align: center;">No config available</div>
        <NodeGraph v-else :connections="layout.connections" :columns="layout.columnCount" gap="2rem">
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
                    <template v-if="filter.type === 'mask'">
                      <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                        <div :ref="(el) => setNodeRef(filter.id, el)">
                          <FilterNode
                            :type="'mask'"
                            :label="filter.label"
                            :config="getNodePreviewConfig(filter.id)"
                            :palette="palette"
                          />
                        </div>
                        <div
                          v-if="getGraymapForMask(filter.id)"
                          :ref="(el) => setNodeRef(getGraymapForMask(filter.id)?.id, el)"
                        >
                          <GraymapNode
                            :label="getGraymapForMask(filter.id)?.label"
                            :config="getNodePreviewConfig(getGraymapForMask(filter.id)?.id)"
                            :palette="palette"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div :ref="(el) => setNodeRef(filter.id, el)">
                        <FilterNode
                          :type="'effect'"
                          :label="filter.label"
                          :config="getNodePreviewConfig(filter.id)"
                          :palette="palette"
                        />
                      </div>
                    </template>
                  </template>
                </ProcessorPipeline>
              </div>
            </div>

            <!-- Column 3: Composite (if multiple groups) -->
            <div v-if="layout.compositeNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('composite', el)" style="width: fit-content;">
                <CompositorNode
                  label="Composite"
                  :config="config"
                  :palette="palette"
                  :selected="selectedNode === 'composite'"
                  @click="handleSelectNode('composite')"
                />
              </div>
            </div>

            <!-- Column 4: Render -->
            <div v-if="layout.renderNode" style="display: flex; align-items: center;">
              <div :ref="(el) => setNodeRef('render', el)" style="width: fit-content;">
                <RenderNode
                  :config="getNodePreviewConfig('render')"
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
// Generate stories for each preset
// ============================================================

// Create individual stories for first few presets
export const Preset1: Story = TIMELINE_PRESETS[0] ? createPresetStory(TIMELINE_PRESETS[0]) : { render: () => ({ template: '<div>No preset</div>' }) }
export const Preset2: Story = TIMELINE_PRESETS[1] ? createPresetStory(TIMELINE_PRESETS[1]) : { render: () => ({ template: '<div>No preset</div>' }) }
export const Preset3: Story = TIMELINE_PRESETS[2] ? createPresetStory(TIMELINE_PRESETS[2]) : { render: () => ({ template: '<div>No preset</div>' }) }
