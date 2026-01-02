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
const grainThreshold = ref(0.5) // 0-1 閾値
const grainSeed = ref(12345) // シード値

// シード付き乱数生成器 (Mulberry32)
const createSeededRandom = (seed: number) => {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// マップビューの切り替え
type MapViewType = 'gradient' | 'grain' | 'gradientGrain' | 'blueNoise' | 'blueNoiseBlur' | 'blueNoiseCluster' | 'bnGradientGrain'
const activeMapView = ref<MapViewType>('gradient')

// Canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gradientMapRef = ref<HTMLCanvasElement | null>(null)
const grainMapRef = ref<HTMLCanvasElement | null>(null)
const gradientGrainMapRef = ref<HTMLCanvasElement | null>(null)
const blueNoiseMapRef = ref<HTMLCanvasElement | null>(null)
const blueNoiseBlurMapRef = ref<HTMLCanvasElement | null>(null)
const blueNoiseClusterMapRef = ref<HTMLCanvasElement | null>(null)
const bnGradientGrainMapRef = ref<HTMLCanvasElement | null>(null)
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

// グレインマップを描画（閾値で0/1に二値化）
const drawGrainMap = () => {
  const mapCanvas = grainMapRef.value
  if (!mapCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  if (!mapCtx) return

  const width = mapCanvas.width
  const height = mapCanvas.height

  // 黒背景
  mapCtx.fillStyle = '#000000'
  mapCtx.fillRect(0, 0, width, height)

  if (!grainEnabled.value || grainIntensity.value <= 0) return

  const random = createSeededRandom(grainSeed.value)
  const imageData = mapCtx.getImageData(0, 0, width, height)
  const data = imageData.data
  const threshold = grainThreshold.value

  for (let i = 0; i < data.length; i += 4) {
    // ランダム値が閾値を超えたら白、そうでなければ黒
    const gray = random() < threshold ? 255 : 0
    data[i] = gray     // R
    data[i + 1] = gray // G
    data[i + 2] = gray // B
  }

  mapCtx.putImageData(imageData, 0, 0)
}

// グラデーショングレインマップを描画（勾配を閾値として使用）
const drawGradientGrainMap = () => {
  const mapCanvas = gradientGrainMapRef.value
  const gradientCanvas = gradientMapRef.value
  if (!mapCanvas || !gradientCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  const gradientCtx = gradientCanvas.getContext('2d')
  if (!mapCtx || !gradientCtx) return

  const width = mapCanvas.width
  const height = mapCanvas.height

  // 黒背景
  mapCtx.fillStyle = '#000000'
  mapCtx.fillRect(0, 0, width, height)

  if (!grainEnabled.value || grainIntensity.value <= 0) return

  const random = createSeededRandom(grainSeed.value + 1)
  // 勾配マップのデータを取得
  const gradientData = gradientCtx.getImageData(0, 0, width, height).data
  const imageData = mapCtx.getImageData(0, 0, width, height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    // 勾配マップの値を閾値として使用 (0-255 → 0-1)
    const gradientValue = gradientData[i] / 255
    // ランダム値が勾配閾値未満なら白
    const gray = random() < gradientValue ? 255 : 0
    data[i] = gray     // R
    data[i + 1] = gray // G
    data[i + 2] = gray // B
  }

  mapCtx.putImageData(imageData, 0, 0)
}

// ポアソンディスクサンプリングでブルーノイズを生成
const poissonDiskSampling = (
  width: number,
  height: number,
  minDist: number,
  random: () => number,
  maxAttempts: number = 30
): Array<{ x: number; y: number }> => {
  const cellSize = minDist / Math.SQRT2
  const gridWidth = Math.ceil(width / cellSize)
  const gridHeight = Math.ceil(height / cellSize)
  const grid: Array<{ x: number; y: number } | null> = new Array(gridWidth * gridHeight).fill(null)
  const points: Array<{ x: number; y: number }> = []
  const activeList: Array<{ x: number; y: number }> = []

  const getGridIndex = (x: number, y: number) => {
    const gx = Math.floor(x / cellSize)
    const gy = Math.floor(y / cellSize)
    return gy * gridWidth + gx
  }

  const isValidPoint = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false

    const gx = Math.floor(x / cellSize)
    const gy = Math.floor(y / cellSize)

    // 周囲のセルをチェック
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx
        const ny = gy + dy
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
          const neighbor = grid[ny * gridWidth + nx]
          if (neighbor) {
            const distSq = (x - neighbor.x) ** 2 + (y - neighbor.y) ** 2
            if (distSq < minDist * minDist) return false
          }
        }
      }
    }
    return true
  }

  // 最初の点をランダムに配置
  const firstPoint = { x: random() * width, y: random() * height }
  points.push(firstPoint)
  activeList.push(firstPoint)
  grid[getGridIndex(firstPoint.x, firstPoint.y)] = firstPoint

  while (activeList.length > 0) {
    const idx = Math.floor(random() * activeList.length)
    const point = activeList[idx]
    let found = false

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = random() * Math.PI * 2
      const dist = minDist + random() * minDist
      const newX = point.x + Math.cos(angle) * dist
      const newY = point.y + Math.sin(angle) * dist

      if (isValidPoint(newX, newY)) {
        const newPoint = { x: newX, y: newY }
        points.push(newPoint)
        activeList.push(newPoint)
        grid[getGridIndex(newX, newY)] = newPoint
        found = true
        break
      }
    }

    if (!found) {
      activeList.splice(idx, 1)
    }
  }

  return points
}

