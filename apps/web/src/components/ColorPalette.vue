<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// プリセット
const presets = {
  natural: [
    { name: 'Daylight', color: '#ffffff' },
    { name: 'Sunrise', color: '#ffb347' },
    { name: 'Sunset', color: '#ff6b35' },
    { name: 'Cloudy', color: '#c9d6df' },
    { name: 'Moonlight', color: '#b8c5d6' },
    { name: 'Warm White', color: '#fff4e6' },
    { name: 'Cool White', color: '#f0f4ff' },
  ],
  neon: [
    { name: 'Neon Pink', color: '#ff6ec7' },
    { name: 'Neon Blue', color: '#00d4ff' },
    { name: 'Neon Green', color: '#39ff14' },
    { name: 'Neon Purple', color: '#bf00ff' },
    { name: 'Neon Orange', color: '#ff9500' },
  ],
}

// 選択モード
type Mode = 'natural' | 'neon' | 'custom'
const mode = ref<Mode>('natural')

// カスタムカラー
const customColor = ref(props.modelValue)

// プリセットから選択
const selectPreset = (color: string) => {
  emit('update:modelValue', color)
}

// カスタムカラー変更
const onCustomColorChange = (e: Event) => {
  const color = (e.target as HTMLInputElement).value
  customColor.value = color
  emit('update:modelValue', color)
}

// モード切り替え時
watch(mode, (newMode) => {
  if (newMode === 'natural') {
    emit('update:modelValue', presets.natural[0]?.color ?? '#ffffff')
  } else if (newMode === 'neon') {
    emit('update:modelValue', presets.neon[0]?.color ?? '#ff6ec7')
  } else {
    emit('update:modelValue', customColor.value)
  }
})

// 現在のプリセットリスト
const currentPresets = () => {
  if (mode.value === 'natural') return presets.natural
  if (mode.value === 'neon') return presets.neon
  return []
}

// 選択中かどうか
const isSelected = (color: string) => props.modelValue === color
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- モード切り替え -->
    <div class="flex gap-0.5 text-[0.65rem]">
      <button
        class="px-1.5 py-0.5 rounded leading-tight flex-1"
        :class="mode === 'natural' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-650'"
        @click="mode = 'natural'"
      >
        Natural
      </button>
      <button
        class="px-1.5 py-0.5 rounded leading-tight flex-1"
        :class="mode === 'neon' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-650'"
        @click="mode = 'neon'"
      >
        Neon
      </button>
      <button
        class="px-1.5 py-0.5 rounded leading-tight flex-1"
        :class="mode === 'custom' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-650'"
        @click="mode = 'custom'"
      >
        Custom
      </button>
    </div>

    <!-- プリセットパレット -->
    <div v-if="mode !== 'custom'" class="flex flex-wrap gap-1">
      <button
        v-for="preset in currentPresets()"
        :key="preset.color"
        class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
        :class="isSelected(preset.color) ? 'border-white scale-110' : 'border-transparent'"
        :style="{ backgroundColor: preset.color }"
        :title="preset.name"
        @click="selectPreset(preset.color)"
      />
    </div>

    <!-- カスタムカラーピッカー -->
    <div v-else class="flex items-center gap-2">
      <input
        :value="customColor"
        type="color"
        class="w-10 h-8 rounded cursor-pointer"
        @input="onCustomColorChange"
      />
      <span class="text-xs text-gray-400">{{ customColor }}</span>
    </div>
  </div>
</template>
