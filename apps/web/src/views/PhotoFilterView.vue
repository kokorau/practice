<script setup lang="ts">
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { usePhotoUpload } from '../composables/PhotoLocal/usePhotoUpload'
import { usePhotoCanvas } from '../composables/Photo/usePhotoCanvas'
import { usePhotoAnalysis } from '../composables/Photo/usePhotoAnalysis'
import { useFilter } from '../composables/Filter/useFilter'
import { PRESETS } from '../modules/Filter/Domain'
import HistogramCanvas from '../components/HistogramCanvas.vue'
import PhotoStats from '../components/PhotoStats.vue'
import CurveEditor from '../components/CurveEditor.vue'

const { photo, handleFileChange } = usePhotoUpload()
const { filter, lut, pixelEffects, currentPresetId, applyPreset, setExposure, setHighlights, setShadows, setWhites, setBlacks, setBrightness, setContrast, setTemperature, setTint, setClarity, setFade, setVibrance, setSplitShadowHue, setSplitShadowAmount, setSplitHighlightHue, setSplitHighlightAmount, setSplitBalance, setToe, setShoulder, setLiftR, setLiftG, setLiftB, setGammaR, setGammaG, setGammaB, setGainR, setGainG, setGainB, setMasterPoint, reset } = useFilter(7)


// Canvas描画は即時 (軽い)
const { canvasRef } = usePhotoCanvas(photo, { lut, pixelEffects })

// Original analysis (before filter)
const { analysis: originalAnalysis } = usePhotoAnalysis(photo)
// Filtered analysis (after filter)
const { analysis: filteredAnalysis } = usePhotoAnalysis(photo, { lut })

// タブ状態
type TabId = 'source' | 'edit'
const activeTab = ref<TabId>('source')

// デバウンスされた更新関数 (重い処理の負荷軽減)
const debouncedSetExposure = useDebounceFn(setExposure, 16)
const debouncedSetHighlights = useDebounceFn(setHighlights, 16)
const debouncedSetShadows = useDebounceFn(setShadows, 16)
const debouncedSetWhites = useDebounceFn(setWhites, 16)
const debouncedSetBlacks = useDebounceFn(setBlacks, 16)
const debouncedSetBrightness = useDebounceFn(setBrightness, 16)
const debouncedSetContrast = useDebounceFn(setContrast, 16)
const debouncedSetTemperature = useDebounceFn(setTemperature, 16)
const debouncedSetTint = useDebounceFn(setTint, 16)
const debouncedSetClarity = useDebounceFn(setClarity, 16)
const debouncedSetFade = useDebounceFn(setFade, 16)
const debouncedSetVibrance = useDebounceFn(setVibrance, 16)
const debouncedSetSplitShadowHue = useDebounceFn(setSplitShadowHue, 16)
const debouncedSetSplitShadowAmount = useDebounceFn(setSplitShadowAmount, 16)
const debouncedSetSplitHighlightHue = useDebounceFn(setSplitHighlightHue, 16)
const debouncedSetSplitHighlightAmount = useDebounceFn(setSplitHighlightAmount, 16)
const debouncedSetSplitBalance = useDebounceFn(setSplitBalance, 16)
const debouncedSetToe = useDebounceFn(setToe, 16)
const debouncedSetShoulder = useDebounceFn(setShoulder, 16)
const debouncedSetLiftR = useDebounceFn(setLiftR, 16)
const debouncedSetLiftG = useDebounceFn(setLiftG, 16)
const debouncedSetLiftB = useDebounceFn(setLiftB, 16)
const debouncedSetGammaR = useDebounceFn(setGammaR, 16)
const debouncedSetGammaG = useDebounceFn(setGammaG, 16)
const debouncedSetGammaB = useDebounceFn(setGammaB, 16)
const debouncedSetGainR = useDebounceFn(setGainR, 16)
const debouncedSetGainG = useDebounceFn(setGainG, 16)
const debouncedSetGainB = useDebounceFn(setGainB, 16)
const debouncedSetMasterPoint = useDebounceFn(setMasterPoint, 16)

const handlePointUpdate = (index: number, value: number) => {
  debouncedSetMasterPoint(index, value)
}

const handleExposureChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetExposure(value)
}

const handleHighlightsChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetHighlights(value)
}

const handleShadowsChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetShadows(value)
}

const handleWhitesChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetWhites(value)
}

const handleBlacksChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetBlacks(value)
}

const handleBrightnessChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetBrightness(value)
}

const handleContrastChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetContrast(value)
}

const handleTemperatureChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetTemperature(value)
}

const handleTintChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetTint(value)
}

const handleClarityChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetClarity(value)
}

const handleFadeChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetFade(value)
}

const handleVibranceChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetVibrance(value)
}

const handleSplitShadowHueChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetSplitShadowHue(value)
}

const handleSplitShadowAmountChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetSplitShadowAmount(value)
}

const handleSplitHighlightHueChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetSplitHighlightHue(value)
}

const handleSplitHighlightAmountChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetSplitHighlightAmount(value)
}

const handleSplitBalanceChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetSplitBalance(value)
}

const handleToeChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetToe(value)
}

const handleShoulderChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetShoulder(value)
}

const handleLiftRChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetLiftR(value)
}

const handleLiftGChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetLiftG(value)
}

const handleLiftBChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetLiftB(value)
}

const handleGammaRChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetGammaR(value)
}

const handleGammaGChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetGammaG(value)
}

const handleGammaBChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetGammaB(value)
}

const handleGainRChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetGainR(value)
}

const handleGainGChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetGainG(value)
}

const handleGainBChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  debouncedSetGainB(value)
}
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex justify-center">
    <div class="flex w-[1200px] max-w-full">
    <!-- Left Panel: Tabs + Controls -->
    <div class="w-80 flex-shrink-0 border-r border-gray-700 flex flex-col">
      <!-- Tab Headers -->
      <div class="flex border-b border-gray-700">
        <button
          @click="activeTab = 'source'"
          :class="[
            'flex-1 px-2 py-2 text-xs font-medium transition-colors',
            activeTab === 'source'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          ]"
        >
          Source
        </button>
        <button
          @click="activeTab = 'edit'"
          :class="[
            'flex-1 px-2 py-2 text-xs font-medium transition-colors',
            activeTab === 'edit'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          ]"
        >
          Edit
        </button>
      </div>

      <!-- Tab Content (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Source Tab -->
        <div v-if="activeTab === 'source'" class="space-y-4">
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Upload</h2>
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                cursor-pointer"
            />
          </div>
        </div>

        <!-- Edit Tab (Presets + Adjustments) -->
        <div v-if="activeTab === 'edit'" class="space-y-3">
        <!-- Presets (コンパクト) -->
        <div class="border border-gray-700 rounded-lg p-2">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in PRESETS"
              :key="preset.id"
              @click="applyPreset(preset)"
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
              @click="reset"
              class="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-400"
              style="font-size: 10px;"
            >
              Reset
            </button>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Exposure</span>
              <input type="range" min="-2" max="2" step="0.01" :value="filter.adjustment.exposure" @input="handleExposureChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Highlights</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.highlights" @input="handleHighlightsChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shadows</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.shadows" @input="handleShadowsChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Whites</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.whites" @input="handleWhitesChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Blacks</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.blacks" @input="handleBlacksChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Brightness</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.brightness" @input="handleBrightnessChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Contrast</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.contrast" @input="handleContrastChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Clarity</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.clarity" @input="handleClarityChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Temp</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.temperature" @input="handleTemperatureChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Tint</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.tint" @input="handleTintChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Fade</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.fade" @input="handleFadeChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Vibrance</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.vibrance" @input="handleVibranceChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Split Toning -->
        <div class="border border-gray-700 rounded-lg p-3">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Split Toning</h2>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Sh Hue</span>
              <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitShadowHue" @input="handleSplitShadowHueChange" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Sh Amt</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitShadowAmount" @input="handleSplitShadowAmountChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hi Hue</span>
              <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitHighlightHue" @input="handleSplitHighlightHueChange" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hi Amt</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitHighlightAmount" @input="handleSplitHighlightAmountChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Balance</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.splitBalance" @input="handleSplitBalanceChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Film Curve -->
        <div class="border border-gray-700 rounded-lg p-3">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Film Curve</h2>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Toe</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.toe" @input="handleToeChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shoulder</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.shoulder" @input="handleShoulderChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
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
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftR" @input="handleLiftRChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-400 w-16 flex-shrink-0">Lift G</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftG" @input="handleLiftGChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-blue-400 w-16 flex-shrink-0">Lift B</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftB" @input="handleLiftBChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <!-- Gamma -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-red-400 w-16 flex-shrink-0">Gamma R</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaR" @input="handleGammaRChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-400 w-16 flex-shrink-0">Gamma G</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaG" @input="handleGammaGChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-blue-400 w-16 flex-shrink-0">Gamma B</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaB" @input="handleGammaBChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <!-- Gain -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-red-400 w-16 flex-shrink-0">Gain R</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainR" @input="handleGainRChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-400 w-16 flex-shrink-0">Gain G</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainG" @input="handleGainGChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-blue-400 w-16 flex-shrink-0">Gain B</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainB" @input="handleGainBChange" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
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
      </div>
    </div>

    <!-- Right Panel: Preview + Analysis -->
    <div class="flex-1 flex flex-col min-w-0 p-4 gap-4 overflow-auto">
      <!-- Preview Area (16:9 container) -->
      <div class="flex-shrink-0">
        <div class="relative w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden" style="aspect-ratio: 16/9;">
          <div class="absolute inset-0 flex items-center justify-center">
            <canvas
              ref="canvasRef"
              :class="{ 'hidden': !photo }"
              class="max-w-full max-h-full object-contain"
            />
            <p v-if="!photo" class="text-gray-500">
              画像をアップロードしてください
            </p>
          </div>
        </div>
      </div>

      <!-- Histogram & Statistics -->
      <div v-if="originalAnalysis && filteredAnalysis" class="grid grid-cols-2 gap-4 flex-shrink-0">
        <!-- Histogram (縦並び) -->
        <div class="border border-gray-700 rounded-lg p-3 bg-gray-800">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Histogram</h2>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-8 flex-shrink-0">Bfr</span>
              <HistogramCanvas :data="originalAnalysis.histogram" :width="300" :height="50" class="flex-1" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-8 flex-shrink-0">Aft</span>
              <HistogramCanvas :data="filteredAnalysis.histogram" :width="300" :height="50" class="flex-1" />
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="border border-gray-700 rounded-lg p-3 bg-gray-800 min-w-0">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Statistics</h2>
          <div class="grid grid-cols-2 gap-6">
            <div class="min-w-0">
              <span class="text-xs text-gray-500">Before</span>
              <PhotoStats :stats="originalAnalysis.stats" />
            </div>
            <div class="min-w-0">
              <span class="text-xs text-gray-500">After</span>
              <PhotoStats :stats="filteredAnalysis.stats" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
