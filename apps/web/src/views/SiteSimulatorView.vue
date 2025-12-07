<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Oklch } from '../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../modules/Color/Domain/ValueObject/Oklch'
import { $Srgb } from '../modules/Color/Domain/ValueObject/Srgb'
import {
  $BrandPrimitive,
  $CorePalette,
  $SemanticPalette,
  $RenderedColor,
  $RenderedPalette,
  type SemanticPalette,
  type SemanticColorToken,
} from '../modules/SiteSimulator/Domain/ValueObject'
import BrandColorPicker from '../components/SiteSimulator/BrandColorPicker.vue'
import AccentSelector from '../components/SiteSimulator/AccentSelector.vue'

// Input state
const brandColorHex = ref('#3B82F6')
const selectedAccentOklch = ref<Oklch | null>(null)

// Convert brand hex to OKLCH for AccentSelector
const brandColorOklch = computed(() => {
  const srgb = $Srgb.fromHex(brandColorHex.value)
  if (!srgb) return $Oklch.create(0.5, 0.15, 250)
  return $Oklch.fromSrgb(srgb)
})

// Accent color as hex (for display and palette generation)
const accentColorHex = computed(() => {
  if (!selectedAccentOklch.value) {
    // Default accent
    return '#F59E0B'
  }
  const srgb = $Oklch.toSrgb(selectedAccentOklch.value)
  return $Srgb.toHex(srgb)
})

// Handle accent selection from AccentSelector
const handleAccentSelect = (accent: Oklch) => {
  selectedAccentOklch.value = accent
}

// Computed palette generation chain
const brandPrimitive = computed(() => $BrandPrimitive.fromHex(brandColorHex.value))
const accentPrimitive = computed(() => $BrandPrimitive.fromHex(accentColorHex.value))

const corePalette = computed(() =>
  $CorePalette.fromBrandPrimitives(brandPrimitive.value, accentPrimitive.value)
)

const semanticPalette = computed(() => $SemanticPalette.fromCorePalette(corePalette.value))

// Render semantic palette to Display-P3
const renderedPalette = computed(() => {
  const colors = new Map<string, ReturnType<typeof $RenderedColor.fromOklch>>()

  // Flatten SemanticPalette into token -> RenderedColor map
  const palette = semanticPalette.value
  const categories: (keyof SemanticPalette)[] = ['surface', 'text', 'brand', 'accent']

  for (const category of categories) {
    const group = palette[category]
    for (const key of Object.keys(group)) {
      const oklch = group[key as keyof typeof group]
      const token = `${category}.${key}` as SemanticColorToken
      colors.set(token, $RenderedColor.fromOklch(oklch))
    }
  }

  return $RenderedPalette.create(colors, 'default', 'none')
})

// Helper to get CSS color for a token
const getCssColor = (token: SemanticColorToken): string => {
  const color = renderedPalette.value.colors.get(token)
  if (!color) return 'transparent'
  return $RenderedColor.toCssP3(color)
}

