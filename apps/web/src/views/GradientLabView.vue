<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  TextureRenderer,
  createLinearGradientSpec,
  createGradientGrainSpec,
  createLinearDepthMapSpec,
  createCircularDepthMapSpec,
  createRadialDepthMapSpec,
  createNoiseMapSpec,
  createGradientNoiseMapSpec,
  createIntensityCurveSpec,
  type TextureRenderSpec,
  type ColorStop as GpuColorStop,
} from '@practice/texture'
import NodePreview from '../components/NodePreview.vue'
import CurveEditor from '../components/CurveEditor.vue'
import { type Curve } from '../modules/Filter/Domain'

// ノードのDOM参照
const nodeGraphRef = ref<HTMLElement | null>(null)
const depthNodeRef = ref<HTMLElement | null>(null)
const noiseNodeRef = ref<HTMLElement | null>(null)
const intensityCurveNodeRef = ref<HTMLElement | null>(null)
const curvedDepthNodeRef = ref<HTMLElement | null>(null)
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

  // Row 1 bottoms
  const depthBottom = getNodeCenter(depthNodeRef.value, container, 'bottom')
  const noiseBottom = getNodeCenter(noiseNodeRef.value, container, 'bottom')
  const intensityCurveBottom = getNodeCenter(intensityCurveNodeRef.value, container, 'bottom')

  // Row 2 tops/bottoms
  const curvedDepthTop = getNodeCenter(curvedDepthNodeRef.value, container, 'top')
  const curvedDepthBottom = getNodeCenter(curvedDepthNodeRef.value, container, 'bottom')
  const depthNoiseTop = getNodeCenter(depthNoiseNodeRef.value, container, 'top')
  const depthNoiseBottom = getNodeCenter(depthNoiseNodeRef.value, container, 'bottom')

  // Row 3 tops/bottoms
  const gradientTop = getNodeCenter(gradientNodeRef.value, container, 'top')
  const gradientBottom = getNodeCenter(gradientNodeRef.value, container, 'bottom')

  // Row 4 top
  const finalTop = getNodeCenter(finalNodeRef.value, container, 'top')

  connectionPaths.value = [
    // Depth + IntensityCurve -> CurvedDepth
    createBezierPath(depthBottom, curvedDepthTop),
    createBezierPath(intensityCurveBottom, curvedDepthTop),
    // Noise + CurvedDepth -> DepthNoise
    createBezierPath(noiseBottom, depthNoiseTop),
    createBezierPath(curvedDepthBottom, depthNoiseTop),
    // Depth -> Gradient
    createBezierPath(depthBottom, gradientTop),
    // Gradient + DepthNoise -> Final
    createBezierPath(gradientBottom, finalTop),
    createBezierPath(depthNoiseBottom, finalTop),
  ]
}

// グラデーションの2色
const colorAHex = ref('#ff6b6b')
const colorBHex = ref('#4ecdc4')

// 色をスワップ
function swapColors() {
  const temp = colorAHex.value
  colorAHex.value = colorBHex.value
  colorBHex.value = temp
}

// パラメータ
const angle = ref(90)
const grainSeed = ref(12345)
const sparsity = ref(0.75)

// 深度マップタイプ
type DepthMapType = 'linear' | 'circular' | 'radial'
const depthMapType = ref<DepthMapType>('linear')

// 円形深度マップ用パラメータ
const circularCenterX = ref(0.5)
const circularCenterY = ref(0.5)

// 放射深度マップ用パラメータ
const radialCenterX = ref(0.5)
const radialCenterY = ref(0.5)
const radialStartAngle = ref(0)
const radialSweepAngle = ref(360)

// カーブパラメータ
const curvePoints = ref<number[]>([0, 1/36, 4/36, 9/36, 16/36, 25/36, 1])  // parabola: x²
const curvePreset = ref<string>('parabola')

