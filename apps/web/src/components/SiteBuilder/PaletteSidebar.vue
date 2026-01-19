<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch, type Oklch } from '@practice/color'
import type { Filter, Preset } from '../../modules/Filter/Domain'
import type { Section, SectionContent } from '@practice/site'
import type { FilterSetters } from '../../composables/Filter/useFilter'
import BrandColorPicker from './BrandColorPicker.vue'
import FoundationPresets from './FoundationPresets.vue'
import ColorPresets from './ColorPresets.vue'
import type { ColorPreset } from '@practice/semantic-color-palette/Domain'
import SectionsEditor from './SectionsEditor.vue'
import FilterPanel from '../Filter/FilterPanel.vue'
import DesignTokensPresets from './DesignTokensPresets.vue'
import { rgbToHsv } from './utils/colorConversion'

export interface SidebarItem {
  id: 'presets' | 'brand' | 'accent' | 'foundation' | 'filter' | 'tokens' | 'sections'
  label: string
  icon: string
}

type PopupType = 'presets' | 'brand' | 'accent' | 'foundation' | 'filter' | 'tokens' | 'sections' | null

const props = defineProps<{
  // Brand color
  hue: number
  saturation: number
  value: number
  selectedHex: string
  // Accent color
  accentHue: number
  accentSaturation: number
  accentValue: number
  accentHex: string
  // Foundation (Oklch values)
  foundationL: number
  foundationC: number
  foundationH: number
  foundationHueLinkedToBrand: boolean
  foundationHex: string
  brandOklch: Oklch
  // Filter
  filter: Filter
  filterPresets: readonly Preset[]
  currentPresetId: string | null
  filterSetters: FilterSetters
  intensity: number
  currentFilterName: string
  // Design Tokens
  selectedTokensId: string
  currentTokensName: string
  // Sections
  sections: readonly Section[]
  sectionContents: Record<string, SectionContent>
  selectedSectionId: string | null
}>()

const emit = defineEmits<{
  'update:hue': [value: number]
  'update:saturation': [value: number]
  'update:value': [value: number]
  'update:accentHue': [value: number]
  'update:accentSaturation': [value: number]
  'update:accentValue': [value: number]
  'update:foundationL': [value: number]
  'update:foundationC': [value: number]
  'update:foundationH': [value: number]
  'update:foundationHueLinkedToBrand': [value: boolean]
  'update:intensity': [value: number]
  'update:selectedTokensId': [value: string]
  'update:selectedSectionId': [value: string | null]
  'updateSectionContent': [sectionId: string, content: SectionContent]
  'applyPreset': [preset: Preset]
  'updateMasterPoint': [index: number, value: number]
  'resetFilter': []
  'downloadHTML': []
  'applyColorPreset': [preset: ColorPreset]
}>()

// Convert OKLCH foundation to HSV for ColorPresets
const foundationHsv = computed(() => {
  const oklch: Oklch = {
    L: props.foundationL,
    C: props.foundationC,
    H: props.foundationHueLinkedToBrand ? props.hue : props.foundationH,
  }
  const srgb = $Oklch.toSrgb(oklch)
  const [h, s, v] = rgbToHsv(
    Math.round(Math.max(0, Math.min(1, srgb.r)) * 255),
    Math.round(Math.max(0, Math.min(1, srgb.g)) * 255),
    Math.round(Math.max(0, Math.min(1, srgb.b)) * 255),
  )
  return { hue: h, saturation: s, value: v }
})

const activePopup = ref<PopupType>(null)
const popupRef = ref<HTMLDivElement | null>(null)
const foundationPresetsRef = ref<InstanceType<typeof FoundationPresets> | null>(null)
const sectionsEditorRef = ref<InstanceType<typeof SectionsEditor> | null>(null)

const sidebarItems: SidebarItem[] = [
  { id: 'presets', label: 'Color Presets', icon: '🎭' },
  { id: 'brand', label: 'Brand Color', icon: '🎨' },
  { id: 'accent', label: 'Accent Color', icon: '💎' },
  { id: 'foundation', label: 'Foundation', icon: '📄' },
  { id: 'filter', label: 'Color Filter', icon: '🔮' },
  { id: 'tokens', label: 'Style', icon: '✨' },
  { id: 'sections', label: 'Sections', icon: '📑' },
]

