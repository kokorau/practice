<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  type SemanticColorPalette,
  type ContextTokens,
  type ComponentTokens,
  type StatefulComponentTokens,
  type ActionState,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
} from '../modules/SemanticColorPalette/Domain'
import {
  createDefaultLightPalette,
  createDefaultDarkPalette,
  toCSSText,
  toCSSRuleSetsText,
} from '../modules/SemanticColorPalette/Infra'

const isDark = ref(false)

const palette = computed<SemanticColorPalette>(() =>
  isDark.value ? createDefaultDarkPalette() : createDefaultLightPalette()
)

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

// Get stateful token entries
const getStatefulTokenEntries = (tokens: StatefulComponentTokens) => {
  const required = ['surface', 'tintSurface', 'border', 'title', 'linkText'] as const
  const optional = ['body', 'meta', 'accent', 'divider'] as const

  const entries: { key: string; states: Record<ActionState, string> }[] = []

  for (const key of required) {
    entries.push({ key, states: tokens[key] as Record<ActionState, string> })
  }

  for (const key of optional) {
    const value = tokens[key]
    if (value) {
      entries.push({ key, states: value as Record<ActionState, string> })
    }
  }

  return entries
}

// Convert camelCase to kebab-case
const toKebab = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

// Generate CSS variable aliases for each context/component
const generateAliasRules = (): string => {
  const roles = ['surface', 'tint-surface', 'title', 'body', 'meta', 'link-text', 'border', 'divider', 'accent']
  const rules: string[] = []

  // Context aliases
  for (const key of Object.keys(CONTEXT_CLASS_NAMES)) {
    const className = CONTEXT_CLASS_NAMES[key as keyof typeof CONTEXT_CLASS_NAMES]
    const prefix = `--context-${toKebab(key)}`
    const aliases = roles.map(role => `  --${role}: var(${prefix}-${role});`).join('\n')
    rules.push(`.${className} {\n${aliases}\n}`)
  }

  // Component aliases (stateless)
  for (const key of ['card', 'cardFlat']) {
    const className = COMPONENT_CLASS_NAMES[key as keyof typeof COMPONENT_CLASS_NAMES]
    const prefix = `--component-${toKebab(key)}`
    const aliases = roles.map(role => `  --${role}: var(${prefix}-${role});`).join('\n')
    rules.push(`.${className} {\n${aliases}\n}`)
  }

  return rules.join('\n\n')
}

// Dynamic CSS injection for CSS variables and rule sets
let styleElement: HTMLStyleElement | null = null

