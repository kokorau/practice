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
      type="number"
      :min="min"
      :max="max"
      :step="step ?? 0.01"
      :value="modelValue"
      class="number-input"
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

.number-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .number-input {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.number-input:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}
</style>
