<script setup lang="ts">
defineProps<{
  label: string
  min: number
  max: number
  step?: number
  modelValue: number
  labelClass?: string
  inputClass?: string
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
  <div class="flex items-center gap-2">
    <span :class="['text-xs w-16 flex-shrink-0', labelClass ?? 'text-gray-500']">
      {{ label }}
    </span>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step ?? 0.01"
      :value="modelValue"
      @input="handleInput"
      :class="['flex-1 h-1.5 rounded-lg appearance-none cursor-pointer', inputClass ?? 'bg-gray-700']"
    />
  </div>
</template>
