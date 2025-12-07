<script setup lang="ts">
import { computed } from 'vue'
import type { Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import type { Preset } from '../../modules/Filter/Domain'
import { $Preset } from '../../modules/Filter/Domain'
import BrandColorPicker from './BrandColorPicker.vue'
import AccentSelector from './AccentSelector.vue'

type ConfigPage = 'list' | 'brand' | 'accent' | 'filter'

const props = defineProps<{
  currentPage: ConfigPage
  brandColor: Oklch
  accentColor: Oklch
  selectedAccent: Oklch | null
  // Filter props
  presets: readonly Preset[]
  currentPresetId: string | null
}>()

const emit = defineEmits<{
  'update:currentPage': [page: ConfigPage]
  'update:brandColor': [color: Oklch]
  'update:selectedAccent': [color: Oklch]
  'apply-preset': [preset: Preset]
  'reset-filter': []
}>()

const configItems = [
  { id: 'brand' as const, label: 'Brand Color', icon: '🎨' },
  { id: 'accent' as const, label: 'Accent Color', icon: '✨' },
  { id: 'filter' as const, label: 'Color Filter', icon: '🔮' },
]

// Group presets by category (convert Map to Array for v-for)
const groupedPresets = computed(() => {
  const map = $Preset.groupByCategory([...props.presets])
  return Array.from(map.entries())
})

// Get current preset name
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

      <!-- Current Filter -->
      <div class="mb-4 flex items-center justify-between">
        <span class="text-sm text-gray-400">Current:</span>
        <span class="text-sm font-medium">{{ currentPresetName }}</span>
      </div>

      <!-- Reset Button -->
      <button
        v-if="currentPresetId"
        class="w-full mb-4 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        @click="emit('reset-filter')"
      >
        Reset to No Filter
      </button>

      <!-- Preset Categories -->
      <div class="space-y-4">
        <div v-for="[category, presets] in groupedPresets" :key="category">
          <h3 class="text-xs text-gray-500 uppercase tracking-wide mb-2">
            {{ category }}
          </h3>
          <div class="preset-grid">
            <button
              v-for="preset in presets"
              :key="preset.id"
              class="preset-item"
              :class="{ 'preset-item--active': currentPresetId === preset.id }"
              @click="emit('apply-preset', preset)"
              :title="preset.description"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
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

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.375rem;
}

.preset-item {
  padding: 0.5rem 0.75rem;
  background: #374151;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  color: #d1d5db;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-item:hover {
  background: #4b5563;
  color: white;
}

.preset-item--active {
  background: #3b82f6;
  border-color: #60a5fa;
  color: white;
}

.preset-item--active:hover {
  background: #2563eb;
}
</style>
