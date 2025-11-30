<template>
  <div class="color-palette-view">
    <div class="header">
      <h1>Color Palette Presets</h1>
      <p class="description">
        ColorPaletteモジュールのプリセットパレットを閲覧できます
      </p>
    </div>

    <div class="palette-selector">
      <label for="palette-select">パレットを選択:</label>
      <select id="palette-select" v-model="selectedPaletteId" @change="onPaletteChange">
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">
          {{ preset.name }}
        </option>
      </select>
    </div>

    <div v-if="selectedPalette" class="palette-display">
      <h2>{{ selectedPalette.name || selectedPalette.id }}</h2>

      <!-- Semantic Colors -->
      <section class="color-section">
        <h3>Semantic Colors</h3>
        <div class="color-grid">
          <div
            v-for="(color, key) in selectedPalette.semantic"
            :key="key"
            class="color-item"
          >
            <template v-if="color">
              <div
                class="color-swatch"
                :style="{
                  backgroundColor: srgbToCssRgb(color),
                  color: srgbToCssRgb(getContrastColor(color))
                }"
              >
                {{ key }}
              </div>
              <div class="color-info">
                <span class="color-name">{{ key }}</span>
                <span class="color-hex">{{ srgbToHex(color) }}</span>
                <span class="color-rgb">
                  RGB({{ Math.round(color.r * 255) }},
                  {{ Math.round(color.g * 255) }},
                  {{ Math.round(color.b * 255) }})
                </span>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- Gray Scale -->
      <section class="color-section">
        <h3>Gray Scale</h3>
        <div class="grayscale-container">
          <template
            v-for="(color, key) in selectedPalette.grayScale"
            :key="key"
          >
            <div
              v-if="color"
              class="grayscale-item"
              :style="{
                backgroundColor: srgbToCssRgb(color),
              }"
            >
              <span
                class="grayscale-label"
                :style="{
                  color: srgbToCssRgb(getContrastColor(color))
                }"
              >
                {{ key }}
              </span>
            </div>
          </template>
        </div>
      </section>

      <!-- Brand Colors -->
      <section v-if="selectedPalette.brand" class="color-section">
        <h3>Brand Colors</h3>
        <div class="color-grid">
          <div
            v-for="(color, key) in selectedPalette.brand"
            :key="key"
            class="color-item"
          >
            <template v-if="color && typeof color.r === 'number'">
              <div
                class="color-swatch large"
                :style="{
                  backgroundColor: srgbToCssRgb(color as Srgb),
                  color: srgbToCssRgb(getContrastColor(color as Srgb))
                }"
              >
                {{ key }}
              </div>
              <div class="color-info">
                <span class="color-name">{{ key }}</span>
                <span class="color-hex">{{ srgbToHex(color as Srgb) }}</span>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- Albedo Colors (if present) -->
      <section v-if="selectedPalette.albedo" class="color-section">
        <h3>Albedo Colors (LUT変換前の基準色)</h3>
        <div class="color-grid">
          <div
            v-for="(color, key) in selectedPalette.albedo"
            :key="key"
            class="color-item"
          >
            <template v-if="color">
              <div
                class="color-swatch"
                :style="{
                  backgroundColor: srgbToCssRgb(color),
                  color: srgbToCssRgb(getContrastColor(color))
                }"
              >
                {{ key }}
              </div>
              <div class="color-info">
                <span class="color-name">{{ key }}</span>
                <span class="color-hex">{{ srgbToHex(color) }}</span>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- Color Combinations Preview -->
      <section class="color-section">
        <h3>Color Combinations</h3>
        <div class="combination-examples">
          <div
            class="example-card"
            :style="{
              backgroundColor: srgbToCssRgb(selectedPalette.semantic.surface),
              borderColor: srgbToCssRgb(selectedPalette.semantic.outline),
            }"
          >
            <div
              class="example-header"
              :style="{
                backgroundColor: srgbToCssRgb(selectedPalette.semantic.primary),
                color: srgbToCssRgb(selectedPalette.semantic.onPrimary),
              }"
            >
              Primary Surface
            </div>
            <div
              class="example-content"
              :style="{
                color: srgbToCssRgb(selectedPalette.semantic.onSurface),
              }"
            >
              <p>This is how text looks on surface</p>
              <button
                class="example-button"
                :style="{
                  backgroundColor: srgbToCssRgb(selectedPalette.semantic.secondary),
                  color: srgbToCssRgb(selectedPalette.semantic.onSecondary),
                }"
              >
                Secondary Button
              </button>
            </div>
          </div>

          <div
            class="example-card"
            :style="{
              backgroundColor: srgbToCssRgb(selectedPalette.semantic.surfaceVariant),
              borderColor: srgbToCssRgb(selectedPalette.semantic.outline),
            }"
          >
            <div class="example-content">
              <div class="status-examples">
                <div
                  class="status-item"
                  :style="{
                    backgroundColor: srgbToCssRgb(selectedPalette.semantic.success),
                    color: srgbToCssRgb(getContrastColor(selectedPalette.semantic.success)),
                  }"
                >
                  Success
                </div>
                <div
                  class="status-item"
                  :style="{
                    backgroundColor: srgbToCssRgb(selectedPalette.semantic.warning),
                    color: srgbToCssRgb(getContrastColor(selectedPalette.semantic.warning)),
                  }"
                >
                  Warning
                </div>
                <div
                  class="status-item"
                  :style="{
                    backgroundColor: srgbToCssRgb(selectedPalette.semantic.error),
                    color: srgbToCssRgb(getContrastColor(selectedPalette.semantic.error)),
                  }"
                >
                  Error
                </div>
                <div
                  class="status-item"
                  :style="{
                    backgroundColor: srgbToCssRgb(selectedPalette.semantic.info),
                    color: srgbToCssRgb(getContrastColor(selectedPalette.semantic.info)),
                  }"
                >
                  Info
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ColorPalette } from '../modules/ColorPalette/Domain/ValueObject'
import type { Srgb } from '../modules/Color/Domain/ValueObject'
import { $ColorPalette } from '../modules/ColorPalette/Domain/ValueObject'
import {
  createMaterial3Palette,
  createDarkPalette,
  createPastelPalette,
  createHighContrastPalette,
} from '../modules/ColorPalette/Domain/ValueObject'
import {
  srgbToCssRgb,
  srgbToHex,
  getContrastColor,
} from '../modules/ColorPalette/Application/colorHelpers'

