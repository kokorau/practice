<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { Filter, Preset } from '../../modules/Filter/Domain'
import type { FilterSetters } from '../../composables/Filter/useFilter'
import CurveEditor from '../CurveEditor.vue'

const props = defineProps<{
  filter: Filter
  presets: readonly Preset[]
  currentPresetId: string | null
  setters: FilterSetters
}>()

const emit = defineEmits<{
  applyPreset: [preset: Preset]
  'update:masterPoint': [index: number, value: number]
  reset: []
}>()

// イベントハンドラファクトリ (デバウンス付き)
const DEBOUNCE_MS = 16
const createHandler = (setter: (v: number) => void) => {
  const debounced = useDebounceFn(setter, DEBOUNCE_MS)
  return (e: Event) => debounced(parseFloat((e.target as HTMLInputElement).value))
}

// 全ハンドラを一括生成
const handlers = {
  exposure: createHandler(props.setters.exposure),
  highlights: createHandler(props.setters.highlights),
  shadows: createHandler(props.setters.shadows),
  whites: createHandler(props.setters.whites),
  blacks: createHandler(props.setters.blacks),
  brightness: createHandler(props.setters.brightness),
  contrast: createHandler(props.setters.contrast),
  temperature: createHandler(props.setters.temperature),
  tint: createHandler(props.setters.tint),
  clarity: createHandler(props.setters.clarity),
  fade: createHandler(props.setters.fade),
  vibrance: createHandler(props.setters.vibrance),
  splitShadowHue: createHandler(props.setters.splitShadowHue),
  splitShadowAmount: createHandler(props.setters.splitShadowAmount),
  splitHighlightHue: createHandler(props.setters.splitHighlightHue),
  splitHighlightAmount: createHandler(props.setters.splitHighlightAmount),
  splitBalance: createHandler(props.setters.splitBalance),
  toe: createHandler(props.setters.toe),
  shoulder: createHandler(props.setters.shoulder),
  liftR: createHandler(props.setters.liftR),
  liftG: createHandler(props.setters.liftG),
  liftB: createHandler(props.setters.liftB),
  gammaR: createHandler(props.setters.gammaR),
  gammaG: createHandler(props.setters.gammaG),
  gammaB: createHandler(props.setters.gammaB),
  gainR: createHandler(props.setters.gainR),
  gainG: createHandler(props.setters.gainG),
  gainB: createHandler(props.setters.gainB),
  selectiveHue: createHandler(props.setters.selectiveHue),
  selectiveRange: createHandler(props.setters.selectiveRange),
  selectiveDesaturate: createHandler(props.setters.selectiveDesaturate),
  posterizeLevels: createHandler(props.setters.posterizeLevels),
  hueRotation: createHandler(props.setters.hueRotation),
}

