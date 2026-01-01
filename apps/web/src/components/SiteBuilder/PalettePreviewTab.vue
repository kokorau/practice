<script setup lang="ts">
import {
  type ContextTokens,
  type ComponentTokens,
  type ActionState,
  COMPONENT_CLASS_NAMES,
} from '../../modules/SemanticColorPalette/Domain'
import type { BaseTokenRefs, PrimitiveRef } from '../../modules/SemanticColorPalette/Infra'

type Context = {
  name: string
  label: string
  className: string
  tokens: ContextTokens
  refs: BaseTokenRefs
}

type Component = {
  name: string
  label: string
  className: string
  tokens: ComponentTokens
  refs: BaseTokenRefs
}

type Action = {
  name: string
  label: string
  className: string
  tokens: {
    surface: Record<ActionState, string>
    ink: {
      title: Record<ActionState, string>
      border: Record<ActionState, string>
    }
  }
}

defineProps<{
  contexts: Context[]
  components: Component[]
  actions: Action[]
}>()

const actionStates: ActionState[] = ['default', 'hover', 'active', 'disabled']

// Get token entries for display (flattened for easier viewing)
const getTokenEntries = (tokens: ContextTokens | ComponentTokens, refs: BaseTokenRefs) => {
  const entries: [string, string, PrimitiveRef][] = []
  entries.push(['surface', tokens.surface, refs.surface])
  for (const [key, value] of Object.entries(tokens.ink)) {
    const inkKey = key as keyof typeof refs.ink
    entries.push([`ink.${key}`, value, refs.ink[inkKey]])
  }
  return entries
}
</script>

<template>
  <div class="palette-preview-tab">
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
              v-for="[key, value, ref] in getTokenEntries(ctx.tokens, ctx.refs)"
              :key="key"
              class="token-row"
            >
              <span class="token-name scp-body">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-ref">{{ ref }}</code>
              </div>
            </div>
          </div>

          <!-- Preview section -->
          <div class="preview-section scp-divider">
            <p class="preview-title scp-title">Title text sample</p>
            <p class="preview-body scp-body">Body text sample</p>
            <p class="preview-meta scp-meta">Meta text sample</p>
            <a href="#" class="preview-link scp-link" @click.prevent>Link text sample</a>
            <p class="preview-highlight scp-highlight">Highlight text sample</p>
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

          <div class="tokens-list">
            <div
              v-for="[key, value, ref] in getTokenEntries(comp.tokens, comp.refs)"
              :key="key"
              class="token-row"
            >
              <span class="token-name scp-body">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-ref">{{ ref }}</code>
              </div>
            </div>
          </div>

          <!-- Preview section -->
          <div class="preview-section scp-divider">
            <p class="preview-title scp-title">Title text sample</p>
            <p class="preview-body scp-body">Body text sample</p>
            <p class="preview-meta scp-meta">Meta text sample</p>
            <a href="#" class="preview-link scp-link" @click.prevent>Link text sample</a>
            <p class="preview-highlight scp-highlight">Highlight text sample</p>
          </div>
        </div>

        <!-- Stateful action components (on CardFlat) -->
        <div
          v-for="action in actions"
          :key="action.name"
          class="component-card action-component"
          :class="COMPONENT_CLASS_NAMES.cardFlat"
        >
          <h3 class="component-title scp-title">{{ action.label }}</h3>
          <span class="component-badge scp-meta">Stateful</span>

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
              <span class="state-label scp-meta">{{ state }}</span>
              <button
                class="action-button"
                :style="{
                  backgroundColor: action.tokens.surface[state],
                  borderColor: action.tokens.ink.border[state],
                  color: action.tokens.ink.title[state],
                }"
              >
                Btn
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
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

:global(.dark) .section-heading {
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

.token-ref {
  font-size: 0.75rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  background: color-mix(in oklch, var(--border) 30%, transparent);
  border-radius: 4px;
  color: var(--meta);
}

.preview-section {
  border-top-width: 1px;
  border-top-style: solid;
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

.component-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.component-badge {
  display: inline-block;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
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
  border-width: 1px;
  border-style: solid;
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
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.action-button {
  padding: 0.3rem 0.5rem;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
