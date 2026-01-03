<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  TextureRenderer,
  createLinearGradientSpec,
  createGradientGrainSpec,
  createLinearDepthMapSpec,
  createNoiseMapSpec,
  createGradientNoiseMapSpec,
  type TextureRenderSpec,
  type ColorStop as GpuColorStop,
} from '@practice/texture'
import NodePreview from '../components/NodePreview.vue'

// ノードのDOM参照
const nodeGraphRef = ref<HTMLElement | null>(null)
const depthNodeRef = ref<HTMLElement | null>(null)
const noiseNodeRef = ref<HTMLElement | null>(null)
const gradientNodeRef = ref<HTMLElement | null>(null)
const depthNoiseNodeRef = ref<HTMLElement | null>(null)
const finalNodeRef = ref<HTMLElement | null>(null)

// 接続線のパス
const connectionPaths = ref<string[]>([])

// ノードの中心位置を取得
function getNodeCenter(nodeRef: HTMLElement | null, container: HTMLElement | null, position: 'top' | 'bottom') {
  if (!nodeRef || !container) return { x: 0, y: 0 }
  const nodeRect = nodeRef.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const x = nodeRect.left - containerRect.left + nodeRect.width / 2
  const y = position === 'top'
    ? nodeRect.top - containerRect.top
    : nodeRect.top - containerRect.top + nodeRect.height
  return { x, y }
}

// ベジェ曲線のパスを生成
function createBezierPath(from: { x: number, y: number }, to: { x: number, y: number }) {
  const midY = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
}

// 接続線を更新
function updateConnections() {
  if (!nodeGraphRef.value) return

  const container = nodeGraphRef.value

  // Depth -> Gradient
  const depthBottom = getNodeCenter(depthNodeRef.value, container, 'bottom')
  const gradientTop = getNodeCenter(gradientNodeRef.value, container, 'top')

  // Depth -> DepthNoise
  const depthNoiseTop = getNodeCenter(depthNoiseNodeRef.value, container, 'top')

  // Noise -> DepthNoise
  const noiseBottom = getNodeCenter(noiseNodeRef.value, container, 'bottom')

  // Gradient -> Final
  const gradientBottom = getNodeCenter(gradientNodeRef.value, container, 'bottom')
  const finalTop = getNodeCenter(finalNodeRef.value, container, 'top')

  // DepthNoise -> Final
  const depthNoiseBottom = getNodeCenter(depthNoiseNodeRef.value, container, 'bottom')

  connectionPaths.value = [
    createBezierPath(depthBottom, gradientTop),
    createBezierPath(depthBottom, depthNoiseTop),
    createBezierPath(noiseBottom, depthNoiseTop),
    createBezierPath(gradientBottom, finalTop),
    createBezierPath(depthNoiseBottom, finalTop),
  ]
}

// グラデーションの色停止点
interface ColorStop {
  color: string  // HEX
  position: number // 0-100
}

const stops = ref<ColorStop[]>([
  { color: '#ff6b6b', position: 0 },
  { color: '#4ecdc4', position: 100 },
])

// パラメータ
const angle = ref(90)
const grainSeed = ref(12345)
const noiseThreshold = ref(0.5)
const power = ref(2.5)
const sparsity = ref(0.75)

// プレビューサイズ
const NODE_WIDTH = 200
const NODE_HEIGHT = 112
const MAIN_WIDTH = 400
const MAIN_HEIGHT = 225

// WebGPU
const webGPUSupported = ref(true)
const webGPUError = ref<string | null>(null)

// メインキャンバス
const mainCanvasRef = ref<HTMLCanvasElement | null>(null)
let mainRenderer: TextureRenderer | null = null

// HEX to RGBA (0-1)
function hexToRgba(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0, 1]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
    1,
  ]
}

// Convert stops to GPU format
const gpuStops = computed<GpuColorStop[]>(() =>
  stops.value.map(s => ({
    color: hexToRgba(s.color),
    position: s.position / 100,
  }))
)

const colorA = computed(() => {
  const sorted = [...stops.value].sort((a, b) => a.position - b.position)
  return hexToRgba(sorted[0]?.color || '#ffffff')
})

const colorB = computed(() => {
  const sorted = [...stops.value].sort((a, b) => a.position - b.position)
  return hexToRgba(sorted[sorted.length - 1]?.color || '#000000')
})

// ノード用のspec
const nodeViewport = { width: NODE_WIDTH, height: NODE_HEIGHT }
const mainViewport = { width: MAIN_WIDTH, height: MAIN_HEIGHT }

const depthSpec = computed<TextureRenderSpec>(() =>
  createLinearDepthMapSpec({ angle: angle.value }, nodeViewport)
)

const noiseSpec = computed<TextureRenderSpec>(() =>
  createNoiseMapSpec({ seed: grainSeed.value, threshold: noiseThreshold.value }, nodeViewport)
)

const gradientSpec = computed<TextureRenderSpec>(() =>
  createLinearGradientSpec({ angle: angle.value, stops: gpuStops.value }, nodeViewport)
)

const depthNoiseSpec = computed<TextureRenderSpec>(() =>
  createGradientNoiseMapSpec({
    angle: angle.value,
    seed: grainSeed.value,
    power: power.value,
    sparsity: sparsity.value,
  }, nodeViewport)
)

const finalSpec = computed<TextureRenderSpec>(() =>
  createGradientGrainSpec({
    angle: angle.value,
    colorA: colorA.value,
    colorB: colorB.value,
    seed: grainSeed.value,
    power: power.value,
    sparsity: sparsity.value,
  }, mainViewport)
)

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

