<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  TextureRenderer,
  createLinearGradientSpec,
  createGradientGrainSpec,
  createLinearDepthMapSpec,
  createCircularDepthMapSpec,
  createRadialDepthMapSpec,
  createPerlinDepthMapSpec,
  createNoiseMapSpec,
  createGradientNoiseMapSpec,
  createIntensityCurveSpec,
  type TextureRenderSpec,
  type ColorStop as GpuColorStop,
} from '@practice/texture'
import NodePreview from '../components/NodePreview.vue'
import CurveEditor from '../components/CurveEditor.vue'
import { NodeGraph, NodeWrapper, type Connection } from '../components/NodeGraph'
import { type Curve } from '../modules/Filter/Domain'

// Node IDs
const NODE_DEPTH = 'depth'
const NODE_NOISE = 'noise'
const NODE_INTENSITY_CURVE = 'intensity-curve'
const NODE_CURVED_DEPTH = 'curved-depth'
const NODE_GRADIENT = 'gradient'
const NODE_DEPTH_NOISE = 'depth-noise'
const NODE_FINAL = 'final'

// Connection definitions
const connections = ref<Connection[]>([
  // Depth + IntensityCurve -> CurvedDepth
  { from: { nodeId: NODE_DEPTH, position: 'bottom' }, to: { nodeId: NODE_CURVED_DEPTH, position: 'top' } },
  { from: { nodeId: NODE_INTENSITY_CURVE, position: 'bottom' }, to: { nodeId: NODE_CURVED_DEPTH, position: 'top' } },
  // Noise + CurvedDepth -> DepthNoise
  { from: { nodeId: NODE_NOISE, position: 'bottom' }, to: { nodeId: NODE_DEPTH_NOISE, position: 'top' } },
  { from: { nodeId: NODE_CURVED_DEPTH, position: 'bottom' }, to: { nodeId: NODE_DEPTH_NOISE, position: 'top' } },
  // Depth -> Gradient
  { from: { nodeId: NODE_DEPTH, position: 'bottom' }, to: { nodeId: NODE_GRADIENT, position: 'top' } },
  // Gradient + DepthNoise -> Final
  { from: { nodeId: NODE_GRADIENT, position: 'bottom' }, to: { nodeId: NODE_FINAL, position: 'top' } },
  { from: { nodeId: NODE_DEPTH_NOISE, position: 'bottom' }, to: { nodeId: NODE_FINAL, position: 'top' } },
])

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

// 線形深度マップ用パラメータ
const linearCenterX = ref(0.5)
const linearCenterY = ref(0.5)

// 深度マップタイプ
type DepthMapType = 'linear' | 'circular' | 'radial' | 'perlin'
const depthMapType = ref<DepthMapType>('linear')

// 円形深度マップ用パラメータ
const circularCenterX = ref(0.5)
const circularCenterY = ref(0.5)

// 放射深度マップ用パラメータ
const radialCenterX = ref(0.5)
const radialCenterY = ref(0.5)
const radialStartAngle = ref(0)
const radialSweepAngle = ref(360)

// パーリンノイズ深度マップ用パラメータ
const perlinScale = ref(4)
const perlinOctaves = ref(4)
const perlinContrast = ref(1)
const perlinOffset = ref(0)

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
    parseInt(result[1]!, 16) / 255,
    parseInt(result[2]!, 16) / 255,
    parseInt(result[3]!, 16) / 255,
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
const depthParams = computed(() => {
  let centerX = 0.5
  let centerY = 0.5
  switch (depthMapType.value) {
    case 'linear':
      centerX = linearCenterX.value
      centerY = linearCenterY.value
      break
    case 'circular':
      centerX = circularCenterX.value
      centerY = circularCenterY.value
      break
    case 'radial':
      centerX = radialCenterX.value
      centerY = radialCenterY.value
      break
  }
  return {
    depthMapType: depthMapType.value,
    angle: angle.value,
    centerX,
    centerY,
    circularInvert: false,  // always false (use color swap instead)
    radialStartAngle: radialStartAngle.value,
    radialSweepAngle: radialSweepAngle.value,
    // Perlin noise params
    perlinScale: perlinScale.value,
    perlinOctaves: perlinOctaves.value,
    perlinSeed: grainSeed.value,
    perlinContrast: perlinContrast.value,
    perlinOffset: perlinOffset.value,
  }
})

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
    case 'perlin':
      return createPerlinDepthMapSpec({
        scale: perlinScale.value,
        octaves: perlinOctaves.value,
        seed: grainSeed.value,
        contrast: perlinContrast.value,
        offset: perlinOffset.value,
      }, nodeViewport)
    case 'linear':
    default:
      return createLinearDepthMapSpec({
        angle: angle.value,
        centerX: linearCenterX.value,
        centerY: linearCenterY.value,
      }, nodeViewport)
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
   depthMapType, linearCenterX, linearCenterY,
   circularCenterX, circularCenterY,
   radialCenterX, radialCenterY, radialStartAngle, radialSweepAngle,
   perlinScale, perlinOctaves, perlinContrast, perlinOffset],
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
})

