<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SemanticColorToken } from '../modules/SiteSimulator/Domain/ValueObject'
import { $RenderedColor } from '../modules/SiteSimulator/Domain/ValueObject'
import { useSiteBlueprint } from '../composables/SiteSimulator/useSiteBlueprint'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { GoogleFontPresets } from '../assets/constants/GoogleFontPresets'
import { StylePackPresets } from '../modules/StylePack/Domain/ValueObject'
import ConfigPanel, { type ConfigPage } from '../components/SiteSimulator/ConfigPanel.vue'
import PreviewPanel from '../components/SiteSimulator/PreviewPanel.vue'

// ============================================================
// SiteBlueprint State (single source of truth)
// ============================================================

const {
  blueprint,
  renderedPalette,
  currentFont,
  currentStylePack,
  // Filter actions (complex logic)
  applyPreset,
  setMasterPoint,
  resetFilter,
  setters,
} = useSiteBlueprint()

// ============================================================
// UI State (not part of SiteBlueprint)
// ============================================================

const currentConfigPage = ref<ConfigPage>('list')
const PRESETS = getPresets()

// ============================================================
// Helpers
// ============================================================

const getCssColor = (token: SemanticColorToken): string => {
  const color = renderedPalette.value.colors.get(token)
  if (!color) return 'transparent'
  return $RenderedColor.toCssP3(color)
}

const sections = computed(() => blueprint.value.sections)

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
      :blueprint="blueprint"
      :presets="PRESETS"
      :font-presets="GoogleFontPresets"
      :style-pack-presets="StylePackPresets"
      :setters="setters"
      @update:blueprint="blueprint = $event"
      @apply-preset="applyPreset"
      @update:master-point="setMasterPoint"
      @reset-filter="resetFilter"
    />

    <PreviewPanel
      :sections="sections"
      :get-css-color="getCssColor"
      :palette-groups="paletteGroups"
      :rendered-palette="renderedPalette"
      :font="currentFont"
      :style-pack="currentStylePack"
    />
  </div>
</template>

<style scoped>
.site-simulator {
  display: grid;
  grid-template-columns: 480px 1fr;
  height: 100vh;
  overflow: hidden;
  background: #111827;
  color: white;
}
</style>
