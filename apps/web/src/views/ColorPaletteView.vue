<template>
  <div class="color-palette-view">
    <div class="main-layout">
      <!-- Left: Controls -->
      <div class="controls-panel">
        <h2>Color Palette Generator</h2>

        <!-- Brand Selection -->
        <div class="control-group">
          <label>Brand</label>
          <div class="brand-grid">
            <button
              v-for="brand in brandPresets"
              :key="`${brand.hue}-${brand.lightness}`"
              class="brand-button"
              :class="{ active: generatorConfig.brandHue === brand.hue && generatorConfig.lightness === brand.lightness }"
              :style="{ backgroundColor: `oklch(${brand.lightness} ${brand.chroma} ${brand.hue})` }"
              :title="`H:${brand.hue}°`"
              @click="selectBrand(brand)"
            />
          </div>
        </div>

        <!-- Primary Hue Offset -->
        <div class="control-group">
          <label>Primary</label>
          <div class="offset-buttons">
            <button
              v-for="(preset, key) in hueOffsetPresets"
              :key="key"
              class="offset-button"
              :class="{ active: generatorConfig.primaryHueOffset === key }"
              :style="{ backgroundColor: getOffsetColor(preset.offset) }"
              :title="preset.label"
              @click="generatorConfig.primaryHueOffset = key"
            />
          </div>
        </div>

        <!-- Secondary Hue Offset -->
        <div class="control-group">
          <label>Secondary</label>
          <div class="offset-buttons">
            <button
              v-for="(preset, key) in hueOffsetPresets"
              :key="key"
              class="offset-button"
              :class="{ active: generatorConfig.secondaryHueOffset === key }"
              :style="{ backgroundColor: getOffsetColor(preset.offset) }"
              :title="preset.label"
              @click="generatorConfig.secondaryHueOffset = key"
            />
          </div>
        </div>

        <!-- Dark Mode -->
        <div class="control-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="generatorConfig.isDark" />
            Dark Mode
          </label>
        </div>
      </div>

      <!-- Right: Palette Display -->
      <div class="palette-panel">
        <!-- Color Swatches -->
        <div class="color-swatches">
          <div
            v-for="item in paletteItems"
            :key="item.name"
            class="swatch-item"
            :style="{
              backgroundColor: srgbToCssRgb(item.bg),
              color: srgbToCssRgb(item.fg),
            }"
          >
            <span class="swatch-name">{{ item.name }}</span>
            <span class="swatch-hex">{{ srgbToHex(item.bg) }}</span>
          </div>
        </div>

        <!-- Preview -->
        <div
          class="preview-card"
          :style="{ backgroundColor: srgbToCssRgb(palette.base) }"
        >
          <p :style="{ color: srgbToCssRgb(palette.onBase) }">
            Sample text on base
          </p>
          <div class="preview-buttons">
            <button
              class="preview-btn"
              :style="{
                backgroundColor: srgbToCssRgb(palette.brand),
                color: srgbToCssRgb(palette.onBrand),
              }"
            >Brand</button>
            <button
              class="preview-btn"
              :style="{
                backgroundColor: srgbToCssRgb(palette.primary),
                color: srgbToCssRgb(palette.onPrimary),
              }"
            >Primary</button>
            <button
              class="preview-btn"
              :style="{
                backgroundColor: srgbToCssRgb(palette.secondary),
                color: srgbToCssRgb(palette.onSecondary),
              }"
            >Secondary</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import type { ColorPalette } from '../modules/ColorPalette/Domain/ValueObject'
import {
  generateOklchPalette,
  getDefaultGeneratorConfig,
  HueOffsetPresets,
} from '../modules/ColorPalette/Domain/ValueObject'
import type { PaletteGeneratorConfig } from '../modules/ColorPalette/Domain/ValueObject'
import type { Srgb } from '../modules/Color/Domain/ValueObject'

// Brand プリセット (40種類)
type BrandPreset = { hue: number; lightness: number; chroma: number }
const brandPresets: BrandPreset[] = (() => {
  const presets: BrandPreset[] = []
  for (let row = 0; row < 10; row++) {
    const hue = row * 36
    for (let col = 0; col < 4; col++) {
      const lightness = 0.45 + (col * 0.1)
      const chroma = 0.13 + (col * 0.015)
      presets.push({ hue, lightness, chroma })
    }
  }
  return presets
})()

// OKLCH生成設定
const generatorConfig = reactive<PaletteGeneratorConfig>(getDefaultGeneratorConfig())

// 生成されたパレット
const palette = ref<ColorPalette>(generateOklchPalette(generatorConfig))

// 設定変更時にパレットを再生成
watch(
  generatorConfig,
  () => {
    palette.value = generateOklchPalette(generatorConfig)
  },
  { deep: true }
)

// 色相オフセットプリセット
const hueOffsetPresets = HueOffsetPresets

// パレット表示用アイテム
const paletteItems = computed(() => [
  { name: 'Base', bg: palette.value.base, fg: palette.value.onBase },
  { name: 'Brand', bg: palette.value.brand, fg: palette.value.onBrand },
  { name: 'Primary', bg: palette.value.primary, fg: palette.value.onPrimary },
  { name: 'Secondary', bg: palette.value.secondary, fg: palette.value.onSecondary },
])

// Brand選択
const selectBrand = (brand: BrandPreset) => {
  generatorConfig.brandHue = brand.hue
  generatorConfig.lightness = brand.lightness
  generatorConfig.chromaRange = {
    min: brand.chroma * 0.5,
    max: brand.chroma,
  }
}

// オフセット後の色を取得
const getOffsetColor = (offset: number): string => {
  const hue = ((generatorConfig.brandHue + offset) % 360 + 360) % 360
  return `oklch(${generatorConfig.lightness} ${generatorConfig.chromaRange.max} ${hue})`
}

// ヘルパー関数
const srgbToCssRgb = (color: Srgb): string => {
  return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`
}

const srgbToHex = (color: Srgb): string => {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
}
</script>

<style scoped>
.color-palette-view {
  padding: 1rem;
  height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 700px;
  margin: 0 auto;
}

.main-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  height: 100%;
}

/* Controls Panel */
.controls-panel {
  background: #f8f8f8;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: fit-content;
}

.controls-panel h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #333;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-group > label {
  font-weight: 600;
  font-size: 0.75rem;
  color: #666;
}

/* Brand Grid */
.brand-grid {
  display: grid;
  grid-template-columns: repeat(4, 28px);
  gap: 2px;
}

.brand-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.brand-button:hover {
  transform: scale(1.15);
  z-index: 1;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.brand-button.active {
  border-color: #333;
  box-shadow: 0 0 0 2px white, 0 0 0 3px #333;
}

/* Offset Buttons */
.offset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.offset-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}

.offset-button:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}

.offset-button.active {
  border-color: #333;
  box-shadow: 0 0 0 2px white, 0 0 0 3px #333;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Palette Panel */
.palette-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Color Swatches */
.color-swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.swatch-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: 8px;
  min-height: 80px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.swatch-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.swatch-hex {
  font-family: monospace;
  font-size: 0.7rem;
  opacity: 0.8;
  margin-top: 0.25rem;
}

/* Preview */
.preview-card {
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.preview-card p {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
}

.preview-buttons {
  display: flex;
  gap: 0.5rem;
}

.preview-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s;
}

.preview-btn:hover {
  transform: translateY(-1px);
}
</style>
