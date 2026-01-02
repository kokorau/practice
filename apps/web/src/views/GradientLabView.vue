<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// グラデーションの色停止点
interface ColorStop {
  color: string
  position: number // 0-100
}

const stops = ref<ColorStop[]>([
  { color: '#ff6b6b', position: 0 },
  { color: '#4ecdc4', position: 100 },
])

// グラデーションの角度（線形の場合）
const angle = ref(90)

// グレイン設定
const grainIntensity = ref(0.15) // 0-1
const grainEnabled = ref(true)

// Canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gradientMapRef = ref<HTMLCanvasElement | null>(null)
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 450

// 角度からグラデーションの開始・終了座標を計算
const getGradientCoords = (
  width: number,
  height: number,
  angleDeg: number
): { x0: number; y0: number; x1: number; y1: number } => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  const centerX = width / 2
  const centerY = height / 2

  // 対角線の長さを使って、グラデーションが canvas 全体をカバーするようにする
  const diagonal = Math.sqrt(width * width + height * height) / 2

  const x0 = centerX - Math.cos(angleRad) * diagonal
  const y0 = centerY - Math.sin(angleRad) * diagonal
  const x1 = centerX + Math.cos(angleRad) * diagonal
  const y1 = centerY + Math.sin(angleRad) * diagonal

  return { x0, y0, x1, y1 }
}

// 勾配マップを描画（from=白(1), to=黒(0) のグレースケール）
const drawGradientMap = () => {
  const mapCanvas = gradientMapRef.value
  if (!mapCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  if (!mapCtx) return

  const { x0, y0, x1, y1 } = getGradientCoords(
    mapCanvas.width,
    mapCanvas.height,
    angle.value
  )

  const gradient = mapCtx.createLinearGradient(x0, y0, x1, y1)

  // 色停止点の位置を使って、グレースケール勾配を作成
  // position 0% → 白(1), position 100% → 黒(0)
  const sortedStops = [...stops.value].sort((a, b) => a.position - b.position)
  for (const stop of sortedStops) {
    const t = stop.position / 100
    const gray = Math.round((1 - t) * 255)
    gradient.addColorStop(t, `rgb(${gray}, ${gray}, ${gray})`)
  }

  mapCtx.fillStyle = gradient
  mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height)
}

// グレインノイズを適用
const applyGrain = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const intensity = grainIntensity.value * 255

  for (let i = 0; i < data.length; i += 4) {
    // ランダムなノイズ値 (-intensity ~ +intensity)
    const noise = (Math.random() - 0.5) * 2 * intensity

    // RGB各チャンネルにノイズを加算
    data[i] = Math.max(0, Math.min(255, data[i] + noise))     // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)) // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)) // B
    // Alpha はそのまま
  }

  ctx.putImageData(imageData, 0, 0)
}

// Canvas にグラデーションを描画
const drawGradient = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { x0, y0, x1, y1 } = getGradientCoords(
    canvas.width,
    canvas.height,
    angle.value
  )

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1)

  // 色停止点をソートして追加
  const sortedStops = [...stops.value].sort((a, b) => a.position - b.position)
  for (const stop of sortedStops) {
    gradient.addColorStop(stop.position / 100, stop.color)
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // グレインを適用
  if (grainEnabled.value && grainIntensity.value > 0) {
    applyGrain(ctx, canvas.width, canvas.height)
  }

  // 勾配マップを更新
  drawGradientMap()
}

// 色停止点を追加
const addStop = () => {
  const midPosition = 50
  stops.value.push({
    color: '#ffffff',
    position: midPosition,
  })
}

// 色停止点を削除
const removeStop = (index: number) => {
  if (stops.value.length > 2) {
    stops.value.splice(index, 1)
  }
}

// 変更を監視して再描画
watch([stops, angle, grainIntensity, grainEnabled], drawGradient, { deep: true })

onMounted(() => {
  drawGradient()
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
          ref="canvasRef"
          :width="CANVAS_WIDTH"
          :height="CANVAS_HEIGHT"
          class="preview-canvas"
        />

        <!-- 勾配マップ (from=白, to=黒) -->
        <div class="gradient-map-container">
          <h3 class="gradient-map-title">Gradient Map (White → Black)</h3>
          <canvas
            ref="gradientMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="gradient-map-canvas"
          />
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

        <!-- グレイン設定 -->
        <div class="control-group">
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
              max="0.5"
              step="0.01"
              class="grain-slider"
            />
          </div>
        </div>

        <div class="control-group">
          <div class="stops-header">
            <label class="control-label">Color Stops</label>
            <button class="add-stop-button" @click="addStop">+ Add</button>
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

/* Gradient Map */
.gradient-map-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gradient-map-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #888;
}

.gradient-map-canvas {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
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

.type-buttons {
  display: flex;
  gap: 0.5rem;
}

.type-button {
  flex: 1;
  padding: 0.625rem 1rem;
  background: #2a2a4a;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  color: #ccc;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.type-button:hover {
  background: #3a3a5a;
}

.type-button.active {
  background: #4ecdc4;
  color: #1a1a2e;
  border-color: #4ecdc4;
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

.add-stop-button:hover {
  opacity: 0.85;
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
