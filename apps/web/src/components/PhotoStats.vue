<script setup lang="ts">
import { computed } from 'vue'
import type { HistogramStats } from '../modules/Photo/Domain'

const props = defineProps<{
  stats: HistogramStats
}>()

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`
const formatValue = (value: number) => value.toFixed(1)

// Distribution を正規化して合計100%になるようにする
const normalizedDistribution = computed(() => {
  const { shadows, midtones, highlights } = props.stats.luminance
  const total = shadows + midtones + highlights
  if (total === 0) return { shadows: 33.3, midtones: 33.3, highlights: 33.4 }
  return {
    shadows: (shadows / total) * 100,
    midtones: (midtones / total) * 100,
    highlights: (highlights / total) * 100,
  }
})

const hasClipping = computed(() =>
  props.stats.luminance.clippedBlack > 0.01 || props.stats.luminance.clippedWhite > 0.01
)
</script>

<template>
  <div class="text-xs">
    <!-- Luminance Overview -->
    <div class="mb-3">
      <div class="flex items-center justify-between mb-1">
        <span class="text-gray-400">輝度</span>
        <span class="text-gray-300 tabular-nums">{{ formatValue(stats.luminance.mean) }}</span>
      </div>
      <!-- Distribution Bar -->
      <div class="h-3 flex rounded overflow-hidden bg-gray-900">
        <div
          class="bg-gray-700 transition-all"
          :style="{ flexBasis: `${normalizedDistribution.shadows}%` }"
          :title="`Shadows: ${formatPercent(stats.luminance.shadows)}`"
        />
        <div
          class="bg-gray-500 transition-all"
          :style="{ flexBasis: `${normalizedDistribution.midtones}%` }"
          :title="`Midtones: ${formatPercent(stats.luminance.midtones)}`"
        />
        <div
          class="bg-gray-300 transition-all"
          :style="{ flexBasis: `${normalizedDistribution.highlights}%` }"
          :title="`Highlights: ${formatPercent(stats.luminance.highlights)}`"
        />
      </div>
      <div class="flex justify-between text-gray-500 mt-0.5" style="font-size: 10px;">
        <span>S</span>
        <span>M</span>
        <span>H</span>
      </div>
    </div>

    <!-- RGB Details -->
    <div class="space-y-0.5 mb-2">
      <div class="flex items-center gap-1">
        <span class="w-2 h-2 bg-red-500 rounded-sm flex-shrink-0" />
        <span class="text-gray-500 w-4">R</span>
        <span class="text-gray-300 tabular-nums">{{ formatValue(stats.r.mean) }}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="w-2 h-2 bg-green-500 rounded-sm flex-shrink-0" />
        <span class="text-gray-500 w-4">G</span>
        <span class="text-gray-300 tabular-nums">{{ formatValue(stats.g.mean) }}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="w-2 h-2 bg-blue-500 rounded-sm flex-shrink-0" />
        <span class="text-gray-500 w-4">B</span>
        <span class="text-gray-300 tabular-nums">{{ formatValue(stats.b.mean) }}</span>
      </div>
    </div>

    <!-- Clipping -->
    <div style="font-size: 10px;">
      <span v-if="stats.luminance.clippedBlack > 0.01" class="text-yellow-500">⚠黒潰れ{{ formatPercent(stats.luminance.clippedBlack) }}</span>
      <span v-if="stats.luminance.clippedBlack > 0.01 && stats.luminance.clippedWhite > 0.01" class="text-gray-600"> / </span>
      <span v-if="stats.luminance.clippedWhite > 0.01" class="text-yellow-500">⚠白飛び{{ formatPercent(stats.luminance.clippedWhite) }}</span>
      <span v-if="!hasClipping" class="text-gray-600">クリッピングなし</span>
    </div>
  </div>
</template>
