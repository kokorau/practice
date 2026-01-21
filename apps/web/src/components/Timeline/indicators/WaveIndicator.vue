<script setup lang="ts">
/**
 * Wave line indicator
 * - Horizontal line that curves up/down based on intensity
 * - Center is at 0.5, curves up for >0.5, down for <0.5
 */
defineProps<{
  /** Intensity value (0-1) - controls wave position */
  intensity: number
  /** Period in ms (optional) */
  period?: number
}>()
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Center line reference -->
      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1" opacity="0.15" />
      <!-- Wave dot position -->
      <circle
        cx="12"
        :cy="22 - intensity * 20"
        r="3"
        fill="currentColor"
        opacity="0.9"
      />
      <!-- Trailing line -->
      <line
        x1="4"
        y1="12"
        x2="12"
        :y2="22 - intensity * 20"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.5"
      />
      <line
        x1="12"
        :y1="22 - intensity * 20"
        x2="20"
        y2="12"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.3"
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
  color: oklch(0.65 0.20 200);
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
