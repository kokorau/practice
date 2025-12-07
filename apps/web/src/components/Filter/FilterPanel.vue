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
  intensity: number
}>()

const emit = defineEmits<{
  applyPreset: [preset: Preset]
  'update:masterPoint': [index: number, value: number]
  'update:intensity': [value: number]
  reset: []
}>()

// セクション開閉状態
const presetsOpen = ref(true)
const adjustmentsOpen = ref(false)

// プリセットをカテゴリ別にグループ化
const groupedPresets = computed(() => $Preset.groupByCategory([...props.presets]))

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

const debouncedSetIntensity = useDebounceFn(
  (value: number) => emit('update:intensity', value),
  DEBOUNCE_MS
)
const handleIntensityChange = (e: Event) => {
  debouncedSetIntensity(parseFloat((e.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="filter-panel">
    <!-- Intensity Slider -->
    <div class="intensity-section">
      <label class="slider-row">
        <span class="slider-label">Intensity</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="intensity"
          @input="handleIntensityChange"
          class="slider"
        />
        <span class="slider-value">{{ Math.round(intensity * 100) }}%</span>
      </label>
    </div>

    <!-- Adjustments -->
    <div class="section">
      <button class="section-header" @click="adjustmentsOpen = !adjustmentsOpen">
        <span class="section-title">Adjustments</span>
        <div class="section-actions">
          <button class="reset-btn" @click.stop="emit('reset')">Reset</button>
          <span class="chevron" :class="{ open: adjustmentsOpen }">›</span>
        </div>
      </button>

      <div v-show="adjustmentsOpen" class="section-content">
        <!-- Basic -->
        <div class="subsection">
          <div class="subsection-title">Basic</div>
          <label class="slider-row">
            <span class="slider-label">Exposure</span>
            <input type="range" min="-2" max="2" step="0.01" :value="filter.adjustment.exposure" @input="handlers.exposure" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Highlights</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.highlights" @input="handlers.highlights" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Shadows</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.shadows" @input="handlers.shadows" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Whites</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.whites" @input="handlers.whites" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Blacks</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.blacks" @input="handlers.blacks" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Brightness</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.brightness" @input="handlers.brightness" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Contrast</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.contrast" @input="handlers.contrast" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Clarity</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.clarity" @input="handlers.clarity" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Temp</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.temperature" @input="handlers.temperature" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Tint</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.tint" @input="handlers.tint" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Fade</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.fade" @input="handlers.fade" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Vibrance</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.vibrance" @input="handlers.vibrance" class="slider" />
          </label>
        </div>

        <!-- Split Toning -->
        <div class="subsection">
          <div class="subsection-title">Split Toning</div>
          <label class="slider-row">
            <span class="slider-label">Sh Hue</span>
            <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitShadowHue" @input="handlers.splitShadowHue" class="slider hue-slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Sh Amt</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitShadowAmount" @input="handlers.splitShadowAmount" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Hi Hue</span>
            <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitHighlightHue" @input="handlers.splitHighlightHue" class="slider hue-slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Hi Amt</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitHighlightAmount" @input="handlers.splitHighlightAmount" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Balance</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.splitBalance" @input="handlers.splitBalance" class="slider" />
          </label>
        </div>

        <!-- Film Curve -->
        <div class="subsection">
          <div class="subsection-title">Film Curve</div>
          <label class="slider-row">
            <span class="slider-label">Toe</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.toe" @input="handlers.toe" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Shoulder</span>
            <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.shoulder" @input="handlers.shoulder" class="slider" />
          </label>
        </div>

        <!-- Color Balance -->
        <div class="subsection">
          <div class="subsection-title">Color Balance</div>
          <label class="slider-row">
            <span class="slider-label color-r">Lift R</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftR" @input="handlers.liftR" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-g">Lift G</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftG" @input="handlers.liftG" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-b">Lift B</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftB" @input="handlers.liftB" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-r">Gamma R</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaR" @input="handlers.gammaR" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-g">Gamma G</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaG" @input="handlers.gammaG" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-b">Gamma B</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaB" @input="handlers.gammaB" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-r">Gain R</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainR" @input="handlers.gainR" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-g">Gain G</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainG" @input="handlers.gainG" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label color-b">Gain B</span>
            <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainB" @input="handlers.gainB" class="slider" />
          </label>
        </div>

        <!-- Pixel Effects -->
        <div class="subsection">
          <div class="subsection-title">Pixel Effects</div>
          <label class="checkbox-row">
            <input
              type="checkbox"
              :checked="filter.adjustment.selectiveColorEnabled"
              @change="setters.selectiveColorEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span>Selective Color</span>
          </label>
          <div v-if="filter.adjustment.selectiveColorEnabled" class="indent">
            <label class="slider-row">
              <span class="slider-label">Hue</span>
              <input type="range" min="0" max="360" step="1" :value="filter.adjustment.selectiveHue" @input="handlers.selectiveHue" class="slider hue-slider" />
            </label>
            <label class="slider-row">
              <span class="slider-label">Range</span>
              <input type="range" min="0" max="180" step="1" :value="filter.adjustment.selectiveRange" @input="handlers.selectiveRange" class="slider" />
            </label>
            <label class="slider-row">
              <span class="slider-label">Desat</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.selectiveDesaturate" @input="handlers.selectiveDesaturate" class="slider" />
            </label>
          </div>
          <label class="slider-row">
            <span class="slider-label">Hue Rot</span>
            <input type="range" min="-180" max="180" step="1" :value="filter.adjustment.hueRotation" @input="handlers.hueRotation" class="slider" />
          </label>
          <label class="slider-row">
            <span class="slider-label">Posterize</span>
            <input type="range" min="2" max="256" step="1" :value="filter.adjustment.posterizeLevels" @input="handlers.posterizeLevels" class="slider" />
            <span class="slider-value">{{ filter.adjustment.posterizeLevels }}</span>
          </label>
        </div>

        <!-- Tone Curve -->
        <div class="subsection">
          <div class="subsection-title">Tone Curve</div>
          <CurveEditor
            :curve="filter.master"
            :width="380"
            :height="120"
            @update:point="handlePointUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Presets -->
    <div class="section">
      <button class="section-header" @click="presetsOpen = !presetsOpen">
        <span class="section-title">Presets</span>
        <span class="chevron" :class="{ open: presetsOpen }">›</span>
      </button>

      <div v-show="presetsOpen" class="section-content">
        <div v-for="[category, categoryPresets] in groupedPresets" :key="category" class="preset-category">
          <div class="preset-category-title">{{ $Preset.categoryLabel(category) }}</div>
          <div class="preset-grid">
            <button
              v-for="preset in categoryPresets"
              :key="preset.id"
              class="preset-item"
              :class="{ active: currentPresetId === preset.id }"
              @click="emit('applyPreset', preset)"
              :title="preset.description"
            >
              <span class="preset-name">{{ preset.name }}</span>
              <span v-if="preset.lut3d" class="preset-badge">3D</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Intensity Section */
.intensity-section {
  padding: 0.75rem;
  background: #374151;
  border-radius: 0.5rem;
}

/* Section */
.section {
  background: #374151;
  border-radius: 0.5rem;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.section-header:hover {
  background: #4b5563;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reset-btn {
  padding: 0.25rem 0.5rem;
  background: #4b5563;
  border: none;
  border-radius: 0.25rem;
  color: #9ca3af;
  font-size: 0.625rem;
  cursor: pointer;
  transition: all 0.15s;
}

.reset-btn:hover {
  background: #6b7280;
  color: white;
}

.chevron {
  color: #9ca3af;
  font-size: 1.25rem;
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(90deg);
}

.section-content {
  padding: 0.75rem;
  padding-top: 0;
}

/* Subsection */
.subsection {
  padding-top: 0.75rem;
  border-top: 1px solid #4b5563;
}

.subsection:first-child {
  padding-top: 0;
  border-top: none;
}

.subsection-title {
  font-size: 0.625rem;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

/* Slider Row */
.slider-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.slider-label {
  width: 4rem;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.slider-label.color-r { color: #f87171; }
.slider-label.color-g { color: #4ade80; }
.slider-label.color-b { color: #60a5fa; }

.slider {
  flex: 1;
  height: 0.375rem;
  background: #4b5563;
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 0.875rem;
  height: 0.875rem;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.hue-slider {
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}

.slider-value {
  width: 2.5rem;
  flex-shrink: 0;
  font-size: 0.625rem;
  color: #6b7280;
  text-align: right;
}

/* Checkbox Row */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  font-size: 0.75rem;
  color: #9ca3af;
  cursor: pointer;
}

.checkbox-row input {
  width: 0.875rem;
  height: 0.875rem;
}

.indent {
  padding-left: 1.25rem;
}

/* Presets */
.preset-category {
  margin-bottom: 0.75rem;
}

.preset-category:last-child {
  margin-bottom: 0;
}

.preset-category-title {
  font-size: 0.625rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.375rem;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  background: #4b5563;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  color: #d1d5db;
  font-size: 0.6875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-item:hover {
  background: #6b7280;
  color: white;
}

.preset-item.active {
  background: #3b82f6;
  border-color: #60a5fa;
  color: white;
}

.preset-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-badge {
  flex-shrink: 0;
  font-size: 0.5rem;
  color: #22d3ee;
}
</style>
