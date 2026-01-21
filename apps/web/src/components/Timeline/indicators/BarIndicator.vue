<script setup lang="ts">
/**
 * Vertical bar indicator
 * - Bar height changes with intensity
 */
defineProps<{
  /** Intensity value (0-1) - controls bar height */
  intensity: number
  /** Period in ms (optional) */
  period?: number
}>()
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Background bar -->
      <rect x="8" y="2" width="8" height="20" rx="2" fill="currentColor" opacity="0.15" />
      <!-- Active bar (grows from bottom) -->
      <rect
        x="8"
        :y="22 - intensity * 20"
        width="8"
        :height="intensity * 20"
        rx="2"
        fill="currentColor"
        opacity="0.9"
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
  color: oklch(0.65 0.20 60);
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
