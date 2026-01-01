<script setup lang="ts">
import { ref, computed } from 'vue'
import { $Oklch, $Srgb } from '@practice/color'
import type { Oklch } from '@practice/color'

const props = defineProps<{
  color: Oklch
  label: string
  size?: 'small' | 'medium' | 'large'
}>()

const isHovered = ref(false)
const swatchRef = ref<HTMLElement | null>(null)

const sizeClass = computed(() => props.size ?? 'medium')

const p3Values = computed(() => {
  const full = $Oklch.toCssP3(props.color)
  const match = full.match(/color\(display-p3\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`
  }
  return full
})

const srgb = computed(() => $Oklch.toSrgb(props.color))
const hexValue = computed(() => $Srgb.toHex(srgb.value))
const isOutOfSrgbGamut = computed(() => {
  const { r, g, b } = srgb.value
  return r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1
})

const oklchFormatted = computed(() => {
  const L = (props.color.L * 100).toFixed(1)
  const C = props.color.C.toFixed(4)
  const H = props.color.H.toFixed(1)
  return `${L}% ${C} ${H}°`
})
</script>

<template>
  <div
    ref="swatchRef"
    class="color-swatch-wrapper"
    :class="sizeClass"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div
      class="color-swatch"
      :style="{ backgroundColor: $Oklch.toCss(color) }"
    />
    <Transition name="tooltip">
      <div v-if="isHovered" class="tooltip">
        <div class="tooltip-header">{{ label }}</div>
        <div class="tooltip-content">
          <div class="tooltip-row">
            <span class="tooltip-label">OKLCH</span>
            <code class="tooltip-code">{{ oklchFormatted }}</code>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">P3</span>
            <code class="tooltip-code">{{ p3Values }}</code>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">HEX</span>
            <span class="tooltip-hex-wrapper">
              <code class="tooltip-code">{{ hexValue }}</code>
              <span v-if="isOutOfSrgbGamut" class="gamut-warning" title="Out of sRGB gamut">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </span>
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.color-swatch-wrapper {
  position: relative;
  display: inline-block;
}

.color-swatch {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.15);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.color-swatch-wrapper:hover .color-swatch {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Size variants */
.small .color-swatch {
  width: 48px;
  height: 48px;
}

.medium .color-swatch {
  width: 64px;
  height: 64px;
}

.large .color-swatch {
  width: 120px;
  height: 120px;
  border-radius: 12px;
}

/* Tooltip */
.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  background: oklch(0.18 0.02 260);
  border: 1px solid oklch(0.28 0.02 260);
  border-radius: 8px;
  padding: 0.75rem;
  min-width: 260px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 100;
  pointer-events: none;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: oklch(0.18 0.02 260);
}

.tooltip-header {
  font-size: 0.85rem;
  font-weight: 700;
  color: oklch(0.95 0.01 260);
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.28 0.02 260);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.tooltip-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.60 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tooltip-value {
  font-size: 0.75rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.90 0.01 260);
}

.tooltip-code {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.85 0.01 260);
  background: oklch(0.12 0.02 260);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
}

.tooltip-hex-wrapper {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.gamut-warning {
  display: flex;
  align-items: center;
  color: oklch(0.75 0.15 60);
}

/* Tooltip Transition */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
