<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  createVisibleSpectrum,
  copySpectrum,
  type Spectrum,
} from '../modules/Spectrum/Domain/ValueObject/Spectrum'
import { spectrumToSrgb, spectrumToXYZ } from '../modules/Spectrum/Domain/ValueObject/WavelengthToRgb'
import { getLightSpectrumPresets, type LightSpectrumPreset } from '../modules/Spectrum/Application/GetLightSpectrumPresets'
import { SpectrumRenderer } from '../modules/Spectrum/Infra/WebGL/SpectrumRenderer'

const canvasRef = ref<HTMLCanvasElement>()
let renderer: SpectrumRenderer | null = null

// プリセット一覧を取得
const presets = getLightSpectrumPresets()
const selectedPresetId = ref<string | null>(null)

// サンプルスペクトラムを作成（テスト用）
const spectrum = ref<Spectrum>(createVisibleSpectrum(81, 0))

// スペクトラムから計算した色
const computedColor = computed(() => spectrumToSrgb(spectrum.value))
const computedXYZ = computed(() => spectrumToXYZ(spectrum.value))

// RGB を CSS色文字列に変換
const colorHex = computed(() => {
  const { r, g, b } = computedColor.value
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
})

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
  selectedPresetId.value = null
}

// プリセットを適用
function applyPreset(preset: LightSpectrumPreset) {
  spectrum.value = copySpectrum(preset.spectrum)
  selectedPresetId.value = preset.id
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

    // 初期プリセットを適用
    const defaultPreset = presets.find(p => p.id === 'daylight-d65')
    if (defaultPreset) {
      applyPreset(defaultPreset)
    } else {
      updateSpectrum()
    }
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
            <div class="flex flex-col gap-1">
              <button
                v-for="preset in presets"
                :key="preset.id"
                class="flex items-center gap-2 px-3 py-2 text-sm text-left rounded transition-colors"
                :class="selectedPresetId === preset.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'"
                @click="applyPreset(preset)"
              >
                <div
                  class="w-4 h-4 rounded-sm border border-gray-500 flex-shrink-0"
                  :style="{
                    backgroundColor: `rgb(${Math.round(preset.color.r * 255)}, ${Math.round(preset.color.g * 255)}, ${Math.round(preset.color.b * 255)})`
                  }"
                />
                {{ preset.name }}
              </button>
            </div>
          </div>

          <!-- ガウシアンピーク編集 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Custom Gaussian Peak</h2>
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

          <!-- 計算結果の色 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Perceived Color</h2>
            <div class="flex items-center gap-4">
              <div
                class="w-20 h-20 rounded-lg border border-gray-600 shadow-lg"
                :style="{ backgroundColor: colorHex }"
              />
              <div class="text-xs space-y-1">
                <p class="font-mono text-white">{{ colorHex }}</p>
                <p class="text-gray-500">
                  R: {{ (computedColor.r * 255).toFixed(0) }}
                  G: {{ (computedColor.g * 255).toFixed(0) }}
                  B: {{ (computedColor.b * 255).toFixed(0) }}
                </p>
              </div>
            </div>
          </div>

          <!-- XYZ値 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">CIE XYZ</h2>
            <div class="text-xs text-gray-500 font-mono space-y-1">
              <p>X: {{ computedXYZ.x.toFixed(4) }}</p>
              <p>Y: {{ computedXYZ.y.toFixed(4) }}</p>
              <p>Z: {{ computedXYZ.z.toFixed(4) }}</p>
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
