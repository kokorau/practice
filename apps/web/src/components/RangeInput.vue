<script setup lang="ts">
defineProps<{
  label: string
  min: number
  max: number
  step?: number
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const handleInput = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="range-input">
    <span class="range-label">{{ label }}</span>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step ?? 0.01"
      :value="modelValue"
      class="range-slider"
      @input="handleInput"
    />
  </div>
</template>

<style scoped>
.range-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-label {
  font-size: 0.75rem;
  width: 4rem;
  flex-shrink: 0;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .range-label {
  color: oklch(0.60 0.02 260);
}

.range-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
  background: oklch(0.85 0.01 260);
}

:global(.dark) .range-slider {
  background: oklch(0.30 0.02 260);
}

.range-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.range-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
</style>
