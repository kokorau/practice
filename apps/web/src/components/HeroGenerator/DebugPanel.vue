<script setup lang="ts">
import { computed, ref } from 'vue'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-json'

interface DebugSection {
  id: string
  label: string
  data: unknown
}

const props = defineProps<{
  sections: DebugSection[]
}>()

const expandedSections = ref<Set<string>>(new Set(['heroViewConfig']))

const toggleSection = (id: string) => {
  if (expandedSections.value.has(id)) {
    expandedSections.value.delete(id)
  } else {
    expandedSections.value.add(id)
  }
  expandedSections.value = new Set(expandedSections.value)
}

const highlightedSections = computed(() => {
  return props.sections.map(section => {
    const jsonStr = JSON.stringify(section.data, null, 2)
    const grammar = Prism.languages.json
    const highlighted = grammar ? Prism.highlight(jsonStr, grammar, 'json') : jsonStr
    return {
      ...section,
      highlighted,
      lineCount: jsonStr.split('\n').length,
    }
  })
})
</script>

<template>
  <div class="debug-panel">
    <div class="debug-header">
      <h2 class="debug-title">HeroScene Debug</h2>
      <p class="debug-description">Real-time state visualization</p>
    </div>

    <div class="debug-sections">
      <div
        v-for="section in highlightedSections"
        :key="section.id"
        class="debug-section"
      >
        <button
          class="debug-section-header"
          @click="toggleSection(section.id)"
        >
          <span class="debug-section-icon">{{ expandedSections.has(section.id) ? '▼' : '▶' }}</span>
          <span class="debug-section-label">{{ section.label }}</span>
          <span class="debug-section-meta">{{ section.lineCount }} lines</span>
        </button>

        <div
          v-if="expandedSections.has(section.id)"
          class="debug-section-content"
        >
          <pre class="debug-code"><code v-html="section.highlighted" /></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: oklch(0.98 0.005 260);
  overflow: hidden;
}

:global(.dark) .debug-panel {
  background: oklch(0.10 0.02 260);
}

.debug-header {
  flex-shrink: 0;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

:global(.dark) .debug-header {
  border-bottom-color: oklch(0.20 0.02 260);
}

.debug-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .debug-title {
  color: oklch(0.90 0.01 260);
}

.debug-description {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .debug-description {
  color: oklch(0.55 0.02 260);
}

.debug-sections {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.debug-section {
  margin-bottom: 0.5rem;
  border-radius: 0.5rem;
  overflow: hidden;
  background: oklch(0.96 0.005 260);
  border: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .debug-section {
  background: oklch(0.14 0.02 260);
  border-color: oklch(0.22 0.02 260);
}

.debug-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.debug-section-header:hover {
  background: oklch(0.92 0.01 260);
}

:global(.dark) .debug-section-header:hover {
  background: oklch(0.18 0.02 260);
}

.debug-section-icon {
  flex-shrink: 0;
  font-size: 0.625rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .debug-section-icon {
  color: oklch(0.55 0.02 260);
}

.debug-section-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .debug-section-label {
  color: oklch(0.85 0.01 260);
}

.debug-section-meta {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: oklch(0.55 0.02 260);
}

:global(.dark) .debug-section-meta {
  color: oklch(0.50 0.02 260);
}

.debug-section-content {
  border-top: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .debug-section-content {
  border-top-color: oklch(0.22 0.02 260);
}

.debug-code {
  margin: 0;
  padding: 1rem;
  font-size: 0.75rem;
  line-height: 1.5;
  background: oklch(0.18 0.02 260);
  color: oklch(0.85 0.01 260);
  overflow-x: auto;
}

:global(.dark) .debug-code {
  background: oklch(0.08 0.02 260);
}
</style>

<style>
/* Prism.js token overrides */
.debug-code .token.property {
  color: oklch(0.75 0.15 200);
}

.debug-code .token.string {
  color: oklch(0.75 0.12 140);
}

.debug-code .token.number {
  color: oklch(0.75 0.15 50);
}

.debug-code .token.boolean {
  color: oklch(0.75 0.15 320);
}

.debug-code .token.null {
  color: oklch(0.60 0.10 260);
}

.debug-code .token.punctuation {
  color: oklch(0.60 0.02 260);
}
</style>