// ブルーノイズマップを描画
const drawBlueNoiseMap = () => {
  const mapCanvas = blueNoiseMapRef.value
  if (!mapCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  if (!mapCtx) return

  const width = mapCanvas.width
  const height = mapCanvas.height

  // 黒背景
  mapCtx.fillStyle = '#000000'
  mapCtx.fillRect(0, 0, width, height)

  if (!grainEnabled.value || grainIntensity.value <= 0) return

  // 閾値に基づいて点の密度を調整（minDistを変える）
  // threshold が高いほど点が多い = minDist が小さい
  const baseMinDist = 20
  const minDist = baseMinDist * (1.5 - grainThreshold.value)

  const random = createSeededRandom(grainSeed.value + 2)
  const points = poissonDiskSampling(width, height, minDist, random)

  // 点を白で描画
  mapCtx.fillStyle = '#ffffff'
  for (const point of points) {
    mapCtx.beginPath()
    mapCtx.arc(point.x, point.y, 1.5, 0, Math.PI * 2)
    mapCtx.fill()
  }
}

// ブルーノイズブラーマップを描画（各点から放射状にフェードアウト）
const drawBlueNoiseBlurMap = () => {
  const mapCanvas = blueNoiseBlurMapRef.value
  if (!mapCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  if (!mapCtx) return

  const width = mapCanvas.width
  const height = mapCanvas.height

  // 黒背景
  mapCtx.fillStyle = '#000000'
  mapCtx.fillRect(0, 0, width, height)

  if (!grainEnabled.value || grainIntensity.value <= 0) return

  // 閾値に基づいて点の密度を調整
  const baseMinDist = 20
  const minDist = baseMinDist * (1.5 - grainThreshold.value)

  const random = createSeededRandom(grainSeed.value + 2)
  const points = poissonDiskSampling(width, height, minDist, random)

  // ガウシアンフォールオフ関数
  const gaussian = (dist: number, sigma: number) => Math.exp(-(dist * dist) / (2 * sigma * sigma))

  const imageData = mapCtx.getImageData(0, 0, width, height)
  const data = imageData.data
  const sigma = minDist * 0.4  // ガウシアンの広がり

  // 各ピクセルで近くの点からの影響を計算
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalInfluence = 0

      // 近くの点からの影響を合算
      for (const point of points) {
        const dx = x - point.x
        const dy = y - point.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // 遠すぎる点はスキップ（最適化）
        if (dist > sigma * 4) continue

        totalInfluence += gaussian(dist, sigma)
      }

      // 影響を0-1にクランプして明るさに変換
      const brightness = Math.min(1, totalInfluence) * 255

      const i = (y * width + x) * 4
      data[i] = brightness     // R
      data[i + 1] = brightness // G
      data[i + 2] = brightness // B
    }
  }

  mapCtx.putImageData(imageData, 0, 0)
}

