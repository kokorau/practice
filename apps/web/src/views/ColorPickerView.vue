<script setup lang="ts">
import { ref, computed } from 'vue'
import SvPlane from '../components/ColorPicker/SvPlane.vue'
import HueSlider from '../components/ColorPicker/HueSlider.vue'
import { $Hsv } from '../modules/Color/Domain/ValueObject'

const hue = ref(0)
const saturation = ref(1)
const value = ref(1)

const rgb = computed(() => $Hsv.toSrgb({ h: hue.value, s: saturation.value, v: value.value }))
const hexColor = computed(() => {
  const { r, g, b } = rgb.value
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
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8">
    <h1 class="text-2xl font-bold mb-8">Color Picker</h1>

    <div class="flex gap-8">
      <!-- HSV Picker -->
      <div class="flex flex-col gap-4">
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
      <div class="flex flex-col gap-4">
        <div
          class="w-32 h-32 rounded-lg border border-gray-600"
          :style="{ backgroundColor: hexColor }"
        />
        <div class="font-mono text-lg">{{ hexColor }}</div>
        <div class="text-sm text-gray-400">
          <div>H: {{ Math.round(hue) }}°</div>
          <div>S: {{ Math.round(saturation * 100) }}%</div>
          <div>V: {{ Math.round(value * 100) }}%</div>
        </div>
        <div class="text-sm text-gray-400">
          <div>R: {{ rgb.r }}</div>
          <div>G: {{ rgb.g }}</div>
          <div>B: {{ rgb.b }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