// プリセット定義
// exp: (e^x - 1) / (e - 1), log: ln(1 + x*(e-1)) を正規化
const E = Math.E
const curvePresets: Record<string, number[]> = {
  linear: [0, 1/6, 2/6, 3/6, 4/6, 5/6, 1],
  parabola: [0, 1/36, 4/36, 9/36, 16/36, 25/36, 1],  // x²
  exp: [0, 1, 2, 3, 4, 5, 6].map(i => (Math.exp(i/6) - 1) / (E - 1)),
  log: [0, 1, 2, 3, 4, 5, 6].map(i => Math.log(1 + (i/6) * (E - 1))),
  easeIn: [0, 0.005, 0.028, 0.083, 0.194, 0.389, 1],
  easeOut: [0, 0.611, 0.806, 0.917, 0.972, 0.995, 1],
  sCurve: [0, 0.028, 0.132, 0.5, 0.868, 0.972, 1],
  step: [0, 0, 0, 0.5, 1, 1, 1],
  inverse: [1, 5/6, 4/6, 3/6, 2/6, 1/6, 0],
}

// カーブをCurve型に変換
const intensityCurve = computed<Curve>(() => ({
  points: curvePoints.value
}))

// プリセット適用
function applyCurvePreset() {
  const preset = curvePresets[curvePreset.value]
  if (preset) {
    curvePoints.value = [...preset]
  }
}

// カーブポイント更新
function updateCurvePoint(index: number, value: number) {
  curvePoints.value[index] = value
  curvePreset.value = 'custom'
}

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

// Convert to GPU format (2 colors)
const gpuStops = computed<GpuColorStop[]>(() => [
  { color: hexToRgba(colorAHex.value), position: 0 },
  { color: hexToRgba(colorBHex.value), position: 1 },
])

const colorA = computed(() => hexToRgba(colorAHex.value))
const colorB = computed(() => hexToRgba(colorBHex.value))

// ノード用のspec
const nodeViewport = { width: NODE_WIDTH, height: NODE_HEIGHT }
const mainViewport = { width: MAIN_WIDTH, height: MAIN_HEIGHT }

// 共通の深度マップパラメータ
const depthParams = computed(() => ({
  depthMapType: depthMapType.value,
  angle: angle.value,
  centerX: depthMapType.value === 'circular' ? circularCenterX.value : radialCenterX.value,
  centerY: depthMapType.value === 'circular' ? circularCenterY.value : radialCenterY.value,
  circularInvert: false,  // always false (use color swap instead)
  radialStartAngle: radialStartAngle.value,
  radialSweepAngle: radialSweepAngle.value,
}))

const depthSpec = computed<TextureRenderSpec>(() => {
  switch (depthMapType.value) {
    case 'circular':
      return createCircularDepthMapSpec({
        centerX: circularCenterX.value,
        centerY: circularCenterY.value,
        invert: false,
      }, nodeViewport)
    case 'radial':
      return createRadialDepthMapSpec({
        centerX: radialCenterX.value,
        centerY: radialCenterY.value,
        startAngle: radialStartAngle.value,
        sweepAngle: radialSweepAngle.value,
      }, nodeViewport)
    case 'linear':
    default:
      return createLinearDepthMapSpec({ angle: angle.value }, nodeViewport)
  }
})

const noiseSpec = computed<TextureRenderSpec>(() =>
  createNoiseMapSpec({ seed: grainSeed.value }, nodeViewport)
)

const gradientSpec = computed<TextureRenderSpec>(() =>
  createLinearGradientSpec({
    ...depthParams.value,
    stops: gpuStops.value,
  }, nodeViewport)
)

const curvedDepthSpec = computed<TextureRenderSpec>(() =>
  createIntensityCurveSpec({
    ...depthParams.value,
    curvePoints: curvePoints.value,
  }, nodeViewport)
)

const depthNoiseSpec = computed<TextureRenderSpec>(() =>
  createGradientNoiseMapSpec({
    ...depthParams.value,
    seed: grainSeed.value,
    sparsity: sparsity.value,
    curvePoints: curvePoints.value,
  }, nodeViewport)
)