const debouncedSetMasterPoint = useDebounceFn(
  (index: number, value: number) => emit('update:masterPoint', index, value),
  DEBOUNCE_MS
)
const handlePointUpdate = (index: number, value: number) => {
  debouncedSetMasterPoint(index, value)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Presets -->
    <div class="border border-gray-700 rounded-lg p-2">
      <div class="flex flex-wrap gap-1">
        <button
          v-for="preset in presets"
          :key="preset.id"
          @click="emit('applyPreset', preset)"
          :class="[
            'px-1.5 py-0.5 rounded transition-colors',
            currentPresetId === preset.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          ]"
          :title="preset.description"
          style="font-size: 10px;"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <!-- Basic Adjustments -->
    <div class="border border-gray-700 rounded-lg p-3">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xs text-gray-400 font-medium">Adjustments</h2>
        <button
          @click="emit('reset')"
          class="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-400"
          style="font-size: 10px;"
        >
          Reset
        </button>
      </div>

      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Exposure</span>
          <input type="range" min="-2" max="2" step="0.01" :value="filter.adjustment.exposure" @input="handlers.exposure" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Highlights</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.highlights" @input="handlers.highlights" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shadows</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.shadows" @input="handlers.shadows" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Whites</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.whites" @input="handlers.whites" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Blacks</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.blacks" @input="handlers.blacks" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Brightness</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.brightness" @input="handlers.brightness" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Contrast</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.contrast" @input="handlers.contrast" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Clarity</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.clarity" @input="handlers.clarity" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Temp</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.temperature" @input="handlers.temperature" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Tint</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.tint" @input="handlers.tint" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Fade</span>
          <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.fade" @input="handlers.fade" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Vibrance</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.vibrance" @input="handlers.vibrance" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
    </div>

    <!-- Split Toning -->
    <div class="border border-gray-700 rounded-lg p-3">
      <h2 class="text-xs text-gray-400 font-medium mb-2">Split Toning</h2>
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Sh Hue</span>
          <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitShadowHue" @input="handlers.splitShadowHue" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Sh Amt</span>
          <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitShadowAmount" @input="handlers.splitShadowAmount" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hi Hue</span>
          <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitHighlightHue" @input="handlers.splitHighlightHue" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hi Amt</span>
          <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitHighlightAmount" @input="handlers.splitHighlightAmount" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Balance</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.splitBalance" @input="handlers.splitBalance" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
    </div>

    <!-- Film Curve -->
    <div class="border border-gray-700 rounded-lg p-3">
      <h2 class="text-xs text-gray-400 font-medium mb-2">Film Curve</h2>
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Toe</span>
          <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.toe" @input="handlers.toe" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shoulder</span>
          <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.shoulder" @input="handlers.shoulder" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
    </div>

    <!-- Color Balance (Lift/Gamma/Gain) -->
    <div class="border border-gray-700 rounded-lg p-3">
      <h2 class="text-xs text-gray-400 font-medium mb-2">Color Balance</h2>
      <div class="space-y-1.5">
        <!-- Lift -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-red-400 w-16 flex-shrink-0">Lift R</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftR" @input="handlers.liftR" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-green-400 w-16 flex-shrink-0">Lift G</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftG" @input="handlers.liftG" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-blue-400 w-16 flex-shrink-0">Lift B</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftB" @input="handlers.liftB" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <!-- Gamma -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-red-400 w-16 flex-shrink-0">Gamma R</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaR" @input="handlers.gammaR" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-green-400 w-16 flex-shrink-0">Gamma G</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaG" @input="handlers.gammaG" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-blue-400 w-16 flex-shrink-0">Gamma B</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaB" @input="handlers.gammaB" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <!-- Gain -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-red-400 w-16 flex-shrink-0">Gain R</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainR" @input="handlers.gainR" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-green-400 w-16 flex-shrink-0">Gain G</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainG" @input="handlers.gainG" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-blue-400 w-16 flex-shrink-0">Gain B</span>
          <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainB" @input="handlers.gainB" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
    </div>

    <!-- Pixel Effects (non-LUT) -->
    <div class="border border-gray-700 rounded-lg p-3">
      <h2 class="text-xs text-gray-400 font-medium mb-2">Pixel Effects</h2>
      <div class="space-y-1.5">
        <!-- Selective Color -->
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              :checked="filter.adjustment.selectiveColorEnabled"
              @change="setters.selectiveColorEnabled(($event.target as HTMLInputElement).checked)"
              class="w-3 h-3"
            />
            <span class="text-xs text-gray-500">Selective</span>
          </label>
        </div>
        <div v-if="filter.adjustment.selectiveColorEnabled" class="space-y-1.5 pl-4">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-12 flex-shrink-0">Hue</span>
            <input type="range" min="0" max="360" step="1" :value="filter.adjustment.selectiveHue" @input="handlers.selectiveHue" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-12 flex-shrink-0">Range</span>
            <input type="range" min="0" max="180" step="1" :value="filter.adjustment.selectiveRange" @input="handlers.selectiveRange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-12 flex-shrink-0">Desat</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.selectiveDesaturate" @input="handlers.selectiveDesaturate" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>

        <!-- Hue Rotation -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hue Rot</span>
          <input type="range" min="-180" max="180" step="1" :value="filter.adjustment.hueRotation" @input="handlers.hueRotation" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>

        <!-- Posterize -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-16 flex-shrink-0">Posterize</span>
          <input type="range" min="2" max="256" step="1" :value="filter.adjustment.posterizeLevels" @input="handlers.posterizeLevels" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          <span class="text-xs text-gray-600 w-6">{{ filter.adjustment.posterizeLevels }}</span>
        </div>
      </div>
    </div>

    <!-- Curve Editor -->
    <div class="border border-gray-700 rounded-lg p-3">
      <h2 class="text-xs text-gray-400 font-medium mb-2">Tone Curve</h2>
      <CurveEditor
        :curve="filter.master"
        :width="240"
        :height="100"
        @update:point="handlePointUpdate"
      />
    </div>
  </div>
</template>
