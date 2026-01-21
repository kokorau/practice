<script setup lang="ts">
import { computed } from 'vue'

/**
 * Noise/scatter indicator
 * - Multiple dots that spread based on intensity
 */
const props = defineProps<{
  /** Intensity value (0-1) - controls scatter amount */
  intensity: number
  /** Period in ms (optional) */
  period?: number
}>()

// Generate pseudo-random but deterministic offsets
const dots = computed(() => {
  const spread = props.intensity * 8
  return [
    { x: 12, y: 12 },
    { x: 12 + spread * 0.7, y: 12 - spread * 0.5 },
    { x: 12 - spread * 0.6, y: 12 + spread * 0.8 },
    { x: 12 + spread * 0.3, y: 12 + spread * 0.9 },
    { x: 12 - spread * 0.8, y: 12 - spread * 0.4 },
  ]
})
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Boundary circle -->
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1" opacity="0.15" />
      <!-- Scattered dots -->
      <circle
        v-for="(dot, i) in dots"
        :key="i"
        :cx="dot.x"
        :cy="dot.y"
        :r="i === 0 ? 2.5 : 1.5"
        fill="currentColor"
        :opacity="i === 0 ? 0.9 : 0.6"
      />
    </svg>
    <span v-if="period" class="period">{{ period }}ms</span>
  </div>
</template>

<style scoped>
.indicator {
  position: relative;
  width: 24px;
  height: 24px;
  color: oklch(0.55 0.18 300);
}
.period {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  color: oklch(0.5 0.02 260);
  white-space: nowrap;
}
</style>
