<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import {
  TextureRenderer,
  createLinearGradientSpec,
  createGradientGrainSpec,
  createLinearDepthMapSpec,
  createNoiseMapSpec,
  type ColorStop as GpuColorStop,
} from '@practice/texture'

// グラデーションの色停止点
interface ColorStop {
  color: string  // HEX
  position: number // 0-100
}

const stops = ref<ColorStop[]>([
  { color: '#ff6b6b', position: 0 },
  { color: '#4ecdc4', position: 100 },
])

// グラデーションの角度
const angle = ref(90)

// グレイン設定
const grainIntensity = ref(0.8) // 0-1
const grainEnabled = ref(true)
const grainSeed = ref(12345)
const grainBlendStrength = ref(1.0)

// ノイズマップ設定
const noiseIntensity = ref(1.0) // 0-1

// レンダリングモード
type RenderMode = 'depthMap' | 'noise' | 'gradient' | 'gradientGrain'
const renderMode = ref<RenderMode>('gradientGrain')

// Canvas refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 450

// WebGPU
let renderer: TextureRenderer | null = null
const webGPUSupported = ref(true)
const webGPUError = ref<string | null>(null)

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

// Get first and last colors for grain mode
const colorA = computed(() => {
  const sorted = [...stops.value].sort((a, b) => a.position - b.position)
  return hexToRgba(sorted[0]?.color || '#ffffff')
})

const colorB = computed(() => {
  const sorted = [...stops.value].sort((a, b) => a.position - b.position)
  return hexToRgba(sorted[sorted.length - 1]?.color || '#000000')
})

async function initRenderer() {
  if (!canvasRef.value) return

  try {
    renderer = await TextureRenderer.create(canvasRef.value)
    webGPUSupported.value = true
    render()
  } catch (e) {
    webGPUError.value = e instanceof Error ? e.message : 'Unknown error'
    webGPUSupported.value = false
  }
}

function render() {
  if (!renderer) return

  const viewport = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }

  if (renderMode.value === 'depthMap') {
    const spec = createLinearDepthMapSpec(
      { angle: angle.value },
      viewport
    )
    renderer.render(spec)
  } else if (renderMode.value === 'noise') {
    const spec = createNoiseMapSpec(
      { seed: grainSeed.value, intensity: noiseIntensity.value },
      viewport
    )
    renderer.render(spec)
  } else if (renderMode.value === 'gradient' || !grainEnabled.value) {
    const spec = createLinearGradientSpec(
      { angle: angle.value, stops: gpuStops.value },
      viewport
    )
    renderer.render(spec)
  } else {
    const spec = createGradientGrainSpec(
      {
        angle: angle.value,
        colorA: colorA.value,
        colorB: colorB.value,
        seed: grainSeed.value,
        intensity: grainIntensity.value,
        blendStrength: grainBlendStrength.value,
      },
      viewport
    )
    renderer.render(spec)
  }
}

// 色停止点を追加
function addStop() {
  if (stops.value.length >= 8) return
  stops.value.push({
    color: '#ffffff',
    position: 50,
  })
}

// 色停止点を削除
function removeStop(index: number) {
  if (stops.value.length > 2) {
    stops.value.splice(index, 1)
  }
}

// Watch for changes
watch(
  [stops, angle, grainIntensity, grainEnabled, grainSeed, grainBlendStrength, noiseIntensity, renderMode],
  () => render(),
  { deep: true }
)

onMounted(async () => {
  if (!navigator.gpu) {
    webGPUError.value = 'WebGPU is not supported in this browser'
    webGPUSupported.value = false
    return
  }
  await initRenderer()
})

onUnmounted(() => {
  renderer?.destroy()
  renderer = null
})
</script>

