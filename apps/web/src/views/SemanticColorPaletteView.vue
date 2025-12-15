<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  type ContextTokens,
  type ComponentTokens,
  type ActionState,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
} from '../modules/SemanticColorPalette/Domain'
import {
  getPaletteEntries,
  toCSSText,
  toCSSRuleSetsText,
} from '../modules/SemanticColorPalette/Infra'

const paletteEntries = getPaletteEntries()
const selectedPaletteId = ref(paletteEntries[0]?.id ?? '')

const selectedEntry = computed(() =>
  paletteEntries.find((e) => e.id === selectedPaletteId.value) ?? paletteEntries[0]!
)
const palette = computed(() => selectedEntry.value.palette)
const isDark = computed(() => selectedPaletteId.value.includes('dark'))

// Context surfaces with CSS class names
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: palette.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: palette.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: palette.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: palette.value.context.sectionContrast },
])

// Stateless components with CSS class names
const components = computed(() => [
  { name: 'card', label: 'Card', className: COMPONENT_CLASS_NAMES.card, tokens: palette.value.component.card },
  { name: 'cardFlat', label: 'Card Flat', className: COMPONENT_CLASS_NAMES.cardFlat, tokens: palette.value.component.cardFlat },
])

// Stateful components with CSS class names
const actions = computed(() => [
  { name: 'action', label: 'Action (CTA)', className: COMPONENT_CLASS_NAMES.action, tokens: palette.value.component.action },
  { name: 'actionQuiet', label: 'Action Quiet', className: COMPONENT_CLASS_NAMES.actionQuiet, tokens: palette.value.component.actionQuiet },
])

const actionStates: ActionState[] = ['default', 'hover', 'active', 'disabled']

// Get token entries for display (excluding optional undefined values)
const getTokenEntries = (tokens: ContextTokens | ComponentTokens) => {
  return Object.entries(tokens).filter(([, value]) => value !== undefined)
}

// Dynamic CSS injection for CSS variables and rule sets
let styleElement: HTMLStyleElement | null = null

const updateStyles = () => {
  if (!styleElement) return
  const cssVariables = toCSSText(palette.value, '.semantic-color-palette-view')
  const cssRuleSets = toCSSRuleSetsText()
  styleElement.textContent = `${cssVariables}\n\n${cssRuleSets}`
}

onMounted(() => {
  styleElement = document.createElement('style')
  styleElement.setAttribute('data-semantic-palette', '')
  document.head.appendChild(styleElement)
  updateStyles()
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})

watch(palette, updateStyles)
</script>

