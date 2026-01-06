<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type ComponentPublicInstance } from 'vue'
import { TextureRenderer, type TextureRenderSpec } from '@practice/texture'
import NodePreview from '../components/NodePreview.vue'
import CurveEditor from '../components/CurveEditor.vue'
import { type Curve } from '../modules/Filter/Domain'
import {
  SampleList,
  initializeSampleParams,
  getNodesByRow,
  type SampleParams,
  type NodeDef,
} from '../modules/TexturePlayground'

// State
const selectedSampleId = ref(SampleList[0]!.id)
const sampleParamsMap = ref<Map<string, SampleParams>>(new Map())

// DOM refs
const nodeGraphRef = ref<HTMLElement | null>(null)
const mainCanvasRef = ref<HTMLCanvasElement | null>(null)
const nodeRefs = ref<Map<string, HTMLElement>>(new Map())

// WebGPU
const webGPUSupported = ref(true)
const webGPUError = ref<string | null>(null)
let mainRenderer: TextureRenderer | null = null

// Preview sizes
const NODE_WIDTH = 200
const NODE_HEIGHT = 112
const MAIN_WIDTH = 400
const MAIN_HEIGHT = 225

// Computed
const selectedSample = computed(() =>
  SampleList.find(s => s.id === selectedSampleId.value) ?? SampleList[0]!
)

const currentParams = computed(() => {
  const cached = sampleParamsMap.value.get(selectedSampleId.value)
  if (cached) return cached
  const initialized = initializeSampleParams(selectedSample.value)
  sampleParamsMap.value.set(selectedSampleId.value, initialized)
  return initialized
})

const nodeRows = computed(() => getNodesByRow(selectedSample.value))

const nodeViewport = { width: NODE_WIDTH, height: NODE_HEIGHT }
const mainViewport = { width: MAIN_WIDTH, height: MAIN_HEIGHT }

// Connection paths
const connectionPaths = ref<string[]>([])

// Set node ref for dynamic nodes
function setNodeRef(nodeId: string) {
  return (el: Element | ComponentPublicInstance | null) => {
    if (el instanceof HTMLElement) {
      nodeRefs.value.set(nodeId, el)
    } else if (el && '$el' in el && el.$el instanceof HTMLElement) {
      nodeRefs.value.set(nodeId, el.$el)
    } else {
      nodeRefs.value.delete(nodeId)
    }
  }
}

// Get node center position
function getNodeCenter(nodeEl: HTMLElement | null, container: HTMLElement | null, position: 'top' | 'bottom') {
  if (!nodeEl || !container) return { x: 0, y: 0 }
  const nodeRect = nodeEl.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const x = nodeRect.left - containerRect.left + nodeRect.width / 2
  const y = position === 'top'
    ? nodeRect.top - containerRect.top
    : nodeRect.top - containerRect.top + nodeRect.height
  return { x, y }
}

// Create bezier path
function createBezierPath(from: { x: number, y: number }, to: { x: number, y: number }) {
  const midY = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
}

// Update connection paths
function updateConnections() {
  if (!nodeGraphRef.value) return

  const container = nodeGraphRef.value
  const paths: string[] = []

  // Get output node position (the final canvas area)
  const outputEl = mainCanvasRef.value?.parentElement

  for (const conn of selectedSample.value.connections) {
    let fromEl: HTMLElement | null = null
    let toEl: HTMLElement | null = null

    if (conn.from === 'output') {
      fromEl = outputEl ?? null
    } else {
      fromEl = nodeRefs.value.get(conn.from) ?? null
    }

    if (conn.to === 'output') {
      toEl = outputEl ?? null
    } else {
      toEl = nodeRefs.value.get(conn.to) ?? null
    }

    if (fromEl && toEl) {
      const fromPos = getNodeCenter(fromEl, container, 'bottom')
      const toPos = getNodeCenter(toEl, container, 'top')
      paths.push(createBezierPath(fromPos, toPos))
    }
  }

  connectionPaths.value = paths
}

// Get node spec for preview
function getNodeSpec(node: NodeDef): TextureRenderSpec | null {
  if (!node.createSpec) return null
  const params = currentParams.value[node.id] ?? {}
  return node.createSpec(params, nodeViewport)
}

// Get curve for CurveEditor
function getCurve(node: NodeDef): Curve | null {
  const params = currentParams.value[node.id]
  if (!params?.points) return null
  return { points: params.points as number[] }
}

// Update parameter value
function updateParam(nodeId: string, key: string, value: unknown) {
  const params = currentParams.value[nodeId]
  if (params) {
    params[key] = value
    renderMain()
  }
}

// Update curve point
function updateCurvePoint(nodeId: string, index: number, value: number) {
  const params = currentParams.value[nodeId]
  if (params?.points) {
    const points = [...(params.points as number[])]
    points[index] = value
    params.points = points
    renderMain()
  }
}

