<script setup lang="ts">
import { ref, computed } from 'vue'
import SvPlane from '../components/ColorPicker/SvPlane.vue'
import HueSlider from '../components/ColorPicker/HueSlider.vue'
import RgbCubeViewer from '../components/ColorPicker/RgbCubeViewer.vue'
import HslCylinderViewer from '../components/ColorPicker/HslCylinderViewer.vue'
import FilterPanel from '../components/Filter/FilterPanel.vue'
import { $Hsv, $Hsl } from '../modules/Color/Domain/ValueObject'
import { useFilter } from '../composables/Filter/useFilter'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'

const PRESETS = getPresets()

const hue = ref(0)
const saturation = ref(1)
const value = ref(1)

const rgb = computed(() => $Hsv.toSrgb({ h: hue.value, s: saturation.value, v: value.value }))
const hsl = computed(() => $Hsl.fromSrgb(rgb.value))
const hexColor = computed(() => {
  const { r, g, b } = rgb.value
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
})

// Filter / LUT
const { filter, lut, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter()

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

      <!-- Right Panel: Color Picker + Preview + RGB Cube -->
      <div class="flex-1 flex flex-col min-w-0 p-4 gap-4 overflow-auto">
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

          <!-- Color Preview -->
          <div class="flex flex-col gap-2" style="margin-left: -100px;">
            <div
              class="w-20 h-20 rounded-lg border border-gray-600"
              :style="{ backgroundColor: hexColor }"
            />
            <div class="font-mono text-sm">{{ hexColor }}</div>
            <div class="text-xs text-gray-400">
              <div>H: {{ Math.round(hue) }}° S: {{ Math.round(saturation * 100) }}% V: {{ Math.round(value * 100) }}%</div>
            </div>
            <div class="text-xs text-gray-400">
              <div>R: {{ rgb.r }} G: {{ rgb.g }} B: {{ rgb.b }}</div>
            </div>
          </div>

          <!-- RGB Cube Viewer -->
          <div class="flex flex-col gap-1 flex-shrink-0">
            <div class="text-xs text-gray-500 text-center">RGB Cube</div>
            <div class="w-72 h-72 border border-gray-600 rounded-lg overflow-hidden">
              <RgbCubeViewer :r="rgb.r" :g="rgb.g" :b="rgb.b" :lut="lut" />
            </div>
          </div>

          <!-- HSL Cylinder Viewer -->
          <div class="flex flex-col gap-1 flex-shrink-0">
            <div class="text-xs text-gray-500 text-center">HSL Cylinder</div>
            <div class="w-72 h-72 border border-gray-600 rounded-lg overflow-hidden">
              <HslCylinderViewer :h="hsl.h" :s="hsl.s" :l="hsl.l" :lut="lut" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
