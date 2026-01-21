<script setup lang="ts">
/**
 * Rotating bar indicator
 * - Bar rotates based on intensity (0-1 → 0-360°)
 */
defineProps<{
  /** Intensity value (0-1) - controls rotation angle */
  intensity: number
  /** Period in ms (optional) */
  period?: number
}>()
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Background circle -->
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2" />
      <!-- Rotating bar -->
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="3"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        :transform="`rotate(${intensity * 360} 12 12)`"
      />
      <!-- Center dot -->
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
    <span v-if="period" class="period">{{ period }}ms</span>
  </div>
</template>

<style scoped>
.indicator {
  position: relative;
  width: 24px;
  height: 24px;
  color: oklch(0.65 0.20 30);
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
