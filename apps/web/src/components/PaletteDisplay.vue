<script setup lang="ts">
import { computed } from 'vue'
import { $Palette, type Palette } from '../modules/Palette/Domain'

const props = defineProps<{
  original: Palette | null
  filtered?: Palette | null
}>()

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const originalHexColors = computed(() => {
  if (!props.original) return []
  return $Palette.toHexArray(props.original)
})

const filteredHexColors = computed(() => {
  if (!props.filtered) return []
  return $Palette.toHexArray(props.filtered)
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
      <div class="h-5 flex rounded overflow-hidden bg-gray-900 flex-1">
        <div
          v-for="(hex, i) in originalHexColors"
          :key="i"
          class="transition-all"
          :style="{
            flexBasis: `${normalizedOriginalWeights[i]}%`,
            backgroundColor: hex
          }"
          :title="`${hex}: ${formatPercent(original.colors[i]?.weight ?? 0)}`"
        />
      </div>
    </div>

    <!-- After -->
    <div v-if="filtered" class="flex items-center gap-2">
      <span class="text-gray-500 w-8 flex-shrink-0">Aft</span>
      <div class="h-5 flex rounded overflow-hidden bg-gray-900 flex-1">
        <div
          v-for="(hex, i) in filteredHexColors"
          :key="i"
          class="transition-all"
          :style="{
            flexBasis: `${normalizedFilteredWeights[i]}%`,
            backgroundColor: hex
          }"
          :title="`${hex}: ${formatPercent(filtered.colors[i]?.weight ?? 0)}`"
        />
      </div>
    </div>
  </div>
  <div v-else class="text-xs text-gray-500">
    No palette
  </div>
</template>
