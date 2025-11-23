<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { usePhotoUpload } from '../composables/PhotoLocal/usePhotoUpload'
import { usePhotoCanvas } from '../composables/Photo/usePhotoCanvas'
import { usePhotoAnalysis } from '../composables/Photo/usePhotoAnalysis'
import { useFilter } from '../composables/Filter/useFilter'
import HistogramCanvas from '../components/HistogramCanvas.vue'
import PhotoStats from '../components/PhotoStats.vue'
import CurveEditor from '../components/CurveEditor.vue'

const { photo, handleFileChange } = usePhotoUpload()
const { filter, lut, pixelEffects, setExposure, setHighlights, setShadows, setWhites, setBlacks, setBrightness, setContrast, setTemperature, setTint, setClarity, setFade, setVibrance, setSplitShadowHue, setSplitShadowAmount, setSplitHighlightHue, setSplitHighlightAmount, setSplitBalance, setToe, setShoulder, setLiftR, setLiftG, setLiftB, setGammaR, setGammaG, setGammaB, setGainR, setGainG, setGainB, setMasterPoint, reset } = useFilter(7)

// Canvas描画は即時 (軽い)
const { canvasRef } = usePhotoCanvas(photo, { lut, pixelEffects })

// Original analysis (before filter)
const { analysis: originalAnalysis } = usePhotoAnalysis(photo)
// Filtered analysis (after filter)
const { analysis: filteredAnalysis } = usePhotoAnalysis(photo, { lut })

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
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <h1 class="text-3xl font-bold mb-4">Photo Filter</h1>

    <div class="mb-4">
      <label class="block mb-2 text-sm text-gray-400">画像を選択</label>
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

    <div class="flex gap-8 items-start flex-wrap">
      <!-- Canvas -->
      <div class="border border-gray-700 rounded-lg p-4 inline-block">
        <canvas
          ref="canvasRef"
          :class="{ 'hidden': !photo }"
          class="max-w-full h-auto"
        />
        <p v-if="!photo" class="text-gray-500">画像をアップロードしてください</p>
      </div>

      <!-- Controls & Analysis -->
      <div class="space-y-4">
        <!-- Basic Adjustments -->
        <div class="border border-gray-700 rounded-lg p-4">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm text-gray-400">Adjustments</h2>
            <button
              @click="reset"
              class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Reset All
            </button>
          </div>

          <!-- Exposure -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Exposure</span>
              <span>{{ filter.adjustment.exposure >= 0 ? '+' : '' }}{{ filter.adjustment.exposure.toFixed(2) }} EV</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.01"
              :value="filter.adjustment.exposure"
              @input="handleExposureChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Highlights -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Highlights</span>
              <span>{{ filter.adjustment.highlights.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.highlights"
              @input="handleHighlightsChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Shadows -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Shadows</span>
              <span>{{ filter.adjustment.shadows.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.shadows"
              @input="handleShadowsChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Whites -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Whites</span>
              <span>{{ filter.adjustment.whites.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.whites"
              @input="handleWhitesChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Blacks -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Blacks</span>
              <span>{{ filter.adjustment.blacks.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.blacks"
              @input="handleBlacksChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Brightness -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Brightness</span>
              <span>{{ filter.adjustment.brightness.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.brightness"
              @input="handleBrightnessChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Contrast -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Contrast</span>
              <span>{{ filter.adjustment.contrast.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.contrast"
              @input="handleContrastChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Clarity -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Clarity</span>
              <span>{{ filter.adjustment.clarity.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.clarity"
              @input="handleClarityChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Temperature -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Temperature</span>
              <span>{{ filter.adjustment.temperature.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.temperature"
              @input="handleTemperatureChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Tint -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tint</span>
              <span>{{ filter.adjustment.tint.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.tint"
              @input="handleTintChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Fade -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Fade</span>
              <span>{{ filter.adjustment.fade.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="filter.adjustment.fade"
              @input="handleFadeChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Vibrance -->
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Vibrance</span>
              <span>{{ filter.adjustment.vibrance.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.vibrance"
              @input="handleVibranceChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <!-- Split Toning -->
        <div class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Split Toning</h2>

          <!-- Shadows -->
          <div class="mb-4">
            <div class="text-xs text-gray-500 mb-2">Shadows</div>
            <div class="mb-2">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Hue</span>
                <span>{{ Math.round(filter.adjustment.splitShadowHue) }}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                :value="filter.adjustment.splitShadowHue"
                @input="handleSplitShadowHueChange"
                class="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
              />
            </div>
            <div>
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Amount</span>
                <span>{{ filter.adjustment.splitShadowAmount.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="filter.adjustment.splitShadowAmount"
                @input="handleSplitShadowAmountChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <!-- Highlights -->
          <div class="mb-4">
            <div class="text-xs text-gray-500 mb-2">Highlights</div>
            <div class="mb-2">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Hue</span>
                <span>{{ Math.round(filter.adjustment.splitHighlightHue) }}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                :value="filter.adjustment.splitHighlightHue"
                @input="handleSplitHighlightHueChange"
                class="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
              />
            </div>
            <div>
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Amount</span>
                <span>{{ filter.adjustment.splitHighlightAmount.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="filter.adjustment.splitHighlightAmount"
                @input="handleSplitHighlightAmountChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <!-- Balance -->
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Balance</span>
              <span>{{ filter.adjustment.splitBalance.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              :value="filter.adjustment.splitBalance"
              @input="handleSplitBalanceChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <!-- Film Curve -->
        <div class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Film Curve</h2>

          <!-- Toe -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Toe (黒締まり)</span>
              <span>{{ filter.adjustment.toe.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="filter.adjustment.toe"
              @input="handleToeChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <!-- Shoulder -->
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Shoulder (白ロールオフ)</span>
              <span>{{ filter.adjustment.shoulder.toFixed(2) }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="filter.adjustment.shoulder"
              @input="handleShoulderChange"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <!-- Color Balance (Lift/Gamma/Gain) -->
        <div class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Color Balance</h2>

          <!-- Lift (Shadows) -->
          <div class="mb-4">
            <div class="text-xs text-gray-500 mb-2">Lift (Shadows)</div>
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-red-400">R</span>
                <span class="text-gray-500">{{ filter.adjustment.liftR.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.liftR"
                @input="handleLiftRChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-green-400">G</span>
                <span class="text-gray-500">{{ filter.adjustment.liftG.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.liftG"
                @input="handleLiftGChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-blue-400">B</span>
                <span class="text-gray-500">{{ filter.adjustment.liftB.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.liftB"
                @input="handleLiftBChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <!-- Gamma (Midtones) -->
          <div class="mb-4">
            <div class="text-xs text-gray-500 mb-2">Gamma (Midtones)</div>
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-red-400">R</span>
                <span class="text-gray-500">{{ filter.adjustment.gammaR.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.gammaR"
                @input="handleGammaRChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-green-400">G</span>
                <span class="text-gray-500">{{ filter.adjustment.gammaG.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.gammaG"
                @input="handleGammaGChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-blue-400">B</span>
                <span class="text-gray-500">{{ filter.adjustment.gammaB.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.gammaB"
                @input="handleGammaBChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <!-- Gain (Highlights) -->
          <div>
            <div class="text-xs text-gray-500 mb-2">Gain (Highlights)</div>
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-red-400">R</span>
                <span class="text-gray-500">{{ filter.adjustment.gainR.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.gainR"
                @input="handleGainRChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div class="mb-2">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-green-400">G</span>
                <span class="text-gray-500">{{ filter.adjustment.gainG.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.gainG"
                @input="handleGainGChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-blue-400">B</span>
                <span class="text-gray-500">{{ filter.adjustment.gainB.toFixed(2) }}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="filter.adjustment.gainB"
                @input="handleGainBChange"
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <!-- Curve Editor -->
        <div class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-2">Tone Curve</h2>
          <CurveEditor
            :curve="filter.master"
            :width="256"
            :height="150"
            @update:point="handlePointUpdate"
          />
          <div class="mt-2 text-xs text-gray-500">
            ポイントをドラッグして調整
          </div>
        </div>

        <!-- Histograms: Before / After -->
        <div v-if="originalAnalysis && filteredAnalysis" class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Histogram</h2>
          <div class="flex gap-4">
            <div>
              <div class="text-xs text-gray-500 mb-1">Before</div>
              <HistogramCanvas :data="originalAnalysis.histogram" :width="200" :height="80" />
            </div>
            <div>
              <div class="text-xs text-gray-500 mb-1">After</div>
              <HistogramCanvas :data="filteredAnalysis.histogram" :width="200" :height="80" />
            </div>
          </div>
        </div>

        <!-- Stats: Before / After -->
        <div v-if="originalAnalysis && filteredAnalysis" class="border border-gray-700 rounded-lg p-4">
          <h2 class="text-sm text-gray-400 mb-3">Statistics</h2>
          <div class="flex gap-6">
            <div>
              <div class="text-xs text-gray-500 mb-2">Before</div>
              <PhotoStats :stats="originalAnalysis.stats" />
            </div>
            <div class="border-l border-gray-700 pl-6">
              <div class="text-xs text-gray-500 mb-2">After</div>
              <PhotoStats :stats="filteredAnalysis.stats" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