<template>
  <div class="gradient-lab">
    <header class="header">
      <h1>Gradient Lab</h1>
      <RouterLink to="/" class="back-link">Back to Home</RouterLink>
    </header>

    <main class="main">
      <!-- プレビューエリア -->
      <section class="preview-section">
        <canvas
          v-show="webGPUSupported"
          ref="canvasRef"
          :width="CANVAS_WIDTH"
          :height="CANVAS_HEIGHT"
          class="preview-canvas"
        />

        <div v-if="!webGPUSupported" class="error-message">
          <p>WebGPU Not Supported</p>
          <p class="error-detail">{{ webGPUError }}</p>
        </div>

        <!-- レンダリングモード切り替え -->
        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: renderMode === 'depthMap' }"
            @click="renderMode = 'depthMap'"
          >
            Depth Map
          </button>
          <button
            class="mode-tab"
            :class="{ active: renderMode === 'noise' }"
            @click="renderMode = 'noise'"
          >
            Noise
          </button>
          <button
            class="mode-tab"
            :class="{ active: renderMode === 'gradient' }"
            @click="renderMode = 'gradient'"
          >
            Gradient
          </button>
          <button
            class="mode-tab"
            :class="{ active: renderMode === 'gradientGrain' }"
            @click="renderMode = 'gradientGrain'"
          >
            Gradient + Grain
          </button>
        </div>
      </section>

      <!-- コントロールパネル -->
      <section class="controls-section">
        <div class="control-group">
          <label class="control-label">Angle: {{ angle }}°</label>
          <input
            v-model.number="angle"
            type="range"
            min="0"
            max="360"
            class="angle-slider"
          />
        </div>

        <!-- ノイズ設定 -->
        <div v-if="renderMode === 'noise'" class="control-group">
          <label class="control-label">Noise Intensity: {{ Math.round(noiseIntensity * 100) }}%</label>
          <input
            v-model.number="noiseIntensity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="grain-slider"
          />
          <label class="control-label-small">Seed: {{ grainSeed }}</label>
          <input
            v-model.number="grainSeed"
            type="number"
            min="0"
            class="seed-input"
          />
        </div>

        <!-- グレイン設定 -->
        <div v-if="renderMode === 'gradientGrain'" class="control-group">
          <div class="grain-header">
            <label class="control-label">Grain</label>
            <label class="toggle-label">
              <input
                v-model="grainEnabled"
                type="checkbox"
                class="toggle-checkbox"
              />
              <span class="toggle-switch" />
            </label>
          </div>
          <div v-if="grainEnabled" class="grain-controls">
            <label class="control-label-small">Intensity: {{ Math.round(grainIntensity * 100) }}%</label>
            <input
              v-model.number="grainIntensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="grain-slider"
            />
            <label class="control-label-small">Blend: {{ Math.round(grainBlendStrength * 100) }}%</label>
            <input
              v-model.number="grainBlendStrength"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="grain-slider"
            />
            <label class="control-label-small">Seed: {{ grainSeed }}</label>
            <input
              v-model.number="grainSeed"
              type="number"
              min="0"
              class="seed-input"
            />
          </div>
        </div>

        <div class="control-group">
          <div class="stops-header">
            <label class="control-label">Color Stops (max 8)</label>
            <button
              class="add-stop-button"
              :disabled="stops.length >= 8"
              @click="addStop"
            >
              + Add
            </button>
          </div>
          <div class="stops-list">
            <div v-for="(stop, index) in stops" :key="index" class="stop-item">
              <input
                v-model="stop.color"
                type="color"
                class="color-input"
              />
              <input
                v-model="stop.color"
                type="text"
                class="color-text"
                placeholder="#000000"
              />
              <input
                v-model.number="stop.position"
                type="range"
                min="0"
                max="100"
                class="position-slider"
              />
              <span class="position-value">{{ stop.position }}%</span>
              <button
                class="remove-button"
                :disabled="stops.length <= 2"
                @click="removeStop(index)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.gradient-lab {
  min-height: 100vh;
  background: #1a1a2e;
  color: #eee;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.5rem;
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
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-canvas {
  width: 100%;
  height: auto;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.error-message {
  padding: 2rem;
  background: #2a2a4a;
  border-radius: 1rem;
  text-align: center;
  color: #ff6b6b;
}

.error-detail {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #888;
}

/* Mode Tabs */
.mode-tabs {
  display: flex;
  gap: 0.5rem;
}

.mode-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #2a2a4a;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  color: #888;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-tab:hover {
  background: #3a3a5a;
  color: #aaa;
}

.mode-tab.active {
  background: #3a3a5a;
  border-color: #4ecdc4;
  color: #4ecdc4;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #16162a;
  border-radius: 1rem;
  height: fit-content;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.control-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #aaa;
}

.angle-slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: #2a2a4a;
  border-radius: 3px;
  cursor: pointer;
}

.angle-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #4ecdc4;
  border-radius: 50%;
  cursor: pointer;
}

/* Grain Controls */
.grain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-label {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch {
  display: block;
  width: 40px;
  height: 22px;
  background: #2a2a4a;
  border-radius: 11px;
  transition: background 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #666;
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}

.toggle-checkbox:checked + .toggle-switch {
  background: #4ecdc4;
}

.toggle-checkbox:checked + .toggle-switch::after {
  transform: translateX(18px);
  background: #fff;
}

.grain-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.control-label-small {
  font-size: 0.75rem;
  color: #888;
}

.grain-slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: #2a2a4a;
  border-radius: 3px;
  cursor: pointer;
}

.grain-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #ff6b6b;
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

.add-stop-button {
  padding: 0.375rem 0.75rem;
  background: #4ecdc4;
  border: none;
  border-radius: 0.375rem;
  color: #1a1a2e;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-stop-button:hover:not(:disabled) {
  opacity: 0.85;
}

.add-stop-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stops-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stop-item {
  display: grid;
  grid-template-columns: 36px 1fr 1fr 48px 28px;
  gap: 0.5rem;
  align-items: center;
}

.color-input {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.color-text {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  color: #eee;
  font-family: monospace;
  font-size: 0.75rem;
}

.color-text:focus {
  outline: none;
  border-color: #4ecdc4;
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
  width: 14px;
  height: 14px;
  background: #ff6b6b;
  border-radius: 50%;
  cursor: pointer;
}

.position-value {
  font-size: 0.75rem;
  color: #888;
  text-align: right;
}

.remove-button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #3a3a5a;
  border-radius: 0.375rem;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
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
