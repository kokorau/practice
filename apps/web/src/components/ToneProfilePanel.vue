<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import type { ToneProfile, ToneProfileDetailed, ChannelCurve, ImageAnalysis } from '../modules/Filter/Domain'

const props = defineProps<{
  profile: ToneProfile | null
  detailedProfile: ToneProfileDetailed | null
  analysis: ImageAnalysis | null
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

// 表示モード: 'simple' = ガンマカーブ, 'cdf' = CDFカーブ
type ViewMode = 'simple' | 'cdf'
const viewMode = ref<ViewMode>('cdf')

// CDFカーブを描画
const drawCdfCurve = (ctx: CanvasRenderingContext2D, width: number, height: number, curve: ChannelCurve, color: string) => {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()

  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * width
    const y = height - (curve.cdf[i] ?? 0) * height

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()

  // コントロールポイントを描画
  ctx.fillStyle = color
  for (const point of curve.controlPoints) {
    const x = point.input * width
    const y = height - point.output * height
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 簡易カーブ（ガンマ）を描画
const drawSimpleCurve = (ctx: CanvasRenderingContext2D, width: number, height: number, curve: ChannelCurve, color: string) => {
  const { blackPoint, whitePoint, gamma } = curve.tone
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()

  for (let i = 0; i <= 255; i++) {
    const input = i / 255
    const gammaCorrected = Math.pow(input, gamma)
    const output = blackPoint / 255 + gammaCorrected * (whitePoint - blackPoint) / 255

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

// トーンカーブを描画
const drawToneCurve = () => {
  const canvas = curveCanvasRef.value
  if (!canvas || !props.detailedProfile) return

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
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(width, 0)
  ctx.stroke()
  ctx.setLineDash([])

  // 各チャンネルのカーブを描画
  const channels: { curve: ChannelCurve; color: string }[] = [
    { curve: props.detailedProfile.r, color: '#ef4444' },
    { curve: props.detailedProfile.g, color: '#22c55e' },
    { curve: props.detailedProfile.b, color: '#3b82f6' },
  ]

  for (const { curve, color } of channels) {
    if (viewMode.value === 'cdf') {
      drawCdfCurve(ctx, width, height, curve, color)
    } else {
      drawSimpleCurve(ctx, width, height, curve, color)
    }
  }
}

// プロファイル/モード変更時に再描画
watch(() => props.detailedProfile, drawToneCurve, { deep: true })
watch(viewMode, drawToneCurve)
watch(curveCanvasRef, drawToneCurve)

// パラメータフォーマット
const formatValue = (v: number, decimals: number = 0): string => {
  return v.toFixed(decimals)
}

// パーセント表示
const formatPercent = (v: number): string => {
  return (v * 100).toFixed(1) + '%'
}

// キーラベル
const keyLabel = (key: 'low' | 'normal' | 'high'): string => {
  const labels = { low: 'Low-key', normal: 'Normal', high: 'High-key' }
  return labels[key]
}
</script>

<template>
  <div class="space-y-2">
    <template v-if="detailedProfile && profile">
      <!-- 2カラムレイアウト: グラフ + パラメータ -->
      <div class="flex gap-3">
        <!-- 左: トーンカーブ -->
        <div class="flex-shrink-0">
          <canvas
            ref="curveCanvasRef"
            width="120"
            height="90"
            class="rounded bg-gray-800"
          />
          <!-- モード切替 -->
          <div class="flex gap-0.5 mt-1">
            <button
              v-for="mode in (['cdf', 'simple'] as const)"
              :key="mode"
              @click="viewMode = mode"
              :class="[
                'flex-1 px-1 py-0.5 text-[9px] rounded transition-colors',
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              ]"
            >
              {{ mode === 'cdf' ? 'CDF' : 'Gamma' }}
            </button>
          </div>
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

          <!-- コントロールポイント表示 -->
          <div class="text-[9px] text-gray-500 mb-2">
            {{ detailedProfile.r.controlPoints.length }} control points
          </div>

          <!-- ボタン -->
          <div class="flex gap-1 flex-wrap">
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

      <!-- 詳細解析結果 -->
      <template v-if="analysis">
        <div class="border-t border-gray-700 pt-2 mt-2">
          <!-- ダイナミックレンジ & キー -->
          <div class="grid grid-cols-2 gap-2 text-[10px] mb-2">
            <div>
              <div class="text-gray-500 mb-0.5">Dynamic Range</div>
              <div class="text-gray-300 font-mono">{{ analysis.dynamicRange.range }} ({{ formatValue(analysis.dynamicRange.contrastRatio, 1) }}:1)</div>
            </div>
            <div>
              <div class="text-gray-500 mb-0.5">Key</div>
              <div :class="[
                'font-mono',
                analysis.dynamicRange.key === 'low' ? 'text-blue-400' :
                analysis.dynamicRange.key === 'high' ? 'text-yellow-400' : 'text-gray-300'
              ]">
                {{ keyLabel(analysis.dynamicRange.key) }} ({{ formatPercent(analysis.dynamicRange.keyValue) }})
              </div>
            </div>
          </div>

          <!-- トーナルゾーン分布 -->
          <div class="mb-2">
            <div class="text-gray-500 text-[10px] mb-1">Tonal Zones</div>
            <div class="flex h-2 rounded overflow-hidden">
              <div
                class="bg-gray-600"
                :style="{ width: formatPercent(analysis.tonalZones.shadows.percentage) }"
                :title="`Shadows: ${formatPercent(analysis.tonalZones.shadows.percentage)}`"
              />
              <div
                class="bg-gray-400"
                :style="{ width: formatPercent(analysis.tonalZones.midtones.percentage) }"
                :title="`Midtones: ${formatPercent(analysis.tonalZones.midtones.percentage)}`"
              />
              <div
                class="bg-gray-200"
                :style="{ width: formatPercent(analysis.tonalZones.highlights.percentage) }"
                :title="`Highlights: ${formatPercent(analysis.tonalZones.highlights.percentage)}`"
              />
            </div>
            <div class="flex justify-between text-[9px] text-gray-500 mt-0.5">
              <span>S: {{ formatPercent(analysis.tonalZones.shadows.percentage) }}</span>
              <span>M: {{ formatPercent(analysis.tonalZones.midtones.percentage) }}</span>
              <span>H: {{ formatPercent(analysis.tonalZones.highlights.percentage) }}</span>
            </div>
          </div>

          <!-- 統計情報 -->
          <div class="grid grid-cols-3 gap-2 text-[10px] mb-2">
            <div>
              <div class="text-gray-500 mb-0.5">Mean</div>
              <div class="text-gray-300 font-mono">{{ formatValue(analysis.luminance.mean, 1) }}</div>
            </div>
            <div>
              <div class="text-gray-500 mb-0.5">Median</div>
              <div class="text-gray-300 font-mono">{{ formatValue(analysis.luminance.median) }}</div>
            </div>
            <div>
              <div class="text-gray-500 mb-0.5">StdDev</div>
              <div class="text-gray-300 font-mono">{{ formatValue(analysis.luminance.stdDev, 1) }}</div>
            </div>
          </div>

          <!-- 彩度 & クリッピング -->
          <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div class="text-gray-500 mb-0.5">Saturation</div>
              <div class="text-gray-300 font-mono">{{ formatPercent(analysis.saturation.mean) }}</div>
            </div>
            <div>
              <div class="text-gray-500 mb-0.5">Clipping</div>
              <div :class="[
                'font-mono',
                analysis.clipping.totalClippedPercent > 0.05 ? 'text-red-400' :
                analysis.clipping.totalClippedPercent > 0.01 ? 'text-yellow-400' : 'text-gray-300'
              ]">
                <span v-if="analysis.clipping.totalClippedPercent > 0">
                  B:{{ formatPercent(analysis.clipping.blackClippedPercent) }} W:{{ formatPercent(analysis.clipping.whiteClippedPercent) }}
                </span>
                <span v-else>None</span>
              </div>
            </div>
          </div>
        </div>
      </template>
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