const openPopup = (type: PopupType) => {
  if (activePopup.value !== type) {
    emit('update:selectedSectionId', null)
  }
  activePopup.value = type
}

const closePopup = () => {
  activePopup.value = null
  emit('update:selectedSectionId', null)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && activePopup.value) {
    closePopup()
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (activePopup.value && popupRef.value && !popupRef.value.contains(e.target as Node)) {
    const target = e.target as HTMLElement
    if (!target.closest('.sidebar-item')) {
      closePopup()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousedown', handleClickOutside)
})

// Expose refs for parent component
defineExpose({
  foundationPresetsRef,
  sectionsEditorRef,
})

// Watch foundationPresetsRef changes and emit foundation updates
watch(
  () => foundationPresetsRef.value?.foundationColor,
  () => {
    // Parent will read from foundationPresetsRef
  },
  { deep: true }
)
</script>

<template>
  <aside class="palette-sidebar">
    <div class="sidebar-list">
      <button
        v-for="item in sidebarItems"
        :key="item.id"
        class="sidebar-item"
        :class="{ active: activePopup === item.id }"
        @click="openPopup(item.id)"
      >
        <div class="sidebar-item-main">
          <span class="sidebar-item-icon">{{ item.icon }}</span>
          <span class="sidebar-item-label">{{ item.label }}</span>
        </div>
        <div class="sidebar-item-preview">
          <template v-if="item.id === 'presets'">
            <div class="color-swatches-mini">
              <div class="color-swatch-mini" :style="{ backgroundColor: selectedHex }" />
              <div class="color-swatch-mini" :style="{ backgroundColor: accentHex }" />
              <div class="color-swatch-mini" :style="{ backgroundColor: foundationHex }" />
            </div>
          </template>
          <template v-else-if="item.id === 'brand'">
            <div class="color-swatch-mini" :style="{ backgroundColor: selectedHex }" />
            <span class="sidebar-item-value">{{ selectedHex }}</span>
          </template>
          <template v-else-if="item.id === 'accent'">
            <div class="color-swatch-mini" :style="{ backgroundColor: accentHex }" />
            <span class="sidebar-item-value">{{ accentHex }}</span>
          </template>
          <template v-else-if="item.id === 'foundation'">
            <div class="color-swatch-mini" :style="{ backgroundColor: foundationHex }" />
            <span class="sidebar-item-value">{{ foundationHex }}</span>
          </template>
          <template v-else-if="item.id === 'filter'">
            <span class="sidebar-item-value">{{ currentFilterName }}</span>
          </template>
          <template v-else-if="item.id === 'tokens'">
            <span class="sidebar-item-value">{{ currentTokensName }}</span>
          </template>
          <template v-else-if="item.id === 'sections'">
            <span class="sidebar-item-value">{{ sections.length }} sections</span>
          </template>
        </div>
      </button>
    </div>

    <!-- Export Button -->
    <div class="sidebar-export">
      <button class="export-button" @click="$emit('downloadHTML')">
        <span class="export-icon">📥</span>
        <span class="export-label">Export HTML</span>
      </button>
    </div>

    <!-- Popup Panel -->
    <Transition name="popup">
      <div v-if="activePopup" ref="popupRef" class="sidebar-popup">
        <div class="popup-header">
          <div class="popup-breadcrumb">
            <span class="popup-breadcrumb-item" @click="activePopup === 'sections' && selectedSectionId ? (sectionsEditorRef?.backToList(), $emit('update:selectedSectionId', null)) : closePopup()">
              {{ activePopup === 'sections' && selectedSectionId ? 'Sections' : 'Home' }}
            </span>
            <span class="popup-breadcrumb-separator">›</span>
            <h2 class="popup-title">
              {{ activePopup === 'presets' ? 'Color Presets' : activePopup === 'brand' ? 'Brand Color' : activePopup === 'accent' ? 'Accent Color' : activePopup === 'foundation' ? 'Foundation' : activePopup === 'filter' ? 'Color Filter' : activePopup === 'tokens' ? 'Style' : 'Sections' }}
            </h2>
          </div>
          <button class="popup-close" @click="closePopup">×</button>
        </div>

        <!-- Color Presets Content -->
        <div v-if="activePopup === 'presets'" class="popup-content">
          <ColorPresets
            :brand-hue="hue"
            :brand-saturation="saturation"
            :brand-value="value"
            :accent-hue="accentHue"
            :accent-saturation="accentSaturation"
            :accent-value="accentValue"
            :foundation-hue="foundationHsv.hue"
            :foundation-saturation="foundationHsv.saturation"
            :foundation-value="foundationHsv.value"
            @apply-preset="$emit('applyColorPreset', $event)"
          />
        </div>

        <!-- Brand Color Content -->
        <div v-else-if="activePopup === 'brand'" class="popup-content">
          <BrandColorPicker
            :hue="hue"
            :saturation="saturation"
            :value="value"
            @update:hue="$emit('update:hue', $event)"
            @update:saturation="$emit('update:saturation', $event)"
            @update:value="$emit('update:value', $event)"
          />
        </div>

        <!-- Accent Color Content -->
        <div v-else-if="activePopup === 'accent'" class="popup-content">
          <BrandColorPicker
            :hue="accentHue"
            :saturation="accentSaturation"
            :value="accentValue"
            @update:hue="$emit('update:accentHue', $event)"
            @update:saturation="$emit('update:accentSaturation', $event)"
            @update:value="$emit('update:accentValue', $event)"
          />
        </div>

        <!-- Foundation Color Content -->
        <div v-else-if="activePopup === 'foundation'" class="popup-content">
          <FoundationPresets
            ref="foundationPresetsRef"
            :foundation-l="foundationL"
            :foundation-c="foundationC"
            :foundation-h="foundationH"
            :foundation-hue-linked-to-brand="foundationHueLinkedToBrand"
            :brand-oklch="brandOklch"
            :brand-hue="hue"
            @update:foundation-l="$emit('update:foundationL', $event)"
            @update:foundation-c="$emit('update:foundationC', $event)"
            @update:foundation-h="$emit('update:foundationH', $event)"
            @update:foundation-hue-linked-to-brand="$emit('update:foundationHueLinkedToBrand', $event)"
          />
        </div>

        <!-- Filter Content -->
        <div v-else-if="activePopup === 'filter'" class="popup-content">
          <FilterPanel
            :filter="filter"
            :presets="filterPresets"
            :current-preset-id="currentPresetId"
            :setters="filterSetters"
            :intensity="intensity"
            @apply-preset="$emit('applyPreset', $event)"
            @update:master-point="(index, value) => $emit('updateMasterPoint', index, value)"
            @update:intensity="$emit('update:intensity', $event)"
            @reset="$emit('resetFilter')"
          />
        </div>

        <!-- Design Tokens Content -->
        <div v-else-if="activePopup === 'tokens'" class="popup-content">
          <DesignTokensPresets
            :selected-id="selectedTokensId"
            @update:selected-id="$emit('update:selectedTokensId', $event)"
          />
        </div>

        <!-- Sections Content -->
        <div v-else-if="activePopup === 'sections'" class="popup-content">
          <SectionsEditor
            ref="sectionsEditorRef"
            :sections="sections"
            :contents="sectionContents"
            :selected-section-id="selectedSectionId"
            @update:selected-section-id="$emit('update:selectedSectionId', $event)"
            @update:content="(sectionId, content) => $emit('updateSectionContent', sectionId, content)"
          />
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
/* Sidebar */
.palette-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  padding: 1rem 0.75rem;
  background: oklch(0.94 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
  overflow: visible;
}

:global(.dark) .palette-sidebar {
  background: oklch(0.10 0.02 260);
  border-right-color: oklch(0.20 0.02 260);
}

/* Sidebar List View */
.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  background: oklch(0.99 0.005 260);
  border: none;
  border-radius: 0.5rem;
  color: oklch(0.25 0.02 260);
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  width: 100%;
}

