<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  createVisibleSpectrum,
  type Spectrum,
} from '../modules/Spectrum/Domain/ValueObject/Spectrum'
import { SpectrumRenderer } from '../modules/Spectrum/Infra/WebGL/SpectrumRenderer'

const canvasRef = ref<HTMLCanvasElement>()
let renderer: SpectrumRenderer | null = null

// サンプルスペクトラムを作成（テスト用）
const spectrum = ref<Spectrum>(createVisibleSpectrum(81, 0))

// スペクトラム編集用パラメータ
const peakWavelength = ref(550) // nm
const peakWidth = ref(50) // nm
const peakIntensity = ref(1.0)

// ガウシアンピークを生成
function updateSpectrum() {
  const s = createVisibleSpectrum(81, 0)
  const sigma = peakWidth.value / 2.355 // FWHM to sigma

  for (let i = 0; i < s.wavelengths.length; i++) {
    const wl = s.wavelengths[i]!
    const diff = wl - peakWavelength.value
    s.values[i] = peakIntensity.value * Math.exp(-(diff * diff) / (2 * sigma * sigma))
  }

  spectrum.value = s
}

// プリセットスペクトラム
function setDaylightSpectrum() {
  const s = createVisibleSpectrum(81, 0)
  // D65 daylight approximation
  for (let i = 0; i < s.wavelengths.length; i++) {
    const wl = s.wavelengths[i]!
    // Planck's law approximation for ~6500K
    const t = 6500
    const c1 = 3.74183e-16
    const c2 = 1.4388e-2
    const wlM = wl * 1e-9
    s.values[i] = (c1 / Math.pow(wlM, 5)) / (Math.exp(c2 / (wlM * t)) - 1)
  }
  // 正規化
  const max = Math.max(...s.values)
  for (let i = 0; i < s.values.length; i++) {
    s.values[i]! /= max
  }
  spectrum.value = s
}

function setRedLaserSpectrum() {
  peakWavelength.value = 650
  peakWidth.value = 5
  peakIntensity.value = 1.0
  updateSpectrum()
}

function setGreenLaserSpectrum() {
  peakWavelength.value = 532
  peakWidth.value = 5
  peakIntensity.value = 1.0
  updateSpectrum()
}

function setBlueLedSpectrum() {
  peakWavelength.value = 460
  peakWidth.value = 25
  peakIntensity.value = 1.0
  updateSpectrum()
}

function setFlatSpectrum() {
  const s = createVisibleSpectrum(81, 1.0)
  spectrum.value = s
}

// レンダリング
function renderFrame() {
  if (renderer && spectrum.value) {
    renderer.render(spectrum.value)
  }
}

watch([peakWavelength, peakWidth, peakIntensity], () => {
  updateSpectrum()
})

watch(spectrum, () => {
  renderFrame()
})

onMounted(() => {
  if (canvasRef.value) {
    // キャンバスサイズを設定
    const rect = canvasRef.value.getBoundingClientRect()
    canvasRef.value.width = rect.width * window.devicePixelRatio
    canvasRef.value.height = rect.height * window.devicePixelRatio

    renderer = new SpectrumRenderer({ canvas: canvasRef.value })
    updateSpectrum()
  }
})

onUnmounted(() => {
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex flex-col">
    <div class="p-4 border-b border-gray-700">
      <h1 class="text-xl font-bold">Spectrum Viewer</h1>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- 左パネル: コントロール -->
      <div class="w-80 flex-shrink-0 border-r border-gray-700 p-4 overflow-y-auto">
        <div class="space-y-6">
          <!-- プリセット -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Presets</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                class="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                @click="setDaylightSpectrum"
              >
                Daylight (D65)
              </button>
              <button
                class="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                @click="setFlatSpectrum"
              >
                Flat White
              </button>
              <button
                class="px-3 py-2 text-sm bg-red-900 hover:bg-red-800 rounded"
                @click="setRedLaserSpectrum"
              >
                Red Laser
              </button>
              <button
                class="px-3 py-2 text-sm bg-green-900 hover:bg-green-800 rounded"
                @click="setGreenLaserSpectrum"
              >
                Green Laser
              </button>
              <button
                class="px-3 py-2 text-sm bg-blue-900 hover:bg-blue-800 rounded"
                @click="setBlueLedSpectrum"
              >
                Blue LED
              </button>
            </div>
          </div>

          <!-- ガウシアンピーク編集 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Gaussian Peak</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">
                  Peak Wavelength: {{ peakWavelength }} nm
                </label>
                <input
                  v-model.number="peakWavelength"
                  type="range"
                  min="380"
                  max="780"
                  step="1"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">
                  Peak Width (FWHM): {{ peakWidth }} nm
                </label>
                <input
                  v-model.number="peakWidth"
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">
                  Intensity: {{ peakIntensity.toFixed(2) }}
                </label>
                <input
                  v-model.number="peakIntensity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- 情報表示 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Info</h2>
            <div class="text-xs text-gray-500 space-y-1">
              <p>Samples: {{ spectrum.values.length }}</p>
              <p>Range: {{ spectrum.wavelengths[0]?.toFixed(0) }} - {{ spectrum.wavelengths[spectrum.wavelengths.length - 1]?.toFixed(0) }} nm</p>
              <p>Max Value: {{ Math.max(...spectrum.values).toFixed(3) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右パネル: スペクトラム表示 -->
      <div class="flex-1 p-4">
        <div class="h-full border border-gray-700 rounded-lg overflow-hidden">
          <canvas
            ref="canvasRef"
            class="w-full h-full"
          />
        </div>
      </div>
    </div>
  </div>
</template>