// プリセットパレットのリスト
const presets = ref<ColorPalette[]>([
  $ColorPalette.createDefault(),
  createMaterial3Palette({ r: 0.4, g: 0.2, b: 0.8 }),
  createDarkPalette(),
  createPastelPalette(),
  createHighContrastPalette(),
])

// 選択中のパレットID
const selectedPaletteId = ref<string>('default')

// 選択中のパレットオブジェクト
const selectedPalette = computed(() =>
  presets.value.find(p => p.id === selectedPaletteId.value)
)

// パレット変更時の処理
const onPaletteChange = () => {
  console.log('Selected palette:', selectedPaletteId.value)
}
</script>

<style scoped>
.color-palette-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.description {
  color: #666;
  margin: 0;
}

.palette-selector {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.palette-selector label {
  margin-right: 1rem;
  font-weight: 600;
}

.palette-selector select {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.palette-display h2 {
  color: #333;
  margin-bottom: 2rem;
}

.color-section {
  margin-bottom: 3rem;
}

.color-section h3 {
  color: #555;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.color-item {
  display: flex;
  flex-direction: column;
}

.color-swatch {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.color-swatch.large {
  height: 120px;
}

.color-info {
  background: white;
  border: 1px solid #e0e0e0;
  border-top: none;
  padding: 0.75rem;
  border-radius: 0 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-name {
  font-weight: 600;
  color: #333;
}

.color-hex {
  font-family: monospace;
  color: #666;
  font-size: 0.875rem;
}

.color-rgb {
  font-family: monospace;
  color: #999;
  font-size: 0.75rem;
}

.grayscale-container {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.grayscale-item {
  flex: 1;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.grayscale-label {
  font-size: 0.75rem;
  font-weight: 600;
  transform: rotate(-45deg);
}

.combination-examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.example-card {
  border-radius: 12px;
  border: 2px solid;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.example-header {
  padding: 1rem;
  font-weight: 600;
}

.example-content {
  padding: 1.5rem;
}

.example-content p {
  margin: 0 0 1rem 0;
}

.example-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.example-button:hover {
  transform: translateY(-2px);
}

.status-examples {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-item {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
}
</style>