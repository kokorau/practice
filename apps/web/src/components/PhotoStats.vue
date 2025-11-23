<script setup lang="ts">
import type { HistogramStats } from '../modules/Photo/Domain'

defineProps<{
  stats: HistogramStats
}>()

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`
const formatValue = (value: number) => value.toFixed(1)
</script>

<template>
  <div class="text-sm">
    <!-- Luminance Overview -->
    <div class="mb-4">
      <h3 class="text-gray-400 mb-2">輝度</h3>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <span class="text-gray-500">平均:</span>
          <span class="ml-2">{{ formatValue(stats.luminance.mean) }}</span>
        </div>
      </div>
      <!-- Distribution Bar -->
      <div class="mt-2 h-4 flex rounded overflow-hidden">
        <div
          class="bg-gray-700"
          :style="{ width: formatPercent(stats.luminance.shadows) }"
          :title="`Shadows: ${formatPercent(stats.luminance.shadows)}`"
        />
        <div
          class="bg-gray-500"
          :style="{ width: formatPercent(stats.luminance.midtones) }"
          :title="`Midtones: ${formatPercent(stats.luminance.midtones)}`"
        />
        <div
          class="bg-gray-300"
          :style="{ width: formatPercent(stats.luminance.highlights) }"
          :title="`Highlights: ${formatPercent(stats.luminance.highlights)}`"
        />
      </div>
      <div class="flex justify-between text-xs text-gray-500 mt-1">
        <span>シャドウ</span>
        <span>中間</span>
        <span>ハイライト</span>
      </div>
    </div>

    <!-- Clipping Warning -->
    <div v-if="stats.luminance.clippedBlack > 0.01 || stats.luminance.clippedWhite > 0.01" class="mb-4">
      <h3 class="text-gray-400 mb-2">クリッピング警告</h3>
      <div class="space-y-1">
        <div v-if="stats.luminance.clippedBlack > 0.01" class="text-yellow-500">
          ⚠ 黒潰れ: {{ formatPercent(stats.luminance.clippedBlack) }}
        </div>
        <div v-if="stats.luminance.clippedWhite > 0.01" class="text-yellow-500">
          ⚠ 白飛び: {{ formatPercent(stats.luminance.clippedWhite) }}
        </div>
      </div>
    </div>

    <!-- RGB Details -->
    <div>
      <h3 class="text-gray-400 mb-2">RGB平均</h3>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-red-500 rounded" />
          <span class="w-8">R:</span>
          <span>{{ formatValue(stats.r.mean) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-green-500 rounded" />
          <span class="w-8">G:</span>
          <span>{{ formatValue(stats.g.mean) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-blue-500 rounded" />
          <span class="w-8">B:</span>
          <span>{{ formatValue(stats.b.mean) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
