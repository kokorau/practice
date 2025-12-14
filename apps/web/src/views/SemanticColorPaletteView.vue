<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  $SemanticColorPalette,
  type SemanticColorPalette,
} from '../modules/SemanticColorPalette/Domain'

const isDark = ref(false)

const palette = computed<SemanticColorPalette>(() =>
  isDark.value
    ? $SemanticColorPalette.createDefaultDark()
    : $SemanticColorPalette.createDefaultLight()
)

// Surface groups for display
const surfaces = computed(() => [
  { name: 'canvas', label: 'Canvas', tokens: palette.value.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', tokens: palette.value.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', tokens: palette.value.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', tokens: palette.value.sectionContrast },
  { name: 'card', label: 'Card', tokens: palette.value.card },
  { name: 'cardFlat', label: 'Card Flat', tokens: palette.value.cardFlat },
  { name: 'interactive', label: 'Interactive', tokens: palette.value.interactive },
])

// Get background color for surface preview
const getSurfaceBg = (name: string): string => {
  // Interactive uses action color as background (it represents button surface)
  if (name === 'interactive') {
    return palette.value.interactive.action
  }
  // SectionContrast uses inverted background
  if (name === 'sectionContrast') {
    return isDark.value ? 'oklch(0.95 0.01 260)' : 'oklch(0.20 0.02 260)'
  }
  if (isDark.value) {
    return name === 'canvas' ? 'oklch(0.15 0.02 260)' :
           name === 'sectionNeutral' ? 'oklch(0.15 0.02 260)' :
           name === 'sectionTint' ? 'oklch(0.22 0.02 260)' :
           name === 'card' ? 'oklch(0.25 0.02 260)' :
           name === 'cardFlat' ? 'oklch(0.18 0.02 260)' :
           'oklch(0.15 0.02 260)'
  }
  return name === 'canvas' ? 'oklch(0.99 0.005 260)' :
         name === 'sectionNeutral' ? 'oklch(0.99 0.005 260)' :
         name === 'sectionTint' ? 'oklch(0.95 0.01 260)' :
         name === 'card' ? 'oklch(0.99 0.005 260)' :
         name === 'cardFlat' ? 'oklch(0.97 0.01 260)' :
         'oklch(0.99 0.005 260)'
}
</script>

<template>
  <div class="semantic-color-palette-view" :class="{ dark: isDark }">
    <header class="header">
      <h1>Semantic Color Palette</h1>
      <label class="theme-toggle">
        <input type="checkbox" v-model="isDark" />
        <span>Dark Mode</span>
      </label>
    </header>

    <div class="surfaces-grid">
      <div
        v-for="surface in surfaces"
        :key="surface.name"
        class="surface-card"
        :style="{ backgroundColor: getSurfaceBg(surface.name) }"
      >
        <h2 class="surface-title" :style="{ color: surface.tokens.titleText }">
          {{ surface.label }}
        </h2>

        <div class="tokens-list">
          <div
            v-for="(value, key) in surface.tokens"
            :key="key"
            class="token-row"
          >
            <span class="token-name" :style="{ color: (surface.tokens as any).bodyText ?? surface.tokens.titleText }">
              {{ key }}
            </span>
            <div class="token-preview">
              <span
                class="color-swatch"
                :style="{ backgroundColor: value }"
              />
              <code class="token-value" :style="{ color: (surface.tokens as any).metaText ?? surface.tokens.titleText, opacity: (surface.tokens as any).metaText ? 1 : 0.6 }">
                {{ value }}
              </code>
            </div>
          </div>
        </div>

        <!-- Preview section -->
        <div class="preview-section">
          <p :style="{ color: surface.tokens.titleText }">Title text sample</p>
          <p v-if="'bodyText' in surface.tokens" :style="{ color: (surface.tokens as any).bodyText }">Body text sample</p>
          <p v-if="'metaText' in surface.tokens" :style="{ color: (surface.tokens as any).metaText }">Meta text sample</p>
          <a
            v-if="'linkText' in surface.tokens"
            href="#"
            :style="{ color: (surface.tokens as any).linkText }"
            @click.prevent
          >
            Link text sample
          </a>
          <div
            v-if="'tintSurface' in surface.tokens"
            class="tint-preview"
            :style="{ backgroundColor: (surface.tokens as any).tintSurface }"
          >
            <span :style="{ color: (surface.tokens as any).bodyText ?? surface.tokens.titleText }">Tint surface</span>
          </div>
          <div v-if="'action' in surface.tokens" class="action-buttons">
            <button
              class="action-button"
              :style="{
                backgroundColor: (surface.tokens as any).action,
                color: isDark ? 'oklch(0.15 0.02 260)' : 'oklch(0.99 0.005 260)'
              }"
            >
              Action
            </button>
            <button
              class="action-button quiet"
              :style="{
                backgroundColor: (surface.tokens as any).actionQuiet,
                color: isDark ? 'oklch(0.15 0.02 260)' : 'oklch(0.99 0.005 260)'
              }"
            >
              Quiet
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.semantic-color-palette-view {
  padding: 1.5rem;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  transition: background 0.3s;
}

.semantic-color-palette-view.dark {
  background: oklch(0.12 0.02 260);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  color: oklch(0.25 0.02 260);
}

.dark h1 {
  color: oklch(0.90 0.01 260);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: oklch(0.40 0.02 260);
}

.dark .theme-toggle {
  color: oklch(0.70 0.02 260);
}

.theme-toggle input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.surfaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.surface-card {
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.surface-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.token-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.token-name {
  font-size: 0.75rem;
  font-weight: 500;
}

.token-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(128,128,128,0.2);
  flex-shrink: 0;
}

.token-value {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  opacity: 0.8;
}

.preview-section {
  border-top: 1px solid rgba(128,128,128,0.15);
  padding-top: 1rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-section p {
  margin: 0;
  font-size: 0.875rem;
}

.preview-section a {
  font-size: 0.875rem;
  text-decoration: underline;
}

.tint-preview {
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.action-button.quiet {
  opacity: 0.9;
}
</style>