const finalSpec = computed<TextureRenderSpec>(() =>
  createGradientGrainSpec({
    ...depthParams.value,
    colorA: colorA.value,
    colorB: colorB.value,
    seed: grainSeed.value,
    sparsity: sparsity.value,
    curvePoints: curvePoints.value,
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

watch(
  [colorAHex, colorBHex, angle, grainSeed, sparsity, curvePoints,
   depthMapType, circularCenterX, circularCenterY,
   radialCenterX, radialCenterY, radialStartAngle, radialSweepAngle],
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

        <!-- Row 1: Depth, Noise, Intensity Curve -->
        <div class="node-row">
          <div ref="depthNodeRef" class="node-wrapper">
            <NodePreview
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="depthSpec"
            >
              <template #label>
                <div class="node-title">
                  <span class="node-badge">A</span>
                  <span class="node-title-text">Depth (t)</span>
                  <span class="node-badge-offset"></span>
                </div>
              </template>
            </NodePreview>
          </div>
          <div ref="noiseNodeRef" class="node-wrapper">
            <NodePreview
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="noiseSpec"
            >
              <template #label>
                <div class="node-title">
                  <span class="node-badge">B</span>
                  <span class="node-title-text">Noise</span>
                  <span class="node-badge-offset"></span>
                </div>
              </template>
            </NodePreview>
          </div>
          <div ref="intensityCurveNodeRef" class="node-wrapper curve-node">
            <div class="curve-node-header">
              <div class="node-title">
                <span class="node-badge">C</span>
                <span class="node-title-text">Intensity Curve</span>
                <span class="node-badge-offset"></span>
              </div>
            </div>
            <CurveEditor
              :curve="intensityCurve"
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              @update:point="updateCurvePoint"
            />
          </div>
        </div>

        <!-- Row 2: Curved Depth -->
        <div class="node-row">
          <div ref="curvedDepthNodeRef" class="node-wrapper">
            <NodePreview
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="curvedDepthSpec"
            >
              <template #label>
                <div class="node-title">
                  <span class="node-badge">D</span>
                  <span class="node-title-text">Curved Depth</span>
                  <span class="node-badge-offset"></span>
                </div>
              </template>
            </NodePreview>
          </div>
        </div>

        <!-- Row 3: Gradient, Depth + Noise -->
        <div class="node-row">
          <div ref="gradientNodeRef" class="node-wrapper">
            <NodePreview
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="gradientSpec"
            >
              <template #label>
                <div class="node-title">
                  <span class="node-badge">E</span>
                  <span class="node-title-text">Gradient</span>
                  <span class="node-badge-offset"></span>
                </div>
              </template>
            </NodePreview>
          </div>
          <div ref="depthNoiseNodeRef" class="node-wrapper">
            <NodePreview
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              :spec="depthNoiseSpec"
            >
              <template #label>
                <div class="node-title">
                  <span class="node-badge">F</span>
                  <span class="node-title-text">Depth + Noise</span>
                  <span class="node-badge-offset"></span>
                </div>
              </template>
            </NodePreview>
          </div>
        </div>

        <!-- Row 4: Output node -->
        <div class="node-row final-row">
          <div ref="finalNodeRef" class="final-node">
            <div class="node-title">
              <span class="node-badge">G</span>
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

      <!-- コントロールパネル -->
      <aside class="controls-panel">
        <!-- A: Depth -->
        <div class="node-group">
          <div class="node-group-header">
            <span class="node-badge">A</span>
            <span class="node-group-title">Depth</span>
            <span class="node-badge-offset"></span>
          </div>
          <div class="control-group">
            <label class="control-label">Type</label>
            <select v-model="depthMapType" class="preset-select">
              <option value="linear">Linear</option>
              <option value="circular">Circular</option>
              <option value="radial">Radial</option>
            </select>
          </div>
          <!-- Linear params -->
          <template v-if="depthMapType === 'linear'">
            <div class="control-group">
              <label class="control-label">Angle: {{ angle }}°</label>
              <input v-model.number="angle" type="range" min="0" max="360" class="slider" />
            </div>
          </template>
          <!-- Circular params -->
          <template v-else-if="depthMapType === 'circular'">
            <div class="control-group">
              <label class="control-label">Center X: {{ Math.round(circularCenterX * 100) }}%</label>
              <input v-model.number="circularCenterX" type="range" min="0" max="1" step="0.01" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Center Y: {{ Math.round(circularCenterY * 100) }}%</label>
              <input v-model.number="circularCenterY" type="range" min="0" max="1" step="0.01" class="slider" />
            </div>
          </template>
          <!-- Radial params -->
          <template v-else-if="depthMapType === 'radial'">
            <div class="control-group">
              <label class="control-label">Center X: {{ Math.round(radialCenterX * 100) }}%</label>
              <input v-model.number="radialCenterX" type="range" min="0" max="1" step="0.01" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Center Y: {{ Math.round(radialCenterY * 100) }}%</label>
              <input v-model.number="radialCenterY" type="range" min="0" max="1" step="0.01" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Start Angle: {{ radialStartAngle }}°</label>
              <input v-model.number="radialStartAngle" type="range" min="0" max="360" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Sweep: {{ radialSweepAngle }}°</label>
              <input v-model.number="radialSweepAngle" type="range" min="1" max="360" class="slider" />
            </div>
          </template>
        </div>

        <!-- B: Noise -->
        <div class="node-group">
          <div class="node-group-header">
            <span class="node-badge">B</span>
            <span class="node-group-title">Noise</span>
            <span class="node-badge-offset"></span>
          </div>
          <div class="control-group">
            <label class="control-label">Seed: {{ grainSeed }}</label>
            <input v-model.number="grainSeed" type="number" min="0" class="seed-input" />
          </div>
        </div>

        <!-- C: Intensity Curve -->
        <div class="node-group">
          <div class="node-group-header">
            <span class="node-badge">C</span>
            <span class="node-group-title">Intensity Curve</span>
            <span class="node-badge-offset"></span>
          </div>
          <div class="control-group">
            <label class="control-label">Preset</label>
            <select v-model="curvePreset" class="preset-select" @change="applyCurvePreset">
              <option value="linear">Linear</option>
              <option value="parabola">Parabola</option>
              <option value="exp">Exp</option>
              <option value="log">Log</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="sCurve">S-Curve</option>
              <option value="step">Step</option>
              <option value="inverse">Inverse</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <!-- E: Gradient -->
        <div class="node-group">
          <div class="node-group-header">
            <span class="node-badge">E</span>
            <span class="node-group-title">Gradient</span>
            <span class="node-badge-offset"></span>
          </div>
          <div class="control-group">
            <label class="control-label">Colors</label>
            <div class="color-pair">
              <input v-model="colorAHex" type="color" class="color-input-large" title="Color A (start)" />
              <button class="swap-button" @click="swapColors" title="Swap colors">
                <span class="swap-icon">⇄</span>
              </button>
              <input v-model="colorBHex" type="color" class="color-input-large" title="Color B (end)" />
            </div>
          </div>
        </div>

        <!-- F: Depth + Noise -->
        <div class="node-group">
          <div class="node-group-header">
            <span class="node-badge">F</span>
            <span class="node-group-title">Depth + Noise</span>
            <span class="node-badge-offset"></span>
          </div>
          <div class="control-group">
            <label class="control-label">Sparsity: {{ Math.round(sparsity * 100) }}%</label>
            <input v-model.number="sparsity" type="range" min="0" max="0.99" step="0.01" class="slider" />
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

.node-row-right {
  justify-content: center;
  padding-left: calc(200px + 3rem);
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

.curve-preset-select {
  padding: 0.125rem 0.25rem;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 0.25rem;
  color: #eee;
  font-size: 0.625rem;
  cursor: pointer;
}

.curve-preset-select:focus {
  outline: none;
  border-color: #4ecdc4;
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

/* Node Title with Badge */
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

.node-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  margin-bottom: 0.25rem;
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

.preset-select {
  width: 100%;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  color: #eee;
  font-size: 0.75rem;
  cursor: pointer;
}

.preset-select:focus {
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

.color-pair {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.color-input-large {
  width: 48px;
  height: 48px;
  padding: 0;
  border: 2px solid #3a3a5a;
  border-radius: 6px;
  cursor: pointer;
}

.color-input-large::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-input-large::-webkit-color-swatch {
  border-radius: 3px;
  border: none;
}

.swap-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.15s ease;
}

.swap-button:hover {
  background: #3a3a5a;
  border-color: #4ecdc4;
  color: #4ecdc4;
}

.swap-icon {
  font-size: 1rem;
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

/* Checkbox Group */
.checkbox-group {
  flex-direction: row;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: #4ecdc4;
  cursor: pointer;
}

@media (max-width: 900px) {
  .main {
    grid-template-columns: 1fr;
  }
}
</style>
