<script setup lang="ts">
import { computed } from 'vue'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Srgb } from '../../modules/Color/Domain/ValueObject/Srgb'

const props = defineProps<{
  modelValue: string // HEX color
}>()

const emit = defineEmits<{
  'update:modelValue': [hex: string]
}>()

// Preview the color as OKLCH values
const oklchPreview = computed(() => {
  const srgb = $Srgb.fromHex(props.modelValue)
  if (!srgb) return null
  return $Oklch.fromSrgb(srgb)
})

const handleColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleTextChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  let value = target.value.trim()
  if (!value.startsWith('#')) value = '#' + value
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div class="brand-color-picker">
    <div class="flex items-center gap-3">
      <input
        type="color"
        :value="modelValue"
        class="w-14 h-14 rounded cursor-pointer border-0"
        @input="handleColorChange"
      />
      <div>
        <input
          type="text"
          :value="modelValue"
          class="bg-gray-700 px-3 py-2 rounded text-sm font-mono w-28 mb-1"
          @change="handleTextChange"
        />
        <div v-if="oklchPreview" class="text-xs text-gray-500 font-mono">
          L: {{ oklchPreview.L.toFixed(2) }}
          C: {{ oklchPreview.C.toFixed(2) }}
          H: {{ oklchPreview.H.toFixed(0) }}°
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type='color'] {
  -webkit-appearance: none;
  padding: 0;
}

input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}
</style>
