<script setup lang="ts">
/**
 * Pulse/heartbeat indicator
 * - Shows ON/OFF state with glow effect
 * - Good for pulse/step signals
 */
defineProps<{
  /** Intensity value (0-1) - 0.5+ = ON */
  intensity: number
  /** Period in ms (optional) */
  period?: number
}>()
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <!-- Glow (when active) -->
      <circle
        v-if="intensity > 0.5"
        cx="12"
        cy="12"
        r="10"
        fill="currentColor"
        opacity="0.2"
      />
      <!-- Outer ring -->
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5" :opacity="intensity > 0.5 ? 0.8 : 0.2" />
      <!-- Inner dot -->
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
        :opacity="intensity > 0.5 ? 1 : 0.15"
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
  color: oklch(0.60 0.30 0);
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
