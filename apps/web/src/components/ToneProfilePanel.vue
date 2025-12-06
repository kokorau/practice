<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import type { ToneProfile, ChannelTone } from '../modules/Filter/Domain'

const props = defineProps<{
  profile: ToneProfile | null
  isExtracting: boolean
}>()

const emit = defineEmits<{
  extract: []
  reset: []
  applyLut: []
  applyInverseLut: []
}>()

// トーンカーブ描画用 canvas
const curveCanvasRef: Ref<HTMLCanvasElement | null> = ref(null)

// チャンネルカーブを描画
const drawToneCurve = () => {
  const canvas = curveCanvasRef.value
  if (!canvas || !props.profile) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas

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
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(width, 0)
  ctx.stroke()
  ctx.setLineDash([])

  // 各チャンネルのカーブを描画
  const channels: { tone: ChannelTone; color: string }[] = [
    { tone: props.profile.r, color: '#ef4444' },
    { tone: props.profile.g, color: '#22c55e' },
    { tone: props.profile.b, color: '#3b82f6' },
  ]

  for (const { tone, color } of channels) {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i <= 255; i++) {
      const input = i / 255
      // ガンマ適用
      const gammaCorrected = Math.pow(input, tone.gamma)
      // 黒点・白点スケーリング
      const output = tone.blackPoint / 255 + gammaCorrected * (tone.whitePoint - tone.blackPoint) / 255

      const x = (i / 255) * width
      const y = height - output * height

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }
}

// プロファイル変更時に再描画
watch(() => props.profile, drawToneCurve, { immediate: true })
watch(curveCanvasRef, drawToneCurve)

// パラメータフォーマット
const formatValue = (v: number, decimals: number = 0): string => {
  return v.toFixed(decimals)
}
</script>

<template>
  <div class="space-y-2">
    <template v-if="profile">
      <!-- 2カラムレイアウト: グラフ + パラメータ -->
      <div class="flex gap-3">
        <!-- 左: トーンカーブ（コンパクト） -->
        <div class="flex-shrink-0">
          <canvas
            ref="curveCanvasRef"
            width="100"
            height="80"
            class="rounded bg-gray-800"
          />
        </div>

        <!-- 右: パラメータ + ボタン -->
        <div class="flex-1 min-w-0">
          <!-- パラメータ表示（コンパクト） -->
          <div class="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[10px] mb-2">
            <div></div>
            <div class="text-gray-500">Blk</div>
            <div class="text-gray-500">Wht</div>
            <div class="text-gray-500">γ</div>

            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <span class="text-gray-500">R</span>
            </div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.r.blackPoint) }}</div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.r.whitePoint) }}</div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.r.gamma, 2) }}</div>

            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span class="text-gray-500">G</span>
            </div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.g.blackPoint) }}</div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.g.whitePoint) }}</div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.g.gamma, 2) }}</div>

            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span class="text-gray-500">B</span>
            </div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.b.blackPoint) }}</div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.b.whitePoint) }}</div>
            <div class="text-gray-300 font-mono">{{ formatValue(profile.b.gamma, 2) }}</div>
          </div>

          <!-- ボタン -->
          <div class="flex gap-1">
            <button
              @click="emit('applyLut')"
              class="px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 rounded"
            >
              Apply
            </button>
            <button
              @click="emit('applyInverseLut')"
              class="px-2 py-1 text-[10px] bg-teal-600 hover:bg-teal-700 rounded"
            >
              Inverse
            </button>
            <button
              @click="emit('extract')"
              :disabled="isExtracting"
              class="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
            >
              {{ isExtracting ? '...' : 'Re-extract' }}
            </button>
            <button
              @click="emit('reset')"
              class="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 未抽出状態 -->
    <div v-else class="flex items-center gap-2">
      <button
        @click="emit('extract')"
        :disabled="isExtracting"
        class="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium"
      >
        {{ isExtracting ? 'Extracting...' : 'Extract Profile' }}
      </button>
      <span class="text-[10px] text-gray-500">Analyze image tone curve</span>
    </div>
  </div>
</template>
