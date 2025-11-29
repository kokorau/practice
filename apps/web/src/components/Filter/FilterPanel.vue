<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Filter, Preset } from '../../modules/Filter/Domain'
import { $Preset } from '../../modules/Filter/Domain'
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

// セクション開閉状態
const presetsOpen = ref(true)
const adjustmentsOpen = ref(false)

// プリセットをカテゴリ別にグループ化
const groupedPresets = computed(() => $Preset.groupByCategory([...props.presets]))

// 現在選択中のプリセット
const currentPreset = computed(() =>
  props.currentPresetId
    ? props.presets.find(p => p.id === props.currentPresetId) ?? null
    : null
)

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
  <div class="space-y-1">
    <!-- Presets -->
    <div class="border border-gray-700 rounded-lg overflow-hidden">
      <button
        @click="presetsOpen = !presetsOpen"
        class="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <span class="text-xs text-gray-300 font-medium">Presets</span>
        <svg
          class="w-3 h-3 text-gray-500 transition-transform"
          :class="{ 'rotate-180': presetsOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="presetsOpen" class="p-2 space-y-2">
        <div v-for="[category, categoryPresets] in groupedPresets" :key="category">
          <div class="text-xs text-gray-500 mb-1">{{ $Preset.categoryLabel(category) }}</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in categoryPresets"
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

        <!-- Selected Preset Details -->
        <div v-if="currentPreset" class="mt-3 pt-3 border-t border-gray-600">
          <div class="text-xs font-medium text-blue-400 mb-1">{{ currentPreset.name }}</div>
          <div v-if="currentPreset.description" class="text-xs text-gray-400 mb-2">
            {{ currentPreset.description }}
          </div>
          <div v-if="currentPreset.suitableFor?.length" class="flex flex-wrap gap-1 mb-1">
            <span
              v-for="tag in currentPreset.suitableFor"
              :key="tag"
              class="px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded"
              style="font-size: 9px;"
            >
              {{ tag }}
            </span>
          </div>
          <div v-if="currentPreset.characteristics?.length" class="flex flex-wrap gap-1">
            <span
              v-for="tag in currentPreset.characteristics"
              :key="tag"
              class="px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded"
              style="font-size: 9px;"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Adjustments (All-in-One) -->
    <div class="border border-gray-700 rounded-lg overflow-hidden">
      <button
        @click="adjustmentsOpen = !adjustmentsOpen"
        class="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <span class="text-xs text-gray-300 font-medium">Adjustments</span>
        <div class="flex items-center gap-2">
          <button
            @click.stop="emit('reset')"
            class="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-400"
            style="font-size: 9px;"
          >
            Reset
          </button>
          <svg
            class="w-3 h-3 text-gray-500 transition-transform"
            :class="{ 'rotate-180': adjustmentsOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div v-show="adjustmentsOpen" class="p-3 space-y-3">
        <!-- Basic -->
        <div class="space-y-1.5">
          <div class="text-xs text-gray-500 font-medium">Basic</div>
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

        <!-- Split Toning -->
        <div class="space-y-1.5 pt-2 border-t border-gray-700">
          <div class="text-xs text-gray-500 font-medium">Split Toning</div>
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

        <!-- Film Curve -->
        <div class="space-y-1.5 pt-2 border-t border-gray-700">
          <div class="text-xs text-gray-500 font-medium">Film Curve</div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-16 flex-shrink-0">Toe</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.toe" @input="handlers.toe" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shoulder</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.shoulder" @input="handlers.shoulder" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>

        <!-- Color Balance -->
        <div class="space-y-1.5 pt-2 border-t border-gray-700">
          <div class="text-xs text-gray-500 font-medium">Color Balance</div>
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

        <!-- Pixel Effects -->
        <div class="space-y-1.5 pt-2 border-t border-gray-700">
          <div class="text-xs text-gray-500 font-medium">Pixel Effects</div>
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
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hue Rot</span>
            <input type="range" min="-180" max="180" step="1" :value="filter.adjustment.hueRotation" @input="handlers.hueRotation" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-16 flex-shrink-0">Posterize</span>
            <input type="range" min="2" max="256" step="1" :value="filter.adjustment.posterizeLevels" @input="handlers.posterizeLevels" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            <span class="text-xs text-gray-600 w-6">{{ filter.adjustment.posterizeLevels }}</span>
          </div>
        </div>

        <!-- Tone Curve -->
        <div class="pt-2 border-t border-gray-700">
          <div class="text-xs text-gray-500 font-medium mb-2">Tone Curve</div>
          <CurveEditor
            :curve="filter.master"
            :width="420"
            :height="120"
            @update:point="handlePointUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>