// Format value for display
function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2)
  }
  return String(value)
}

// Initialize main renderer
async function initMainRenderer() {
  if (!mainCanvasRef.value) return
  try {
    mainRenderer = await TextureRenderer.create(mainCanvasRef.value)
    webGPUSupported.value = true
    renderMain()
  } catch (e) {
    webGPUError.value = e instanceof Error ? e.message : 'Unknown error'
    webGPUSupported.value = false
  }
}

// Render main canvas
function renderMain() {
  if (!mainRenderer) return

  const params = currentParams.value
  const outputSpec = selectedSample.value.createOutputSpec(params, mainViewport)
  mainRenderer.render(outputSpec, { clear: true })
}

// Watch for sample changes
watch(selectedSampleId, async () => {
  await nextTick()
  setTimeout(updateConnections, 50)
  renderMain()
})

// Watch for deep param changes
watch(currentParams, () => {
  renderMain()
}, { deep: true })

onMounted(async () => {
  if (!navigator.gpu) {
    webGPUError.value = 'WebGPU is not supported in this browser'
    webGPUSupported.value = false
    return
  }

  await initMainRenderer()

  // Update connections after layout
  await nextTick()
  setTimeout(updateConnections, 100)
  window.addEventListener('resize', updateConnections)
})

onUnmounted(() => {
  mainRenderer?.destroy()
  mainRenderer = null
  window.removeEventListener('resize', updateConnections)
})
</script>

<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- Left Panel: Sample List -->
    <aside class="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div class="p-4 border-b border-gray-700">
        <h1 class="text-md font-semibold">Texture Playground</h1>
        <RouterLink to="/" class="text-xs text-teal-400 hover:underline">Back to Home</RouterLink>
      </div>

      <nav class="flex-1 overflow-y-auto p-2">
        <ul class="space-y-1">
          <li v-for="sample in SampleList" :key="sample.id">
            <button
              @click="selectedSampleId = sample.id"
              class="w-full text-left px-3 py-2 rounded-lg transition-colors"
              :class="selectedSampleId === sample.id
                ? 'bg-teal-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'"
            >
              <div class="font-medium text-sm">{{ sample.name }}</div>
              <div class="text-xs opacity-70 mt-0.5">{{ sample.description }}</div>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Status -->
      <div class="p-4 border-t border-gray-700 text-xs text-gray-500">
        <div v-if="webGPUSupported" class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          WebGPU Active
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          WebGPU Not Available
        </div>
      </div>
    </aside>

    <!-- Main Area -->
    <main class="flex-1 flex">
      <!-- Node Graph Area -->
      <section ref="nodeGraphRef" class="flex-1 p-6 overflow-auto relative">
        <!-- SVG connections overlay -->
        <svg class="connections-overlay">
          <path
            v-for="(path, index) in connectionPaths"
            :key="index"
            :d="path"
            class="connection-line"
          />
        </svg>

        <!-- Node rows -->
        <div class="flex flex-col items-center gap-8">
          <div
            v-for="(row, rowIndex) in nodeRows"
            :key="rowIndex"
            class="flex gap-8 justify-center relative z-10"
          >
            <div
              v-for="node in row"
              :key="node.id"
              :ref="setNodeRef(node.id)"
              class="node-wrapper"
            >
              <!-- Regular node with preview -->
              <template v-if="node.createSpec">
                <NodePreview
                  :width="NODE_WIDTH"
                  :height="NODE_HEIGHT"
                  :spec="getNodeSpec(node)"
                >
                  <template #label>
                    <div class="node-title">
                      <span class="node-badge">{{ node.badge }}</span>
                      <span class="node-title-text">{{ node.label }}</span>
                      <span class="node-badge-offset"></span>
                    </div>
                  </template>
                </NodePreview>
              </template>

              <!-- Curve node -->
              <template v-else-if="currentParams[node.id]?.points">
                <div class="curve-node">
                  <div class="curve-node-header">
                    <div class="node-title">
                      <span class="node-badge">{{ node.badge }}</span>
                      <span class="node-title-text">{{ node.label }}</span>
                      <span class="node-badge-offset"></span>
                    </div>
                  </div>
                  <CurveEditor
                    v-if="getCurve(node)"
                    :curve="getCurve(node)!"
                    :width="NODE_WIDTH"
                    :height="NODE_HEIGHT"
                    @update:point="(index: number, value: number) => updateCurvePoint(node.id, index, value)"
                  />
                </div>
              </template>

              <!-- Parameter-only node (colors, etc.) -->
              <template v-else>
                <div class="param-node">
                  <div class="node-title">
                    <span class="node-badge">{{ node.badge }}</span>
                    <span class="node-title-text">{{ node.label }}</span>
                    <span class="node-badge-offset"></span>
                  </div>
                  <div class="param-node-hint">See controls panel</div>
                </div>
              </template>
            </div>
          </div>

          <!-- Final Output -->
          <div class="final-node">
            <div class="node-title mb-2">
              <span class="node-badge">Out</span>
              <span class="node-title-text">Final Output</span>
              <span class="node-badge-offset"></span>
            </div>
            <canvas
              v-show="webGPUSupported"
              ref="mainCanvasRef"
              :width="MAIN_WIDTH"
              :height="MAIN_HEIGHT"
              class="main-canvas"
            />
            <div v-if="!webGPUSupported" class="error-message">
              <p>WebGPU Not Supported</p>
              <p class="error-detail">{{ webGPUError }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Panel: Controls -->
      <aside class="w-72 bg-gray-800 border-l border-gray-700 overflow-y-auto">
        <div class="p-4">
          <h2 class="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wide">Parameters</h2>

          <div v-for="node in selectedSample.nodes" :key="node.id" class="node-group">
            <div v-if="node.params.length > 0">
              <div class="node-group-header">
                <span class="node-badge">{{ node.badge }}</span>
                <span class="node-group-title">{{ node.label }}</span>
                <span class="node-badge-offset"></span>
              </div>

              <div class="space-y-3">
                <div v-for="param in node.params" :key="param.key" class="control-group">
                  <!-- Slider -->
                  <template v-if="param.type === 'slider'">
                    <label class="control-label">
                      {{ param.label }}: {{ formatValue(currentParams[node.id]?.[param.key]) }}
                    </label>
                    <input
                      type="range"
                      class="slider"
                      :min="param.min"
                      :max="param.max"
                      :step="param.step"
                      :value="currentParams[node.id]?.[param.key]"
                      @input="(e) => updateParam(node.id, param.key, parseFloat((e.target as HTMLInputElement).value))"
                    />
                  </template>

                  <!-- Color picker -->
                  <template v-else-if="param.type === 'color'">
                    <label class="control-label">{{ param.label }}</label>
                    <input
                      type="color"
                      class="color-input"
                      :value="currentParams[node.id]?.[param.key]"
                      @input="(e) => updateParam(node.id, param.key, (e.target as HTMLInputElement).value)"
                    />
                  </template>

                  <!-- Select -->
                  <template v-else-if="param.type === 'select'">
                    <label class="control-label">{{ param.label }}</label>
                    <select
                      class="select-input"
                      :value="currentParams[node.id]?.[param.key]"
                      @change="(e) => updateParam(node.id, param.key, (e.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="opt in param.options"
                        :key="String(opt.value)"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </template>

                  <!-- Number input -->
                  <template v-else-if="param.type === 'number'">
                    <label class="control-label">{{ param.label }}</label>
                    <input
                      type="number"
                      class="number-input"
                      :value="currentParams[node.id]?.[param.key]"
                      @input="(e) => updateParam(node.id, param.key, parseFloat((e.target as HTMLInputElement).value))"
                    />
                  </template>

                  <!-- Curve is handled in the node itself -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.connections-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.connection-line {
  fill: none;
  stroke: #4ecdc4;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.5;
}

.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 0.5rem;
}

