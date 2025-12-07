<script setup lang="ts">
import { computed } from 'vue'
import type { Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import type { Filter, Preset } from '../../modules/Filter/Domain'
import BrandColorPicker from './BrandColorPicker.vue'
import AccentSelector from './AccentSelector.vue'
import FilterPanel from '../Filter/FilterPanel.vue'
import type { FilterSetters } from '../../composables/Filter/useFilter'

type ConfigPage = 'list' | 'brand' | 'accent' | 'filter'

const props = defineProps<{
  currentPage: ConfigPage
  brandColor: Oklch
  accentColor: Oklch
  selectedAccent: Oklch | null
  // Filter props
  filter: Filter
  presets: readonly Preset[]
  currentPresetId: string | null
  setters: FilterSetters
  intensity: number
}>()

const emit = defineEmits<{
  'update:currentPage': [page: ConfigPage]
  'update:brandColor': [color: Oklch]
  'update:selectedAccent': [color: Oklch]
  'apply-preset': [preset: Preset]
  'update:masterPoint': [index: number, value: number]
  'update:intensity': [value: number]
  'reset-filter': []
}>()

const configItems = [
  { id: 'brand' as const, label: 'Brand Color', icon: '🎨' },
  { id: 'accent' as const, label: 'Accent Color', icon: '✨' },
  { id: 'filter' as const, label: 'Color Filter', icon: '🔮' },
]

// Get current preset name for list view
const currentPresetName = computed(() => {
  if (!props.currentPresetId) return 'No Filter'
  const preset = props.presets.find(p => p.id === props.currentPresetId)
  return preset?.name ?? 'Custom'
})

const navigateToConfig = (page: ConfigPage) => {
  emit('update:currentPage', page)
}

const navigateToList = () => {
  emit('update:currentPage', 'list')
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
        @update:model-value="emit('update:brandColor', $event)"
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
        @select="emit('update:selectedAccent', $event)"
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
        @update:intensity="emit('update:intensity', $event)"
        @reset="emit('reset-filter')"
      />
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
</style>