onUnmounted(() => {
  mainRenderer?.destroy()
  mainRenderer = null
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
      <NodeGraph :connections="connections" :columns="6" gap="2rem" v-slot="{ setNodeRef }">
        <!-- Row 1: Depth, Noise, Intensity Curve -->
        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_DEPTH, el?.$el)"
          label="A"
          title="Depth (t)"
          style="grid-column: 1; grid-row: 1;"
        >
          <NodePreview :width="NODE_WIDTH" :height="NODE_HEIGHT" :spec="depthSpec" />
        </NodeWrapper>

        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_NOISE, el?.$el)"
          label="B"
          title="Noise"
          style="grid-column: 3; grid-row: 1;"
        >
          <NodePreview :width="NODE_WIDTH" :height="NODE_HEIGHT" :spec="noiseSpec" />
        </NodeWrapper>

        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_INTENSITY_CURVE, el?.$el)"
          label="C"
          title="Intensity Curve"
          style="grid-column: 5; grid-row: 1;"
        >
          <CurveEditor
            :curve="intensityCurve"
            :width="NODE_WIDTH"
            :height="NODE_HEIGHT"
            @update:point="updateCurvePoint"
          />
        </NodeWrapper>

        <!-- Row 2: Curved Depth -->
        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_CURVED_DEPTH, el?.$el)"
          label="D"
          title="Curved Depth"
          style="grid-column: 3; grid-row: 2;"
        >
          <NodePreview :width="NODE_WIDTH" :height="NODE_HEIGHT" :spec="curvedDepthSpec" />
        </NodeWrapper>

        <!-- Row 3: Gradient, Depth + Noise -->
        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_GRADIENT, el?.$el)"
          label="E"
          title="Gradient"
          style="grid-column: 2; grid-row: 3;"
        >
          <NodePreview :width="NODE_WIDTH" :height="NODE_HEIGHT" :spec="gradientSpec" />
        </NodeWrapper>

        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_DEPTH_NOISE, el?.$el)"
          label="F"
          title="Depth + Noise"
          style="grid-column: 4; grid-row: 3;"
        >
          <NodePreview :width="NODE_WIDTH" :height="NODE_HEIGHT" :spec="depthNoiseSpec" />
        </NodeWrapper>

        <!-- Row 4: Output node -->
        <NodeWrapper
          :ref="(el: any) => setNodeRef(NODE_FINAL, el?.$el)"
          label="G"
          title="Final Output"
          style="grid-column: 3; grid-row: 4;"
        >
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
        </NodeWrapper>
      </NodeGraph>

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
              <option value="perlin">Perlin Noise</option>
            </select>
          </div>
          <!-- Linear params -->
          <template v-if="depthMapType === 'linear'">
            <div class="control-group">
              <label class="control-label">Angle: {{ angle }}°</label>
              <input v-model.number="angle" type="range" min="0" max="360" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Center X: {{ Math.round(linearCenterX * 100) }}%</label>
              <input v-model.number="linearCenterX" type="range" min="0" max="1" step="0.01" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Center Y: {{ Math.round(linearCenterY * 100) }}%</label>
              <input v-model.number="linearCenterY" type="range" min="0" max="1" step="0.01" class="slider" />
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
          <!-- Perlin params -->
          <template v-else-if="depthMapType === 'perlin'">
            <div class="control-group">
              <label class="control-label">Scale: {{ perlinScale.toFixed(1) }}</label>
              <input v-model.number="perlinScale" type="range" min="1" max="20" step="0.5" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Octaves: {{ perlinOctaves }}</label>
              <input v-model.number="perlinOctaves" type="range" min="1" max="8" step="1" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Seed: {{ grainSeed }}</label>
              <input v-model.number="grainSeed" type="number" min="0" class="seed-input" />
            </div>
            <div class="control-group">
              <label class="control-label">Contrast: {{ perlinContrast.toFixed(2) }}</label>
              <input v-model.number="perlinContrast" type="range" min="0.1" max="3" step="0.05" class="slider" />
            </div>
            <div class="control-group">
              <label class="control-label">Offset: {{ perlinOffset.toFixed(2) }}</label>
              <input v-model.number="perlinOffset" type="range" min="-0.5" max="0.5" step="0.01" class="slider" />
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