// Palette display groups
const paletteGroups = computed(() => [
  {
    name: 'Surface',
    tokens: ['surface.base', 'surface.elevated', 'surface.border'] as SemanticColorToken[],
  },
  {
    name: 'Text',
    tokens: ['text.primary', 'text.secondary', 'text.muted', 'text.onBrandPrimary'] as SemanticColorToken[],
  },
  {
    name: 'Brand',
    tokens: ['brand.primary', 'brand.hover', 'brand.active'] as SemanticColorToken[],
  },
  {
    name: 'Accent',
    tokens: ['accent.base', 'accent.hover'] as SemanticColorToken[],
  },
])
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Site Simulator</h1>
      <p class="text-gray-400 mb-8">
        ブランドカラーからパレットを生成し、光源とフィルターを適用してサイトをシミュレート
      </p>

      <!-- Color Selection Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Brand Color -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Brand Color</h2>
          <BrandColorPicker v-model="brandColorHex" />
        </div>

        <!-- Selected Accent Preview -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Selected Accent</h2>
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded border border-gray-600"
              :style="{ backgroundColor: accentColorHex }"
            />
            <div>
              <div class="font-mono text-sm">{{ accentColorHex }}</div>
              <div v-if="selectedAccentOklch" class="text-xs text-gray-500 font-mono mt-1">
                L: {{ selectedAccentOklch.L.toFixed(2) }}
                C: {{ selectedAccentOklch.C.toFixed(2) }}
                H: {{ selectedAccentOklch.H.toFixed(0) }}°
              </div>
              <div v-else class="text-xs text-gray-500 mt-1">
                下のパレットから選択してください
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Accent Color Selection -->
      <div class="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Accent Color Candidates</h2>
        <p class="text-gray-400 text-sm mb-4">
          Brand Colorに合う候補を表示。濃い色がおすすめ、薄い色は相性が低めです。
        </p>
        <AccentSelector
          :brand-color="brandColorOklch"
          :selected-accent="selectedAccentOklch"
          :top-count="10"
          @select="handleAccentSelect"
        />
      </div>

      <!-- Palette Preview -->
      <div class="grid grid-cols-2 gap-8">
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Semantic Palette</h2>
          <div class="space-y-4">
            <div v-for="group in paletteGroups" :key="group.name">
              <h3 class="text-sm text-gray-400 mb-2">{{ group.name }}</h3>
              <div class="flex gap-2">
                <div
                  v-for="token in group.tokens"
                  :key="token"
                  class="flex flex-col items-center"
                >
                  <div
                    class="w-12 h-12 rounded border border-gray-600"
                    :style="{ backgroundColor: getCssColor(token) }"
                  />
                  <span class="text-xs text-gray-500 mt-1">
                    {{ token.split('.')[1] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Light & Filter (placeholder) -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Light & Filter</h2>
          <p class="text-gray-500 text-sm">光源・フィルター選択は Phase 2 で実装</p>
        </div>
      </div>

      <!-- Demo Preview -->
      <div class="bg-gray-800 rounded-lg p-6 mt-8">
        <h2 class="text-xl font-semibold mb-4">Demo Preview</h2>
        <div
          class="rounded-lg p-6"
          :style="{ backgroundColor: getCssColor('surface.base') }"
        >
          <div
            class="rounded-lg p-4 mb-4"
            :style="{
              backgroundColor: getCssColor('surface.elevated'),
              borderColor: getCssColor('surface.border'),
              borderWidth: '1px',
              borderStyle: 'solid',
            }"
          >
            <h3
              class="text-lg font-semibold mb-2"
              :style="{ color: getCssColor('text.primary') }"
            >
              Card Title
            </h3>
            <p :style="{ color: getCssColor('text.secondary') }">
              This is secondary text content.
            </p>
            <p class="mt-1" :style="{ color: getCssColor('text.muted') }">
              Muted helper text
            </p>
          </div>
          <div class="flex gap-3">
            <button
              class="px-4 py-2 rounded font-medium"
              :style="{
                backgroundColor: getCssColor('brand.primary'),
                color: getCssColor('text.onBrandPrimary'),
              }"
            >
              Primary Button
            </button>
            <button
              class="px-4 py-2 rounded font-medium"
              :style="{
                backgroundColor: getCssColor('accent.base'),
                color: getCssColor('text.onBrandPrimary'),
              }"
            >
              Accent Button
            </button>
          </div>
        </div>
      </div>

      <!-- CSS Output -->
      <div class="bg-gray-800 rounded-lg p-6 mt-8">
        <h2 class="text-xl font-semibold mb-4">CSS Variables</h2>
        <pre class="bg-gray-900 p-4 rounded text-sm text-gray-300 overflow-x-auto">{{
          $RenderedPalette.toCssVariables(renderedPalette)
        }}</pre>
      </div>
    </div>
  </div>
</template>
