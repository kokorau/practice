<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Oklch } from '../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../modules/Color/Domain/ValueObject/Oklch'
import {
  $CorePalette,
  $SemanticPalette,
  $RenderedColor,
  $RenderedPalette,
  type SemanticPalette,
  type SemanticColorToken,
} from '../modules/SiteSimulator/Domain/ValueObject'
import { useFilter } from '../composables/Filter/useFilter'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import ConfigPanel from '../components/SiteSimulator/ConfigPanel.vue'
import PreviewPanel from '../components/SiteSimulator/PreviewPanel.vue'

// ============================================================
// Config State
// ============================================================

type ConfigPage = 'list' | 'brand' | 'accent' | 'filter'
const currentConfigPage = ref<ConfigPage>('list')

// Input state - all in OKLCH (no HEX intermediate)
const brandColorOklch = ref<Oklch>($Oklch.create(0.59, 0.18, 250)) // Default blue
const selectedAccentOklch = ref<Oklch | null>(null)

// Accent OKLCH (with default)
const accentOklch = computed(() => {
  if (selectedAccentOklch.value) {
    return selectedAccentOklch.value
  }
  // Default accent (orange)
  return $Oklch.create(0.75, 0.15, 70)
})

// ============================================================
// Filter State
// ============================================================

const PRESETS = getPresets()
const { lut, currentPresetId, applyPreset, reset: resetFilter } = useFilter(7)

// ============================================================
// Palette Generation
// ============================================================

const corePalette = computed(() =>
  $CorePalette.create(
    brandColorOklch.value,
    accentOklch.value,
    $Oklch.create(0.99, 0, 0) // white base (not used in SemanticPalette now)
  )
)

const semanticPalette = computed(() => $SemanticPalette.fromCorePalette(corePalette.value))

// Render semantic palette to Display-P3 with LUT applied
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
      // Apply LUT if present, otherwise direct conversion
      colors.set(token, $RenderedColor.fromOklchWithLut(oklch, lut.value))
    }
  }

  return $RenderedPalette.create(colors, 'default', currentPresetId.value ?? 'none')
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
    tokens: ['surface.base', 'surface.elevated', 'surface.card', 'surface.border'] as SemanticColorToken[],
  },
  {
    name: 'Text',
    tokens: ['text.primary', 'text.secondary', 'text.muted', 'text.onBrandPrimary', 'text.onAccent'] as SemanticColorToken[],
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
  <div class="site-simulator">
    <ConfigPanel
      v-model:current-page="currentConfigPage"
      :brand-color="brandColorOklch"
      :accent-color="accentOklch"
      :selected-accent="selectedAccentOklch"
      :presets="PRESETS"
      :current-preset-id="currentPresetId"
      @update:brand-color="brandColorOklch = $event"
      @update:selected-accent="selectedAccentOklch = $event"
      @apply-preset="applyPreset"
      @reset-filter="resetFilter"
    />

    <PreviewPanel
      :get-css-color="getCssColor"
      :palette-groups="paletteGroups"
      :rendered-palette="renderedPalette"
    />
  </div>
</template>

<style scoped>
.site-simulator {
  display: grid;
  grid-template-columns: 480px 1fr;
  min-height: 100vh;
  background: #111827;
  color: white;
}
</style>
