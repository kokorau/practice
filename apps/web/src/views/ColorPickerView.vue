<script setup lang="ts">
import { ref, computed } from 'vue'
import SvPlane from '../components/ColorPicker/SvPlane.vue'
import HueSlider from '../components/ColorPicker/HueSlider.vue'
import RgbCubeViewer from '../components/ColorPicker/RgbCubeViewer.vue'
import HslCylinderViewer from '../components/ColorPicker/HslCylinderViewer.vue'
import HsvConeViewer from '../components/ColorPicker/HsvConeViewer.vue'
import ColorGridViewer from '../components/ColorPicker/ColorGridViewer.vue'
import FilterPanel from '../components/Filter/FilterPanel.vue'
import { $Hsv, $Hsl } from '../modules/Color/Domain/ValueObject'
import { useFilter } from '../composables/Filter/useFilter'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { $Lut3D } from '../modules/Filter/Domain/ValueObject/Lut'

const PRESETS = getPresets()

// Filter / LUT
const { filter, lut, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter()

const hue = ref(0)
const saturation = ref(1)
const value = ref(1)

const rgb = computed(() => $Hsv.toSrgb({ h: hue.value, s: saturation.value, v: value.value }))
const hsl = computed(() => $Hsl.fromSrgb(rgb.value))
const hexColor = computed(() => {
  const { r, g, b } = rgb.value
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
})

// LUT適用後の色
const rgbAfter = computed(() => {
  if (!lut.value) return rgb.value
  const { r, g, b } = rgb.value
  if ($Lut3D.is(lut.value)) {
    const [rt, gt, bt] = $Lut3D.lookup(lut.value, r / 255, g / 255, b / 255)
    return { r: Math.round(rt * 255), g: Math.round(gt * 255), b: Math.round(bt * 255) }
  } else {
    return { r: Math.round(lut.value.r[r]! * 255), g: Math.round(lut.value.g[g]! * 255), b: Math.round(lut.value.b[b]! * 255) }
  }
})
const hexColorAfter = computed(() => {
  const { r, g, b } = rgbAfter.value
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
})

function onSvChange(s: number, v: number) {
  saturation.value = s
  value.value = v
}

function onHueChange(h: number) {
  hue.value = h
}
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex justify-center">
    <div class="flex w-[1400px] max-w-full">
      <!-- Left Panel: Filter Controls -->
      <div class="w-120 flex-shrink-0 border-r border-gray-700 flex flex-col">
        <div class="flex-1 overflow-y-auto p-4">
          <FilterPanel
            :filter="filter"
            :presets="PRESETS"
            :current-preset-id="currentPresetId"
            :setters="setters"
            @apply-preset="applyPreset"
            @update:master-point="setMasterPoint"
            @reset="reset"
          />
        </div>
      </div>

      <!-- Right Panel: Color Picker + 3D Viewers -->
      <div class="flex-1 flex flex-col min-w-0 p-4 gap-6 overflow-auto">
        <!-- Section 1: Color Picker + Color Grid -->
        <div class="flex gap-6 items-start">
          <!-- HSV Picker (60% scale) -->
          <div class="flex flex-col gap-2 origin-top-left" style="transform: scale(0.6);">
            <SvPlane
              :hue="hue"
              :saturation="saturation"
              :value="value"
              @change="onSvChange"
            />
            <HueSlider
              :hue="hue"
              @change="onHueChange"
            />
          </div>

          <!-- Color Preview (Before → After) -->
          <div class="flex flex-col gap-1" style="margin-left: -100px;">
            <div class="flex items-center gap-2">
              <div
                class="w-10 h-10 rounded border border-gray-600"
                :style="{ backgroundColor: hexColor }"
                title="Before"
              />
              <span class="text-gray-500 text-xs">→</span>
              <div
                class="w-10 h-10 rounded border border-gray-600"
                :style="{ backgroundColor: hexColorAfter }"
                title="After"
              />
            </div>
            <div class="font-mono text-xs text-gray-400">
              {{ hexColor }} → {{ hexColorAfter }}
            </div>
          </div>

          <!-- Color Grid Viewer -->
          <div class="flex flex-col gap-1 flex-1">
            <div class="text-xs text-gray-500">Color Grid (20 hues × 10 shades)</div>
            <div class="border border-gray-600 rounded-lg overflow-hidden">
              <ColorGridViewer :lut="lut" />
            </div>
          </div>
        </div>

        <!-- Section 2: RGB Cube + HSL Cylinder + HSV Cone -->
        <div class="flex gap-4 flex-wrap">
          <!-- RGB Cube Viewer -->
          <div class="flex flex-col gap-1 flex-1 min-w-48">
            <div class="text-xs text-gray-500 text-center">RGB Cube</div>
            <div class="aspect-square border border-gray-600 rounded-lg overflow-hidden">
              <RgbCubeViewer :r="rgb.r" :g="rgb.g" :b="rgb.b" :lut="lut" />
            </div>
          </div>

          <!-- HSL Cylinder Viewer -->
          <div class="flex flex-col gap-1 flex-1 min-w-48">
            <div class="text-xs text-gray-500 text-center">HSL Cylinder</div>
            <div class="aspect-square border border-gray-600 rounded-lg overflow-hidden">
              <HslCylinderViewer :h="hsl.h" :s="hsl.s" :l="hsl.l" :lut="lut" />
            </div>
          </div>

          <!-- HSV Cone Viewer -->
          <div class="flex flex-col gap-1 flex-1 min-w-48">
            <div class="text-xs text-gray-500 text-center">HSV Cone</div>
            <div class="aspect-square border border-gray-600 rounded-lg overflow-hidden">
              <HsvConeViewer :h="hue" :s="saturation" :v="value" :lut="lut" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
