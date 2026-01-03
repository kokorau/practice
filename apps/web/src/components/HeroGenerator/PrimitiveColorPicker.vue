<script setup lang="ts">
import { computed } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette, PrimitiveKey } from '../../modules/SemanticColorPalette/Domain'
import {
  BRAND_KEYS,
  ACCENT_KEYS,
  NEUTRAL_KEYS,
  FOUNDATION_KEYS,
  ACCENT_RAMP_KEYS,
} from '../../modules/SemanticColorPalette/Domain/ValueObject/PrimitivePalette'

const props = defineProps<{
  modelValue: PrimitiveKey | 'auto'
  palette: PrimitivePalette
  label?: string
  showAuto?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PrimitiveKey | 'auto']
}>()

// Group colors for display
const colorGroups = computed(() => [
  { name: 'Brand', keys: BRAND_KEYS },
  { name: 'Accent', keys: ACCENT_KEYS },
  { name: 'Foundation', keys: FOUNDATION_KEYS },
  { name: 'Brand Neutral', keys: NEUTRAL_KEYS },
  { name: 'Accent Neutral', keys: ACCENT_RAMP_KEYS },
])

const getColorStyle = (key: PrimitiveKey) => ({
  backgroundColor: $Oklch.toCss(props.palette[key]),
})

const selectColor = (key: PrimitiveKey | 'auto') => {
  emit('update:modelValue', key)
}
</script>

<template>
  <div class="primitive-color-picker">
    <label v-if="label" class="picker-label">{{ label }}</label>

    <!-- Auto option -->
    <div v-if="showAuto" class="color-group">
      <button
        class="color-chip auto-chip"
        :class="{ active: modelValue === 'auto' }"
        @click="selectColor('auto')"
        title="Auto"
      >
        <span class="auto-icon">A</span>
      </button>
    </div>

    <!-- Color groups -->
    <div
      v-for="group in colorGroups"
      :key="group.name"
      class="color-group"
    >
      <span class="group-label">{{ group.name }}</span>
      <div class="color-row">
        <button
          v-for="key in group.keys"
          :key="key"
          class="color-chip"
          :class="{ active: modelValue === key }"
          :style="getColorStyle(key)"
          :title="key"
          @click="selectColor(key)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.primitive-color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.picker-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.40 0.02 260);
}

.dark .picker-label {
  color: oklch(0.70 0.02 260);
}

.color-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.group-label {
  font-size: 0.625rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .group-label {
  color: oklch(0.60 0.02 260);
}

.color-row {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.color-chip {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.color-chip:hover {
  transform: scale(1.1);
}

.color-chip.active {
  border-color: oklch(0.55 0.20 250);
  box-shadow: 0 0 0 2px oklch(0.55 0.20 250 / 0.3);
}

.auto-chip {
  background: linear-gradient(135deg,
    oklch(0.90 0.01 260) 0%,
    oklch(0.70 0.01 260) 50%,
    oklch(0.50 0.01 260) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .auto-chip {
  background: linear-gradient(135deg,
    oklch(0.30 0.01 260) 0%,
    oklch(0.50 0.01 260) 50%,
    oklch(0.70 0.01 260) 100%
  );
}

.auto-icon {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.30 0.02 260);
}

.dark .auto-icon {
  color: oklch(0.90 0.02 260);
}
</style>
