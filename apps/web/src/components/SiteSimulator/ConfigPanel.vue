<script setup lang="ts">
import { computed } from 'vue'
import type { Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import type { Preset } from '../../modules/Filter/Domain'
import type { FontPreset } from '../../modules/Font/Domain/ValueObject'
import type { StylePackPreset } from '../../modules/StylePack/Domain/ValueObject'
import type { SiteBlueprint } from '../../modules/SiteSimulator/Domain/ValueObject'
import { $SiteBlueprint, $FilterState } from '../../modules/SiteSimulator/Domain/ValueObject'
import BrandColorPicker from './BrandColorPicker.vue'
import AccentSelector from './AccentSelector.vue'
import FilterPanel from '../Filter/FilterPanel.vue'
import type { FilterSetters } from '../../composables/Filter/useFilter'

export type ConfigPage = 'list' | 'brand' | 'accent' | 'filter' | 'font' | 'style'

const props = defineProps<{
  currentPage: ConfigPage
  blueprint: SiteBlueprint
  // Constants (not part of blueprint)
  presets: readonly Preset[]
  fontPresets: readonly FontPreset[]
  stylePackPresets: readonly StylePackPreset[]
  // Filter setters (for FilterPanel compatibility)
  setters: FilterSetters
}>()

const emit = defineEmits<{
  'update:currentPage': [page: ConfigPage]
  'update:blueprint': [blueprint: SiteBlueprint]
  // Filter-specific events (complex logic handled by parent)
  'apply-preset': [preset: Preset]
  'update:masterPoint': [index: number, value: number]
  'reset-filter': []
}>()

// ============================================================
// Computed from Blueprint
// ============================================================

const brandColor = computed(() => props.blueprint.palette.brandColor)
const selectedAccent = computed(() => props.blueprint.palette.accentColor)
const accentColor = computed(() => props.blueprint.palette.accentColor ?? $Oklch.create(0.75, 0.15, 70))
const filter = computed(() => props.blueprint.filterState.filter)
const currentPresetId = computed(() => props.blueprint.filterState.presetId)
const intensity = computed(() => props.blueprint.filterState.intensity)
const selectedFontPresetId = computed(() => props.blueprint.font.presetId)
const selectedStylePresetId = computed(() => props.blueprint.style.presetId)

// ============================================================
// Display Helpers
// ============================================================

const configItems = [
  { id: 'brand' as const, label: 'Brand Color', icon: '🎨' },
  { id: 'accent' as const, label: 'Accent Color', icon: '✨' },
  { id: 'filter' as const, label: 'Color Filter', icon: '🔮' },
  { id: 'font' as const, label: 'Font', icon: '🔤' },
  { id: 'style' as const, label: 'Style', icon: '🎛️' },
]

const currentPresetName = computed(() => {
  if (!currentPresetId.value) return 'No Filter'
  const preset = props.presets.find(p => p.id === currentPresetId.value)
  return preset?.name ?? 'Custom'
})

// Font and style names are stored directly in blueprint
const currentFontName = computed(() => props.blueprint.font.name)

const currentStylePackName = computed(() => {
  // Find preset name by ID for display
  const stylePack = props.stylePackPresets.find(s => s.id === selectedStylePresetId.value)
  return stylePack?.name ?? 'Default'
})

// ============================================================
// Update Handlers
// ============================================================

const navigateToConfig = (page: ConfigPage) => {
  emit('update:currentPage', page)
}

const navigateToList = () => {
  emit('update:currentPage', 'list')
}

const updateBrandColor = (color: Oklch) => {
  emit('update:blueprint', $SiteBlueprint.setBrandColor(props.blueprint, color))
}

const updateAccentColor = (color: Oklch) => {
  emit('update:blueprint', $SiteBlueprint.setAccentColor(props.blueprint, color))
}

const updateIntensity = (value: number) => {
  const newFilterState = $FilterState.setIntensity(props.blueprint.filterState, value)
  emit('update:blueprint', $SiteBlueprint.setFilterState(props.blueprint, newFilterState))
}

const updateFont = (fontPreset: FontPreset) => {
  emit('update:blueprint', $SiteBlueprint.setFont(props.blueprint, fontPreset))
}

const updateStylePack = (stylePreset: StylePackPreset) => {
  emit('update:blueprint', $SiteBlueprint.setStyle(props.blueprint, stylePreset))
}
</script>

<template>
  <aside class="config-panel">
    <!-- Config List View -->
    <div v-if="currentPage === 'list'" class="config-list">
      <button
        v-for="item in configItems"
        :key="item.id"
        class="config-item"
        @click="navigateToConfig(item.id)"
      >
        <span class="config-item-icon">{{ item.icon }}</span>
        <span class="config-item-label">{{ item.label }}</span>
        <div class="config-item-preview">
          <div
            v-if="item.id === 'brand'"
            class="color-swatch"
            :style="{ backgroundColor: $Oklch.toCssP3(brandColor) }"
          />
          <div
            v-if="item.id === 'accent'"
            class="color-swatch"
            :style="{ backgroundColor: $Oklch.toCssP3(accentColor) }"
          />
          <span
            v-if="item.id === 'filter'"
            class="text-xs text-gray-400 truncate max-w-[120px]"
          >
            {{ currentPresetName }}
          </span>
          <span
            v-if="item.id === 'font'"
            class="text-xs text-gray-400 truncate max-w-[120px]"
          >
            {{ currentFontName }}
          </span>
          <span
            v-if="item.id === 'style'"
            class="text-xs text-gray-400 truncate max-w-[120px]"
          >
            {{ currentStylePackName }}
          </span>
        </div>
        <span class="config-item-arrow">›</span>
      </button>
    </div>

    <!-- Brand Color Config -->
    <div v-else-if="currentPage === 'brand'" class="config-page">
      <button class="back-button" @click="navigateToList">
        ‹ Back
      </button>
      <h2 class="text-lg font-semibold mb-4">Brand Color</h2>
      <BrandColorPicker
        :model-value="brandColor"
        @update:model-value="updateBrandColor"
      />
    </div>

    <!-- Accent Color Config -->
    <div v-else-if="currentPage === 'accent'" class="config-page">
      <button class="back-button" @click="navigateToList">
        ‹ Back
      </button>
      <h2 class="text-lg font-semibold mb-4">Accent Color</h2>

      <!-- Selected Accent Preview -->
      <div class="mb-4 flex items-center gap-3">
        <div
          class="w-12 h-12 rounded border border-gray-600"
          :style="{ backgroundColor: $Oklch.toCssP3(accentColor) }"
        />
        <div class="text-xs text-gray-400 font-mono">
          L: {{ accentColor.L.toFixed(2) }}
          C: {{ accentColor.C.toFixed(2) }}
          H: {{ accentColor.H.toFixed(0) }}°
        </div>
      </div>

      <p class="text-gray-400 text-sm mb-3">
        Brand Colorに合う候補を表示
      </p>
      <AccentSelector
        :brand-color="brandColor"
        :selected-accent="selectedAccent"
        :top-count="10"
        @select="updateAccentColor"
      />
    </div>

    <!-- Filter Config -->
    <div v-else-if="currentPage === 'filter'" class="config-page">
      <button class="back-button" @click="navigateToList">
        ‹ Back
      </button>
      <h2 class="text-lg font-semibold mb-4">Color Filter</h2>

      <FilterPanel
        :filter="filter"
        :presets="presets"
        :current-preset-id="currentPresetId"
        :setters="setters"
        :intensity="intensity"
        @apply-preset="emit('apply-preset', $event)"
        @update:master-point="(index, value) => emit('update:masterPoint', index, value)"
        @update:intensity="updateIntensity"
        @reset="emit('reset-filter')"
      />
    </div>

    <!-- Font Config -->
    <div v-else-if="currentPage === 'font'" class="config-page">
      <button class="back-button" @click="navigateToList">
        ‹ Back
      </button>
      <h2 class="text-lg font-semibold mb-4">Font</h2>

      <div class="font-list">
        <button
          v-for="font in fontPresets"
          :key="font.id"
          class="font-item"
          :class="{ active: selectedFontPresetId === font.id }"
          @click="updateFont(font)"
        >
          <span class="font-radio">{{ selectedFontPresetId === font.id ? '●' : '○' }}</span>
          <span class="font-name">{{ font.name }}</span>
          <span class="font-category">{{ font.category }}</span>
        </button>
      </div>
    </div>

    <!-- Style Config -->
    <div v-else-if="currentPage === 'style'" class="config-page">
      <button class="back-button" @click="navigateToList">
        ‹ Back
      </button>
      <h2 class="text-lg font-semibold mb-4">Style</h2>

      <div class="style-list">
        <button
          v-for="stylePack in stylePackPresets"
          :key="stylePack.id"
          class="style-item"
          :class="{ active: selectedStylePresetId === stylePack.id }"
          @click="updateStylePack(stylePack)"
        >
          <span class="style-radio">{{ selectedStylePresetId === stylePack.id ? '●' : '○' }}</span>
          <span class="style-name">{{ stylePack.name }}</span>
          <span class="style-preview">{{ stylePack.style.rounded }} / {{ stylePack.style.gap }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.config-panel {
  background: #1f2937;
  padding: 1.5rem;
  border-right: 1px solid #374151;
  overflow-x: hidden;
  overflow-y: auto;
  min-width: 0;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #374151;
  border: none;
  border-radius: 0.5rem;
  color: white;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  width: 100%;
}

.config-item:hover {
  background: #4b5563;
}

.config-item-icon {
  font-size: 1.25rem;
}

.config-item-label {
  flex: 1;
  font-weight: 500;
}

.config-item-preview {
  display: flex;
  align-items: center;
}

.color-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.config-item-arrow {
  color: #9ca3af;
  font-size: 1.25rem;
}

.config-page {
  animation: slideIn 0.15s ease-out;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.875rem;
}

.back-button:hover {
  color: white;
}

.font-list,
.style-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.font-item,
.style-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: #d1d5db;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: left;
  transition: background 0.15s;
}

.font-item:hover,
.style-item:hover {
  background: #374151;
}

.font-item.active,
.style-item.active {
  background: #374151;
  color: white;
}

.font-radio,
.style-radio {
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
}

.font-name,
.style-name {
  flex: 1;
}

.font-category,
.style-preview {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
