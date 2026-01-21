<script setup lang="ts">
/**
 * Circle with surrounding arc indicator
 * - Inner circle: opacity changes with intensity
 * - Outer arc: draws from 0° to 360° based on progress
 */
defineProps<{
  /** Intensity value (0-1) - controls inner circle opacity */
  intensity: number
  /** Progress value (0-1) - controls arc completion */
  progress: number
  /** Period in ms (optional, for display) */
  period?: number
}>()
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Outer arc (progress) -->
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        :stroke-dasharray="`${progress * 62.83} 62.83`"
        stroke-linecap="round"
        transform="rotate(-90 12 12)"
        class="arc"
      />
      <!-- Inner circle (intensity) -->
      <circle
        cx="12"
        cy="12"
        r="5"
        fill="currentColor"
        :opacity="intensity"
        class="dot"
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
  color: oklch(0.65 0.20 250);
}
.arc {
  opacity: 0.6;
}
.dot {
  transition: opacity 0.03s;
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
