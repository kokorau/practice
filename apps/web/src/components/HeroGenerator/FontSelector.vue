<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { FontPreset, FontCategory } from '@practice/font'
import { getGoogleFontPresets } from '@practice/font'

const props = defineProps<{
  modelValue: string | undefined
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

// ============================================================
// Font Loading
// ============================================================
const loadedFonts = ref<Set<string>>(new Set())

const loadFont = (preset: FontPreset) => {
  if (loadedFonts.value.has(preset.id)) return
  if (preset.source.vendor !== 'google') return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = preset.source.url
  link.dataset.fontId = preset.id
  document.head.appendChild(link)
  loadedFonts.value.add(preset.id)
}

// ============================================================
// Filter State
// ============================================================
const selectedCategory = ref<FontCategory | 'all'>('all')
const searchQuery = ref('')

const categories: { value: FontCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sans-serif', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'display', label: 'Display' },
  { value: 'handwriting', label: 'Script' },
  { value: 'monospace', label: 'Mono' },
]

const allPresets = computed(() => getGoogleFontPresets({ excludeIconFonts: true }))

const filteredPresets = computed(() => {
  let presets = allPresets.value

  // Filter by category
  if (selectedCategory.value !== 'all') {
    presets = presets.filter((p) => p.category === selectedCategory.value)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    presets = presets.filter((p) => p.name.toLowerCase().includes(query))
  }

  return presets
})

// ============================================================
// Selection
// ============================================================
const selectedPreset = computed(() => {
  if (!props.modelValue) return null
  return allPresets.value.find((p) => p.id === props.modelValue) ?? null
})

const handleSelect = (preset: FontPreset) => {
  loadFont(preset)
  emit('update:modelValue', preset.id)
}

const handleClear = () => {
  emit('update:modelValue', undefined)
}

// ============================================================
// Preload visible fonts
// ============================================================
const preloadVisibleFonts = () => {
  // Load first 10 fonts for quick preview
  filteredPresets.value.slice(0, 10).forEach(loadFont)
}

watch(filteredPresets, preloadVisibleFonts, { immediate: true })

// Load selected font on mount
onMounted(() => {
  if (selectedPreset.value) {
    loadFont(selectedPreset.value)
  }
})
</script>

<template>
  <div class="font-selector">
    <label v-if="label" class="font-selector-label">{{ label }}</label>

    <!-- Current Selection -->
    <div class="current-font">
      <span
        v-if="selectedPreset"
        class="current-font-name"
        :style="{ fontFamily: selectedPreset.family }"
      >
        {{ selectedPreset.name }}
      </span>
      <span v-else class="current-font-placeholder">Default</span>
      <button v-if="selectedPreset" class="clear-button" @click="handleClear">
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Search -->
    <div class="search-box">
      <span class="material-icons search-icon">search</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search fonts..."
        class="search-input"
      />
    </div>

    <!-- Category Filter -->
    <div class="category-filter">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="category-button"
        :class="{ active: selectedCategory === cat.value }"
        @click="selectedCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Font List -->
    <div class="font-list">
      <button
        v-for="preset in filteredPresets"
        :key="preset.id"
        class="font-item"
        :class="{ active: modelValue === preset.id }"
        @click="handleSelect(preset)"
        @mouseenter="loadFont(preset)"
      >
        <span class="font-preview" :style="{ fontFamily: preset.family }">
          {{ preset.name }}
        </span>
        <span class="font-category">{{ preset.category }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.font-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.font-selector-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .font-selector-label {
  color: oklch(0.55 0.02 260);
}

/* Current Selection */
.current-font {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: oklch(0.94 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
}

:global(.dark) .current-font {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

.current-font-name {
  flex: 1;
  font-size: 0.875rem;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .current-font-name {
  color: oklch(0.90 0.02 260);
}

.current-font-placeholder {
  flex: 1;
  font-size: 0.875rem;
  color: oklch(0.55 0.02 260);
  font-style: italic;
}

:global(.dark) .current-font-placeholder {
  color: oklch(0.50 0.02 260);
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: none;
  border: none;
  color: oklch(0.55 0.02 260);
  cursor: pointer;
  padding: 0;
  border-radius: 0.25rem;
  transition: color 0.15s, background 0.15s;
}

:global(.dark) .clear-button {
  color: oklch(0.50 0.02 260);
}

.clear-button:hover {
  color: oklch(0.30 0.02 260);
  background: oklch(0.88 0.01 260);
}

:global(.dark) .clear-button:hover {
  color: oklch(0.80 0.02 260);
  background: oklch(0.28 0.02 260);
}

.clear-button .material-icons {
  font-size: 0.875rem;
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 0.375rem;
}

:global(.dark) .search-box {
  background: oklch(0.20 0.02 260);
  border-color: oklch(0.28 0.02 260);
}

.search-icon {
  font-size: 1rem;
  color: oklch(0.55 0.02 260);
}

:global(.dark) .search-icon {
  color: oklch(0.50 0.02 260);
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
  outline: none;
}

:global(.dark) .search-input {
  color: oklch(0.90 0.02 260);
}

.search-input::placeholder {
  color: oklch(0.60 0.02 260);
}

:global(.dark) .search-input::placeholder {
  color: oklch(0.45 0.02 260);
}

/* Category Filter */
.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.category-button {
  padding: 0.375rem 0.625rem;
  background: oklch(0.92 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: oklch(0.45 0.02 260);
  cursor: pointer;
  transition: all 0.15s;
}

:global(.dark) .category-button {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.28 0.02 260);
  color: oklch(0.65 0.02 260);
}

.category-button:hover {
  background: oklch(0.88 0.01 260);
  color: oklch(0.30 0.02 260);
}

:global(.dark) .category-button:hover {
  background: oklch(0.26 0.02 260);
  color: oklch(0.80 0.02 260);
}

.category-button.active {
  background: oklch(0.50 0.15 250);
  border-color: oklch(0.55 0.18 250);
  color: oklch(0.95 0.02 260);
}

/* Font List */
.font-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 240px;
  overflow-y: auto;
}

.font-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: oklch(0.94 0.01 260);
  border: 1px solid transparent;
  border-radius: 0.375rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

:global(.dark) .font-item {
  background: oklch(0.20 0.02 260);
}

.font-item:hover {
  background: oklch(0.90 0.01 260);
  border-color: oklch(0.80 0.01 260);
}

:global(.dark) .font-item:hover {
  background: oklch(0.24 0.02 260);
  border-color: oklch(0.32 0.02 260);
}

.font-item.active {
  background: oklch(0.50 0.15 250 / 0.2);
  border-color: oklch(0.55 0.18 250);
}

.font-preview {
  font-size: 0.9375rem;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .font-preview {
  color: oklch(0.88 0.02 260);
}

.font-category {
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  color: oklch(0.55 0.02 260);
}

:global(.dark) .font-category {
  color: oklch(0.50 0.02 260);
}
</style>