:global(.dark) .sidebar-item {
  background: oklch(0.16 0.02 260);
  color: oklch(0.90 0.01 260);
}

.sidebar-item:hover {
  background: oklch(0.96 0.01 260);
}

:global(.dark) .sidebar-item:hover {
  background: oklch(0.20 0.02 260);
}

.sidebar-item.active {
  background: oklch(0.96 0.01 260);
  border-left: 3px solid oklch(0.55 0.18 250);
  padding-left: calc(0.625rem - 3px);
}

:global(.dark) .sidebar-item.active {
  background: oklch(0.20 0.02 260);
  border-left-color: oklch(0.55 0.16 250);
}

.sidebar-item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-item-icon {
  font-size: 0.875rem;
}

.sidebar-item-label {
  font-weight: 600;
  font-size: 0.7rem;
}

.sidebar-item-preview {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-left: 1.375rem;
}

.color-swatches-mini {
  display: flex;
  gap: 0.25rem;
}

.color-swatch-mini {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.sidebar-item-value {
  font-size: 0.65rem;
  color: oklch(0.50 0.02 260);
  font-family: 'SF Mono', Monaco, monospace;
}

:global(.dark) .sidebar-item-value {
  color: oklch(0.60 0.02 260);
}

/* Export Button */
.sidebar-export {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid oklch(0.88 0.01 260);
}

:global(.dark) .sidebar-export {
  border-top-color: oklch(0.20 0.02 260);
}

.export-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: oklch(0.55 0.18 250);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.export-button:hover {
  background: oklch(0.50 0.18 250);
}

.export-button:active {
  transform: scale(0.98);
}

:global(.dark) .export-button {
  background: oklch(0.50 0.16 250);
}

:global(.dark) .export-button:hover {
  background: oklch(0.55 0.16 250);
}

.export-icon {
  font-size: 1rem;
}

.export-label {
  flex: 1;
  text-align: left;
}

/* Sidebar Popup */
.sidebar-popup {
  position: absolute;
  top: 0;
  left: 100%;
  width: 320px;
  max-height: 100vh;
  background: oklch(0.97 0.005 260);
  border-left: 1px solid oklch(0.88 0.01 260);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
  z-index: 100;
  border-radius: 0 8px 8px 0;
}

:global(.dark) .sidebar-popup {
  background: oklch(0.14 0.02 260);
  border-left-color: oklch(0.20 0.02 260);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
  position: sticky;
  top: 0;
  background: oklch(0.97 0.005 260);
  z-index: 1;
}

:global(.dark) .popup-header {
  background: oklch(0.14 0.02 260);
  border-bottom-color: oklch(0.20 0.02 260);
}

.popup-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.popup-breadcrumb-item {
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
}

.popup-breadcrumb-item:hover {
  color: oklch(0.35 0.02 260);
}

:global(.dark) .popup-breadcrumb-item {
  color: oklch(0.60 0.02 260);
}

:global(.dark) .popup-breadcrumb-item:hover {
  color: oklch(0.80 0.02 260);
}

.popup-breadcrumb-separator {
  font-size: 0.75rem;
  color: oklch(0.60 0.02 260);
}

:global(.dark) .popup-breadcrumb-separator {
  color: oklch(0.50 0.02 260);
}

.popup-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .popup-title {
  color: oklch(0.90 0.01 260);
}

.popup-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: oklch(0.50 0.02 260);
  font-size: 1.25rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.popup-close:hover {
  background: oklch(0.90 0.01 260);
  color: oklch(0.30 0.02 260);
}

:global(.dark) .popup-close:hover {
  background: oklch(0.22 0.02 260);
  color: oklch(0.80 0.02 260);
}

.popup-content {
  padding: 1rem;
}

/* Popup Transition */
.popup-enter-active,
.popup-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.popup-enter-from,
.popup-leave-to {
  transform: translateX(-8px);
  opacity: 0;
}
</style>
