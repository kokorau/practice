<script setup lang="ts">
import { computed } from 'vue'
import { type ProfiledPalette, type ColorRole } from '../modules/Palette/Domain'
import { $Hex } from '../modules/Color/Domain'

const props = defineProps<{
  original: ProfiledPalette | null
  filtered?: ProfiledPalette | null
}>()

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const roleLabel = (role: ColorRole): string => {
  switch (role) {
    case 'background': return 'B'
    case 'text': return 'T'
    case 'accent': return 'A'
    default: return ''
  }
}

const roleColor = (role: ColorRole): string => {
  switch (role) {
    case 'background': return 'text-blue-400'
    case 'text': return 'text-green-400'
    case 'accent': return 'text-yellow-400'
    default: return 'text-gray-500'
  }
}

const originalColors = computed(() => {
  if (!props.original) return []
  return props.original.colors.map((c) => ({
    hex: $Hex.fromSrgb(c.color),
    weight: c.weight,
    role: c.role,
    confidence: c.confidence,
  }))
})

const filteredColors = computed(() => {
  if (!props.filtered) return []
  return props.filtered.colors.map((c) => ({
    hex: $Hex.fromSrgb(c.color),
    weight: c.weight,
    role: c.role,
    confidence: c.confidence,
  }))
})

const normalizedOriginalWeights = computed(() => {
  if (!props.original) return []
  const total = props.original.colors.reduce((sum, c) => sum + c.weight, 0)
  if (total === 0) return props.original.colors.map(() => 25)
  return props.original.colors.map((c) => (c.weight / total) * 100)
})

const normalizedFilteredWeights = computed(() => {
  if (!props.filtered) return []
  const total = props.filtered.colors.reduce((sum, c) => sum + c.weight, 0)
  if (total === 0) return props.filtered.colors.map(() => 25)
  return props.filtered.colors.map((c) => (c.weight / total) * 100)
})
</script>

<template>
  <div v-if="original" class="text-xs space-y-2">
    <!-- Before -->
    <div class="flex items-center gap-2">
      <span class="text-gray-500 w-8 flex-shrink-0">Bfr</span>
      <div class="h-6 flex rounded overflow-hidden bg-gray-900 flex-1">
        <div
          v-for="(color, i) in originalColors"
          :key="i"
          class="transition-all relative group"
          :style="{
            flexBasis: `${normalizedOriginalWeights[i]}%`,
            backgroundColor: color.hex
          }"
          :title="`${color.hex}: ${formatPercent(color.weight)} (${color.role})`"
        >
          <span
            v-if="color.role !== 'unknown'"
            :class="[
              'absolute bottom-0 left-1 text-[9px] font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]',
              roleColor(color.role)
            ]"
          >
            {{ roleLabel(color.role) }}
          </span>
        </div>
      </div>
    </div>

    <!-- After -->
    <div v-if="filtered" class="flex items-center gap-2">
      <span class="text-gray-500 w-8 flex-shrink-0">Aft</span>
      <div class="h-6 flex rounded overflow-hidden bg-gray-900 flex-1">
        <div
          v-for="(color, i) in filteredColors"
          :key="i"
          class="transition-all relative group"
          :style="{
            flexBasis: `${normalizedFilteredWeights[i]}%`,
            backgroundColor: color.hex
          }"
          :title="`${color.hex}: ${formatPercent(color.weight)} (${color.role})`"
        >
          <span
            v-if="color.role !== 'unknown'"
            :class="[
              'absolute bottom-0 left-1 text-[9px] font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]',
              roleColor(color.role)
            ]"
          >
            {{ roleLabel(color.role) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-3 text-[10px] text-gray-500">
      <span><span class="text-blue-400">B</span>=Background</span>
      <span><span class="text-green-400">T</span>=Text</span>
      <span><span class="text-yellow-400">A</span>=Accent</span>
    </div>
  </div>
  <div v-else class="text-xs text-gray-500">
    No palette
  </div>
</template>