<template>
  <div class="semantic-color-palette-view" :class="{ dark: isDark }">
    <!-- Left Sidebar: Palette Selector -->
    <aside class="palette-sidebar">
      <h2 class="sidebar-title">Palettes</h2>
      <ul class="palette-list">
        <li
          v-for="entry in paletteEntries"
          :key="entry.id"
          class="palette-item"
          :class="{ selected: entry.id === selectedPaletteId }"
          @click="selectedPaletteId = entry.id"
        >
          {{ entry.name }}
        </li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1>Semantic Color Palette</h1>
        <span class="current-palette">{{ selectedEntry.name }}</span>
      </header>

    <!-- Contexts Section -->
    <section class="section">
      <h2 class="section-heading">Contexts (Places)</h2>
      <div class="surfaces-grid">
        <div
          v-for="ctx in contexts"
          :key="ctx.name"
          class="surface-card"
          :class="ctx.className"
        >
          <h3 class="surface-title scp-title">{{ ctx.label }}</h3>

          <div class="tokens-list">
            <div
              v-for="[key, value] in getTokenEntries(ctx.tokens)"
              :key="key"
              class="token-row"
            >
              <span class="token-name scp-body">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-value scp-meta">{{ value }}</code>
              </div>
            </div>
          </div>

          <!-- Preview section -->
          <div class="preview-section scp-divider">
            <p class="preview-title scp-title">Title text sample</p>
            <p class="preview-body scp-body">Body text sample</p>
            <p class="preview-meta scp-meta">Meta text sample</p>
            <a href="#" class="preview-link scp-link" @click.prevent>Link text sample</a>
            <div class="tint-preview scp-tint-surface">
              <span>Tint surface</span>
            </div>
            <div v-if="ctx.tokens.accent" class="accent-preview scp-accent">Accent</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Components Section -->
    <section class="section">
      <h2 class="section-heading">Components</h2>
      <div class="components-grid">
        <!-- Stateless components -->
        <div
          v-for="comp in components"
          :key="comp.name"
          class="component-card"
          :class="comp.className"
        >
          <h3 class="component-title scp-title">{{ comp.label }}</h3>
          <span class="component-badge scp-meta">Stateless</span>

          <!-- Preview section -->
          <div class="preview-section scp-divider">
            <p class="preview-title scp-title">Title text sample</p>
            <p class="preview-body scp-body">Body text sample</p>
            <p class="preview-meta scp-meta">Meta text sample</p>
            <a href="#" class="preview-link scp-link" @click.prevent>Link text sample</a>
            <div class="tint-preview scp-tint-surface">
              <span>Tint surface</span>
            </div>
            <div v-if="comp.tokens.accent" class="accent-preview scp-accent">Accent</div>
          </div>
        </div>

        <!-- Stateful action components -->
        <div
          v-for="action in actions"
          :key="action.name"
          class="component-card action-component"
        >
          <h3 class="component-title">{{ action.label }}</h3>
          <span class="component-badge">Stateful</span>

          <!-- Interactive buttons -->
          <div class="action-buttons">
            <button :class="action.className">Click me</button>
            <button :class="action.className" disabled>Disabled</button>
          </div>

          <!-- State preview -->
          <div class="state-previews">
            <div
              v-for="state in actionStates"
              :key="state"
              class="state-preview"
            >
              <span class="state-label">{{ state }}</span>
              <button
                class="action-button"
                :style="{
                  backgroundColor: action.tokens.surface[state],
                  borderColor: action.tokens.border[state],
                  color: action.tokens.title[state],
                }"
              >
                Btn
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    </main>
  </div>
</template>

<style scoped>
.semantic-color-palette-view {
  display: flex;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  transition: background 0.3s;
}

.semantic-color-palette-view.dark {
  background: oklch(0.12 0.02 260);
}

/* Sidebar */
.palette-sidebar {
  width: 200px;
  flex-shrink: 0;
  padding: 1.5rem 1rem;
  background: oklch(0.94 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
}

.dark .palette-sidebar {
  background: oklch(0.10 0.02 260);
  border-right-color: oklch(0.20 0.02 260);
}

.sidebar-title {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

.dark .sidebar-title {
  color: oklch(0.60 0.02 260);
}

.palette-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.palette-item {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: oklch(0.35 0.02 260);
  transition: background 0.15s, color 0.15s;
}

.dark .palette-item {
  color: oklch(0.75 0.01 260);
}

.palette-item:hover {
  background: oklch(0.90 0.01 260);
}

.dark .palette-item:hover {
  background: oklch(0.18 0.02 260);
}

.palette-item.selected {
  background: oklch(0.55 0.18 250);
  color: oklch(0.98 0.01 260);
  font-weight: 500;
}

.dark .palette-item.selected {
  background: oklch(0.55 0.16 250);
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
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

.current-palette {
  font-size: 0.875rem;
  color: oklch(0.50 0.02 260);
}

.dark .current-palette {
  color: oklch(0.60 0.02 260);
}

.section {
  max-width: 1400px;
  margin: 0 auto 2rem;
}

.section-heading {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: oklch(0.35 0.02 260);
}

.dark .section-heading {
  color: oklch(0.75 0.02 260);
}

.surfaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.surface-card {
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border: 1px solid transparent;
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

.accent-preview {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}

/* Components Section (4-column grid) */
.components-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.component-card {
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.action-component {
  background: oklch(0.99 0.005 260);
}

.dark .action-component {
  background: oklch(0.18 0.02 260);
}

.component-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .component-title {
  color: oklch(0.90 0.01 260);
}

.component-badge {
  display: inline-block;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
  margin-bottom: 0.75rem;
}

.dark .component-badge {
  color: oklch(0.60 0.02 260);
}

/* Action component specific */
.action-component {
  display: flex;
  flex-direction: column;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.action-buttons button {
  padding: 0.4rem 0.75rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-buttons button:disabled {
  cursor: not-allowed;
}

.state-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.state-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.state-label {
  font-size: 0.55rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.dark .state-label {
  color: oklch(0.60 0.02 260);
}

.action-button {
  padding: 0.3rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