.node-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: #4ecdc4;
  color: #1a1a2e;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.node-title-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.node-badge-offset {
  width: 1.25rem;
  flex-shrink: 0;
}

.curve-node {
  padding: 0.5rem;
  background: #1e1e3a;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
}

.curve-node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  gap: 0.5rem;
}

.param-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #1e1e3a;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
  min-width: 150px;
}

.param-node-hint {
  font-size: 0.625rem;
  color: #666;
  text-transform: uppercase;
}

.final-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #1e1e3a;
  border: 2px solid #4ecdc4;
  border-radius: 0.75rem;
  position: relative;
  z-index: 1;
}

.main-canvas {
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.error-message {
  padding: 2rem;
  background: #2a2a4a;
  border-radius: 0.5rem;
  text-align: center;
  color: #ff6b6b;
}

.error-detail {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #888;
}

/* Controls Panel */
.node-group {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #1e1e3a;
  border-radius: 0.5rem;
  border: 1px solid #2a2a4a;
}

.node-group-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #2a2a4a;
  margin-bottom: 0.75rem;
}

.node-group-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex: 1;
  text-align: center;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.control-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
}

.slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: #2a2a4a;
  border-radius: 3px;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #4ecdc4;
  border-radius: 50%;
  cursor: pointer;
}

.color-input {
  width: 100%;
  height: 32px;
  padding: 0;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  cursor: pointer;
}

.select-input {
  width: 100%;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  color: #eee;
  font-size: 0.75rem;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #4ecdc4;
}

.number-input {
  width: 100%;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  color: #eee;
  font-family: monospace;
  font-size: 0.75rem;
}

.number-input:focus {
  outline: none;
  border-color: #4ecdc4;
}
</style>
