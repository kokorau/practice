<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import type { LuminanceProfile, CurveFitType } from '../modules/Filter/Domain'

const props = defineProps<{
  profile: LuminanceProfile | null
  fitType: CurveFitType
  extractionTime: number
  isExtracting: boolean
}>()

const emit = defineEmits<{
  'update:fitType': [CurveFitType]
}>()

// CDF カーブ描画用 canvas
const curveCanvasRef: Ref<HTMLCanvasElement | null> = ref(null)

// 利用可能なフィットタイプ
const fitTypes: { value: CurveFitType; label: string }[] = [
  { value: 'polynomial', label: 'Poly' },
  { value: 'spline', label: 'Spline' },
  { value: 'simple', label: 'Simple' },
  { value: 'raw', label: 'Raw' },
]

// CDF カーブを描画
const drawCurve = () => {
  const canvas = curveCanvasRef.value
  if (!canvas || !props.profile) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  const { cdf, controlPoints } = props.profile

  // 背景クリア
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, width, height)

  // グリッド
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    const x = (width * i) / 4
    const y = (height * i) / 4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // 対角線（リニア参照）
  ctx.strokeStyle = '#4b5563'
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(width, 0)
  ctx.stroke()
  ctx.setLineDash([])

  // CDF カーブ
  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1.5
  ctx.beginPath()

  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * width
    const y = height - (cdf[i] ?? 0) * height

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()

  // コントロールポイント
  ctx.fillStyle = '#60a5fa'
  for (const point of controlPoints) {
    const x = point.input * width
    const y = height - point.output * height
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// プロファイル変更時に再描画
watch(() => props.profile, drawCurve, { deep: true })
watch(curveCanvasRef, drawCurve)

// フォーマット
const formatValue = (v: number, decimals: number = 0): string => v.toFixed(decimals)
</script>

<template>
  <div class="space-y-2">
    <template v-if="profile">
      <!-- 2カラム: グラフ + パラメータ -->
      <div class="flex gap-3">
        <!-- 左: CDF カーブ -->
        <div class="flex-shrink-0">
          <canvas
            ref="curveCanvasRef"
            width="120"
            height="90"
            class="rounded bg-gray-800"
          />
          <!-- フィットタイプ選択 -->
          <div class="flex gap-0.5 mt-1">
            <button
              v-for="ft in fitTypes"
              :key="ft.value"
              @click="emit('update:fitType', ft.value)"
              :class="[
                'flex-1 px-0.5 py-0.5 text-[8px] rounded transition-colors',
                fitType === ft.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              ]"
            >
              {{ ft.label }}
            </button>
          </div>
        </div>

        <!-- 右: パラメータ -->
        <div class="flex-1 min-w-0">
          <!-- パラメータ表示 -->
          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
            <div>
              <span class="text-gray-500">Black</span>
              <span class="text-gray-300 font-mono ml-1">{{ formatValue(profile.blackPoint) }}</span>
            </div>
            <div>
              <span class="text-gray-500">White</span>
              <span class="text-gray-300 font-mono ml-1">{{ formatValue(profile.whitePoint) }}</span>
            </div>
            <div>
              <span class="text-gray-500">Gamma</span>
              <span class="text-gray-300 font-mono ml-1">{{ formatValue(profile.gamma, 2) }}</span>
            </div>
            <div>
              <span class="text-gray-500">Mean L</span>
              <span class="text-gray-300 font-mono ml-1">{{ formatValue(profile.meanLuminance) }}</span>
            </div>
          </div>

          <!-- コントロールポイント数 & 処理時間 -->
          <div class="text-[9px] text-gray-500">
            {{ profile.controlPoints.length }} control points
            <span class="ml-2 text-gray-600">{{ extractionTime }}ms</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 抽出中 -->
    <div v-else-if="isExtracting" class="text-[10px] text-gray-500">
      Extracting luminance profile...
    </div>

    <!-- 画像なし -->
    <div v-else class="text-[10px] text-gray-500">
      No image loaded
    </div>
  </div>
</template>