const updateStyles = () => {
  if (!styleElement) return
  const cssVariables = toCSSText(palette.value, '.semantic-color-palette-view')
  const cssRuleSets = toCSSRuleSetsText()
  const aliasRules = generateAliasRules()
  styleElement.textContent = `${cssVariables}\n\n${cssRuleSets}\n\n${aliasRules}`
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
    <header class="header">
      <h1>Semantic Color Palette</h1>
      <label class="theme-toggle">
        <input type="checkbox" v-model="isDark" />
        <span>Dark Mode</span>
      </label>
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
          <h3 class="surface-title">{{ ctx.label }}</h3>

          <div class="tokens-list">
            <div
              v-for="[key, value] in getTokenEntries(ctx.tokens)"
              :key="key"
              class="token-row"
            >
              <span class="token-name">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-value">{{ value }}</code>
              </div>
            </div>
          </div>

          <!-- Preview section -->
          <div class="preview-section">
            <p class="preview-title">Title text sample</p>
            <p class="preview-body">Body text sample</p>
            <p class="preview-meta">Meta text sample</p>
            <a href="#" class="preview-link" @click.prevent>Link text sample</a>
            <div class="tint-preview">
              <span>Tint surface</span>
            </div>
            <div v-if="ctx.tokens.accent" class="accent-preview">Accent</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Components Section -->
    <section class="section">
      <h2 class="section-heading">Components (Stateless)</h2>
      <div class="surfaces-grid">
        <div
          v-for="comp in components"
          :key="comp.name"
          class="surface-card"
          :class="comp.className"
        >
          <h3 class="surface-title">{{ comp.label }}</h3>

          <div class="tokens-list">
            <div
              v-for="[key, value] in getTokenEntries(comp.tokens)"
              :key="key"
              class="token-row"
            >
              <span class="token-name">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-value">{{ value }}</code>
              </div>
            </div>
          </div>

          <!-- Preview section -->
          <div class="preview-section">
            <p class="preview-title">Title text sample</p>
            <p class="preview-body">Body text sample</p>
            <p class="preview-meta">Meta text sample</p>
            <a href="#" class="preview-link" @click.prevent>Link text sample</a>
            <div class="tint-preview">
              <span>Tint surface</span>
            </div>
            <div v-if="comp.tokens.accent" class="accent-preview">Accent</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Actions Section (Stateful) -->
    <section class="section">
      <h2 class="section-heading">Actions (Stateful Components)</h2>
      <div class="actions-grid">
        <div
          v-for="action in actions"
          :key="action.name"
          class="action-card"
        >
          <h3 class="action-title">{{ action.label }}</h3>

          <!-- Interactive button using CSS variables -->
          <div class="interactive-preview">
            <span class="preview-label">Interactive (CSS Variables)</span>
            <div class="interactive-buttons">
              <button :class="action.className">Click me</button>
              <button :class="action.className" disabled>Disabled</button>
            </div>
          </div>

          <!-- State preview buttons (static display) -->
          <div class="state-previews">
            <span class="preview-label">State Preview (static)</span>
            <div class="state-buttons">
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
                  Button
                </button>
              </div>
            </div>
          </div>

          <!-- Token table -->
          <div class="token-table">
            <div class="token-table-header">
              <span class="token-table-cell">Role</span>
              <span v-for="state in actionStates" :key="state" class="token-table-cell">
                {{ state }}
              </span>
            </div>
            <div
              v-for="entry in getStatefulTokenEntries(action.tokens)"
              :key="entry.key"
              class="token-table-row"
            >
              <span class="token-table-cell token-name">{{ entry.key }}</span>
              <span
                v-for="state in actionStates"
                :key="state"
                class="token-table-cell"
              >
                <span
                  class="color-swatch small"
                  :style="{ backgroundColor: entry.states[state] }"
                  :title="entry.states[state]"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
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

.color-swatch.small {
  width: 16px;
  height: 16px;
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

/* Actions Section */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
}

.action-card {
  border-radius: 12px;
  padding: 1rem;
  background: oklch(0.99 0.005 260);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.dark .action-card {
  background: oklch(0.18 0.02 260);
}

.action-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .action-title {
  color: oklch(0.90 0.01 260);
}

.state-previews {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.state-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.state-label {
  font-size: 0.65rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .state-label {
  color: oklch(0.60 0.02 260);
}

.action-button {
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.token-table {
  font-size: 0.7rem;
  border-top: 1px solid rgba(128,128,128,0.15);
  padding-top: 1rem;
}

.token-table-header,
.token-table-row {
  display: grid;
  grid-template-columns: 80px repeat(4, 1fr);
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.token-table-header {
  font-weight: 600;
  color: oklch(0.50 0.02 260);
  border-bottom: 1px solid rgba(128,128,128,0.15);
  margin-bottom: 0.25rem;
}

.dark .token-table-header {
  color: oklch(0.60 0.02 260);
}

.token-table-cell {
  display: flex;
  align-items: center;
}

.token-table-cell.token-name {
  color: oklch(0.35 0.02 260);
}

.dark .token-table-cell.token-name {
  color: oklch(0.75 0.02 260);
}

/* Interactive preview for stateful components */
.interactive-preview {
  margin-bottom: 1rem;
}

.preview-label {
  display: block;
  font-size: 0.65rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.dark .preview-label {
  color: oklch(0.60 0.02 260);
}

.interactive-buttons {
  display: flex;
  gap: 0.5rem;
}

.interactive-buttons button {
  padding: 0.5rem 1.25rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.interactive-buttons button:disabled {
  cursor: not-allowed;
}

.state-buttons {
  display: flex;
  gap: 0.75rem;
}
</style>

<!-- CSS Variable based styles (unscoped to work with dynamic class names) -->
<style>
/* Context and Component cards - use CSS variables for colors */
.semantic-color-palette-view [class^="context-"],
.semantic-color-palette-view [class^="component-card"] {
  /* surface, body, border are applied by CSSRuleSets */
}

/* Title styling using CSS variables */
.semantic-color-palette-view [class^="context-"] .surface-title,
.semantic-color-palette-view [class^="component-card"] .surface-title {
  color: var(--title, inherit);
}

/* Token name uses body color */
.semantic-color-palette-view [class^="context-"] .token-name,
.semantic-color-palette-view [class^="component-card"] .token-name {
  color: var(--body, inherit);
}

/* Token value uses meta color */
.semantic-color-palette-view [class^="context-"] .token-value,
.semantic-color-palette-view [class^="component-card"] .token-value {
  color: var(--meta, inherit);
}

/* Preview section divider */
.semantic-color-palette-view [class^="context-"] .preview-section,
.semantic-color-palette-view [class^="component-card"] .preview-section {
  border-color: var(--divider, rgba(128,128,128,0.15));
}

/* Preview text colors */
.semantic-color-palette-view [class^="context-"] .preview-title,
.semantic-color-palette-view [class^="component-card"] .preview-title {
  color: var(--title, inherit);
}

.semantic-color-palette-view [class^="context-"] .preview-body,
.semantic-color-palette-view [class^="component-card"] .preview-body {
  color: var(--body, inherit);
}

.semantic-color-palette-view [class^="context-"] .preview-meta,
.semantic-color-palette-view [class^="component-card"] .preview-meta {
  color: var(--meta, inherit);
}

.semantic-color-palette-view [class^="context-"] .preview-link,
.semantic-color-palette-view [class^="component-card"] .preview-link {
  color: var(--link-text, inherit);
}

/* Tint surface */
.semantic-color-palette-view [class^="context-"] .tint-preview,
.semantic-color-palette-view [class^="component-card"] .tint-preview {
  background-color: var(--tint-surface, inherit);
  color: var(--body, inherit);
}

/* Accent */
.semantic-color-palette-view [class^="context-"] .accent-preview,
.semantic-color-palette-view [class^="component-card"] .accent-preview {
  background-color: var(--accent, inherit);
  color: var(--surface, inherit);
}
</style>