function renderMain() {
  if (!mainRenderer) return
  mainRenderer.render(finalSpec.value)
}

// 色停止点を追加
function addStop() {
  if (stops.value.length >= 8) return
  stops.value.push({ color: '#ffffff', position: 50 })
}

// 色停止点を削除
function removeStop(index: number) {
  if (stops.value.length > 2) {
    stops.value.splice(index, 1)
  }
}

watch(
  [stops, angle, grainSeed, noiseThreshold, power, sparsity],
  () => renderMain(),
  { deep: true }
)

onMounted(async () => {
  if (!navigator.gpu) {
    webGPUError.value = 'WebGPU is not supported in this browser'
    webGPUSupported.value = false
    return
  }
  await initMainRenderer()

  // 接続線を更新（レイアウト完了後）
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
  <div class="gradient-lab">
    <header class="header">
      <h1>Gradient Lab</h1>
      <RouterLink to="/" class="back-link">Back to Home</RouterLink>
    </header>

    <main class="main">
      <!-- ノードグラフ -->
      <section ref="nodeGraphRef" class="node-graph">
        <!-- SVG接続線（オーバーレイ） -->
        <svg class="connections-overlay">
          <path
            v-for="(path, index) in connectionPaths"
            :key="index"
            :d="path"
            class="connection-line"
          />
        </svg>

        <!-- Row 1: Input nodes -->
        <div class="node-row">
          <div ref="depthNodeRef" class="node-wrapper">
            <NodePreview
              label="Depth (t)"
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="depthSpec"
            />
          </div>
          <div ref="noiseNodeRef" class="node-wrapper">
            <NodePreview
              label="Noise"
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="noiseSpec"
            />
          </div>
        </div>

        <!-- Row 2: Processing nodes -->
        <div class="node-row">
          <div ref="gradientNodeRef" class="node-wrapper">
            <NodePreview
              label="Gradient"
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="gradientSpec"
            />
          </div>
          <div ref="depthNoiseNodeRef" class="node-wrapper">
            <NodePreview
              label="Depth + Noise"
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="depthNoiseSpec"
            />
          </div>
        </div>

        <!-- Row 3: Output node -->
        <div class="node-row final-row">
          <div ref="finalNodeRef" class="final-node">
            <div class="node-label">Final Output</div>
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

      <!-- コントロールパネル -->
      <aside class="controls-panel">
        <div class="control-group">
          <label class="control-label">Angle: {{ angle }}°</label>
          <input v-model.number="angle" type="range" min="0" max="360" class="slider" />
        </div>

        <div class="control-group">
          <label class="control-label">Power: {{ power.toFixed(1) }}</label>
          <input v-model.number="power" type="range" min="0.2" max="4" step="0.1" class="slider" />
        </div>

        <div class="control-group">
          <label class="control-label">Sparsity: {{ Math.round(sparsity * 100) }}%</label>
          <input v-model.number="sparsity" type="range" min="0" max="0.99" step="0.01" class="slider" />
        </div>

        <div class="control-group">
          <label class="control-label">Noise Threshold: {{ Math.round(noiseThreshold * 100) }}%</label>
          <input v-model.number="noiseThreshold" type="range" min="0" max="1" step="0.01" class="slider" />
        </div>

        <div class="control-group">
          <label class="control-label">Seed: {{ grainSeed }}</label>
          <input v-model.number="grainSeed" type="number" min="0" class="seed-input" />
        </div>

        <div class="control-group">
          <div class="stops-header">
            <label class="control-label">Colors</label>
            <button class="add-button" :disabled="stops.length >= 8" @click="addStop">+</button>
          </div>
          <div class="stops-list">
            <div v-for="(stop, index) in stops" :key="index" class="stop-item">
              <input v-model="stop.color" type="color" class="color-input" />
              <input v-model.number="stop.position" type="range" min="0" max="100" class="position-slider" />
              <span class="position-value">{{ stop.position }}%</span>
              <button class="remove-button" :disabled="stops.length <= 2" @click="removeStop(index)">×</button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.gradient-lab {
  min-height: 100vh;
  background: #1a1a2e;
  color: #eee;
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.back-link {
  color: #4ecdc4;
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover {
  text-decoration: underline;
}

.main {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Node Graph */
.node-graph {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

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

.node-row {
  display: flex;
  gap: 3rem;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.final-row {
  margin-top: 0;
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
}

.node-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #16162a;
  border-radius: 0.75rem;
  height: fit-content;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.seed-input {
  width: 100%;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  color: #eee;
  font-family: monospace;
  font-size: 0.75rem;
}

.seed-input:focus {
  outline: none;
  border-color: #4ecdc4;
}

.stops-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4ecdc4;
  border: none;
  border-radius: 4px;
  color: #1a1a2e;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.add-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stops-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stop-item {
  display: grid;
  grid-template-columns: 32px 1fr 40px 24px;
  gap: 0.5rem;
  align-items: center;
}

.color-input {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.position-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: #2a2a4a;
  border-radius: 2px;
  cursor: pointer;
}

.position-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: #ff6b6b;
  border-radius: 50%;
  cursor: pointer;
}

.position-value {
  font-size: 0.625rem;
  color: #888;
  text-align: right;
}

.remove-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #3a3a5a;
  border-radius: 4px;
  color: #888;
  font-size: 0.875rem;
  cursor: pointer;
}

.remove-button:hover:not(:disabled) {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.remove-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .main {
    grid-template-columns: 1fr;
  }
}
</style>
