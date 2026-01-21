<script setup lang="ts">
/**
 * Scaling circle indicator
 * - Circle scales based on intensity (0-1 → 0.2-1.0 scale)
 */
defineProps<{
  /** Intensity value (0-1) - controls scale */
  intensity: number
  /** Period in ms (optional) */
  period?: number
}>()
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Max size reference (faint) -->
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1" opacity="0.15" />
      <!-- Scaling circle -->
      <circle
        cx="12"
        cy="12"
        :r="2 + intensity * 8"
        fill="currentColor"
        opacity="0.8"
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
  color: oklch(0.65 0.20 150);
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