// ブルーノイズクラスターマップを描画（BN Blurを閾値として細かいノイズを二値化）
const drawBlueNoiseClusterMap = () => {
  const mapCanvas = blueNoiseClusterMapRef.value
  const blurCanvas = blueNoiseBlurMapRef.value
  if (!mapCanvas || !blurCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  const blurCtx = blurCanvas.getContext('2d')
  if (!mapCtx || !blurCtx) return

  const width = mapCanvas.width
  const height = mapCanvas.height

  // 黒背景
  mapCtx.fillStyle = '#000000'
  mapCtx.fillRect(0, 0, width, height)

  if (!grainEnabled.value || grainIntensity.value <= 0) return

  const random = createSeededRandom(grainSeed.value + 3)
  // BN Blur マップのデータを取得（閾値マップとして使用）
  const blurData = blurCtx.getImageData(0, 0, width, height).data
  const imageData = mapCtx.getImageData(0, 0, width, height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    // BN Blur の値を閾値として使用 (0-255 → 0.35-0.65)
    const normalized = blurData[i] / 255
    const threshold = 0.35 + normalized * 0.3    // 0.35 ~ 0.65
    // ランダム値が閾値未満なら白
    const gray = random() < threshold ? 255 : 0
    data[i] = gray     // R
    data[i + 1] = gray // G
    data[i + 2] = gray // B
  }

  mapCtx.putImageData(imageData, 0, 0)
}

// BN Gradient Grain マップを描画（1つのBNを勾配値で LR/RL に排他的に振り分け）
const drawBnGradientGrainMap = () => {
  const mapCanvas = bnGradientGrainMapRef.value
  const gradientCanvas = gradientMapRef.value
  if (!mapCanvas || !gradientCanvas) return

  const mapCtx = mapCanvas.getContext('2d')
  const gradientCtx = gradientCanvas.getContext('2d')
  if (!mapCtx || !gradientCtx) return

  const width = mapCanvas.width
  const height = mapCanvas.height

  // 黒背景
  mapCtx.fillStyle = '#000000'
  mapCtx.fillRect(0, 0, width, height)

  if (!grainEnabled.value || grainIntensity.value <= 0) return

  // 細かいブルーノイズを生成
  const random = createSeededRandom(grainSeed.value + 4)
  const minDist = 2  // 細かいブルーノイズ
  const points = poissonDiskSampling(width, height, minDist, random)

  // 勾配マップのデータを取得
  const gradientData = gradientCtx.getImageData(0, 0, width, height).data

  // 勾配の範囲設定（始点・終点）
  const gradientStart = 0.8  // LR が 100% になる位置
  const gradientEnd = 0.2    // RL が 100% になる位置
  const range = gradientStart - gradientEnd  // 0.6

  // 各点をランダムに LR/RL に振り分け、勾配値で確率的にフィルタリング
  for (const point of points) {
    const x = Math.floor(point.x)
    const y = Math.floor(point.y)
    const i = (y * width + x) * 4
    const gradientValue = gradientData[i] / 255

    // 勾配値を 0.2-0.8 の範囲で正規化
    const normalizedLR = Math.max(0, Math.min(1, (gradientValue - gradientEnd) / range))
    const normalizedRL = 1 - normalizedLR

    // 50%でLR、50%でRLに振り分け
    const isLR = random() < 0.5

    if (isLR) {
      // LR: 勾配が白いほど表示確率が高い
      if (random() < normalizedLR) {
        mapCtx.fillStyle = '#ffffff'  // LR = 白
        mapCtx.fillRect(x, y, 1, 1)
      }
    } else {
      // RL: 勾配が黒いほど表示確率が高い
      if (random() < normalizedRL) {
        mapCtx.fillStyle = '#888888'  // RL = グレー（区別用）
        mapCtx.fillRect(x, y, 1, 1)
      }
    }
  }
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

// HEX色をRGBに変換
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

// BN Gradient Grain をプレビューに適用
const applyBnGradientGrain = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradientCanvas = gradientMapRef.value
  if (!gradientCanvas) return

  const gradientCtx = gradientCanvas.getContext('2d')
  if (!gradientCtx) return

  // 細かいブルーノイズを生成
  const random = createSeededRandom(grainSeed.value + 5)
  const minDist = 3
  const points = poissonDiskSampling(width, height, minDist, random)

  // 勾配マップのデータを取得
  const gradientData = gradientCtx.getImageData(0, 0, width, height).data

  // 色停止点から開始色と終了色を取得
  const sortedStops = [...stops.value].sort((a, b) => a.position - b.position)
  const colorA = hexToRgb(sortedStops[0]?.color || '#ffffff')
  const colorB = hexToRgb(sortedStops[sortedStops.length - 1]?.color || '#000000')

  // 勾配の範囲設定（始点・終点）
  const gradientStart = 0.8  // LR が 100% になる位置
  const gradientEnd = 0.2    // RL が 100% になる位置
  const range = gradientStart - gradientEnd  // 0.6

  // プレビューキャンバスから現在のグラデーション色を取得
  const canvasData = ctx.getImageData(0, 0, width, height).data

  // 各点をランダムに LR/RL に振り分け、勾配値で確率的にフィルタリング
  for (const point of points) {
    const x = Math.floor(point.x)
    const y = Math.floor(point.y)
    const i = (y * width + x) * 4
    const gradientValue = gradientData[i] / 255

    // 勾配値を 0.2-0.8 の範囲で正規化
    const normalizedLR = Math.max(0, Math.min(1, (gradientValue - gradientEnd) / range))
    const normalizedRL = 1 - normalizedLR

    // その位置のグラデーション色を取得
    const bgR = canvasData[i]
    const bgG = canvasData[i + 1]
    const bgB = canvasData[i + 2]

    // 50%でLR、50%でRLに振り分け
    const isLR = random() < 0.5

    if (isLR) {
      // LR: 勾配が白いほど表示確率が高い
      if (random() < normalizedLR) {
        // normalizedLR が高いほど純粋なColorA、低いほどグラデーション色に馴染む
        const blend = normalizedLR
        const r = Math.round(colorA.r * blend + bgR * (1 - blend))
        const g = Math.round(colorA.g * blend + bgG * (1 - blend))
        const b = Math.round(colorA.b * blend + bgB * (1 - blend))
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, y, 1, 1)
      }
    } else {
      // RL: 勾配が黒いほど表示確率が高い
      if (random() < normalizedRL) {
        // normalizedRL が高いほど純粋なColorB、低いほどグラデーション色に馴染む
        const blend = normalizedRL
        const r = Math.round(colorB.r * blend + bgR * (1 - blend))
        const g = Math.round(colorB.g * blend + bgG * (1 - blend))
        const b = Math.round(colorB.b * blend + bgB * (1 - blend))
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
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

  // 勾配マップを先に描画（applyBnGradientGrain で参照するため）
  drawGradientMap()

  // BN Gradient Grain を適用
  if (grainEnabled.value && grainIntensity.value > 0) {
    applyBnGradientGrain(ctx, canvas.width, canvas.height)
  }

  // 他のマップを更新
  drawGrainMap()
  drawGradientGrainMap()
  drawBlueNoiseMap()
  drawBlueNoiseBlurMap()
  drawBlueNoiseClusterMap()
  drawBnGradientGrainMap()
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
watch([stops, angle, grainIntensity, grainEnabled, grainThreshold, grainSeed], drawGradient, { deep: true })

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

        <!-- マップビュー切り替え -->
        <div class="map-view-container">
          <div class="map-view-tabs">
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'gradient' }"
              @click="activeMapView = 'gradient'"
            >
              Gradient
            </button>
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'grain' }"
              @click="activeMapView = 'grain'"
            >
              Grain
            </button>
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'gradientGrain' }"
              @click="activeMapView = 'gradientGrain'"
            >
              Gradient Grain
            </button>
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'blueNoise' }"
              @click="activeMapView = 'blueNoise'"
            >
              Blue Noise
            </button>
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'blueNoiseBlur' }"
              @click="activeMapView = 'blueNoiseBlur'"
            >
              BN Blur
            </button>
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'blueNoiseCluster' }"
              @click="activeMapView = 'blueNoiseCluster'"
            >
              BN Cluster
            </button>
            <button
              class="map-tab"
              :class="{ active: activeMapView === 'bnGradientGrain' }"
              @click="activeMapView = 'bnGradientGrain'"
            >
              BN Grad
            </button>
          </div>

          <!-- 勾配マップ (from=白, to=黒) -->
          <canvas
            v-show="activeMapView === 'gradient'"
            ref="gradientMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
          />

          <!-- グレインマップ -->
          <canvas
            v-show="activeMapView === 'grain'"
            ref="grainMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
          />

          <!-- グラデーショングレインマップ -->
          <canvas
            v-show="activeMapView === 'gradientGrain'"
            ref="gradientGrainMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
          />

          <!-- ブルーノイズマップ -->
          <canvas
            v-show="activeMapView === 'blueNoise'"
            ref="blueNoiseMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
          />

          <!-- ブルーノイズブラーマップ -->
          <canvas
            v-show="activeMapView === 'blueNoiseBlur'"
            ref="blueNoiseBlurMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
          />

          <!-- ブルーノイズクラスターマップ -->
          <canvas
            v-show="activeMapView === 'blueNoiseCluster'"
            ref="blueNoiseClusterMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
          />

          <!-- BN Gradient Grain マップ -->
          <canvas
            v-show="activeMapView === 'bnGradientGrain'"
            ref="bnGradientGrainMapRef"
            :width="CANVAS_WIDTH"
            :height="CANVAS_HEIGHT"
            class="map-canvas"
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
            <label class="control-label-small">Threshold: {{ Math.round(grainThreshold * 100) }}%</label>
            <input
              v-model.number="grainThreshold"
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

/* Map View */
.map-view-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.map-view-tabs {
  display: flex;
  gap: 0.5rem;
}

.map-tab {
  flex: 1;
  padding: 0.5rem 1rem;
  background: #2a2a4a;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  color: #888;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.map-tab:hover {
  background: #3a3a5a;
  color: #aaa;
}

.map-tab.active {
  background: #3a3a5a;
  border-color: #4ecdc4;
  color: #4ecdc4;
}

.map-canvas {
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
