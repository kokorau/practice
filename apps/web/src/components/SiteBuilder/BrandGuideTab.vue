<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  markdown: string
}>()

const emit = defineEmits<{
  'update:markdown': [value: string]
}>()

const localMarkdown = computed({
  get: () => props.markdown,
  set: (value) => emit('update:markdown', value),
})
</script>

<template>
  <div class="brand-guide-tab">
    <div class="editor-container">
      <div class="editor-header">
        <h2 class="section-heading">Brand Guide Editor</h2>
        <p class="section-description">
          Define your brand's personality, voice, and visual direction for AI-assisted design generation
        </p>
      </div>
      <textarea
        v-model="localMarkdown"
        class="markdown-editor"
        placeholder="# Your Brand Guide

## 1. Product Overview
- Product name:
- Concept:

## 2. Personality
- Tone:
- Attitude:

## 3. Target User
- Age range:
- User profile:

## 4. Value Priority
1.
2.
3.

## 5. What We Don't Do
-

## 6. Visual Direction
- Overall impression:
- Photo style:
- Illustration style:

## 7. Color Mood
- Base color:
- Accent color:

## 8. UI Density
- Information density:
- Whitespace:

## 9. Copy Guide
### Good examples
-

### Bad examples
-
"
      />
    </div>
    <div class="preview-container">
      <div class="preview-header">
        <h2 class="section-heading">Preview</h2>
      </div>
      <div class="markdown-preview">
        <pre class="preview-content">{{ markdown }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-guide-tab {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
  height: calc(100vh - 200px);
  min-height: 500px;
}

.editor-container,
.preview-container {
  display: flex;
  flex-direction: column;
  background: oklch(0.99 0.005 260);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

:global(.dark) .editor-container,
:global(.dark) .preview-container {
  background: oklch(0.16 0.02 260);
}

.editor-header,
.preview-header {
  flex-shrink: 0;
  margin-bottom: 1rem;
}

.section-heading {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: oklch(0.35 0.02 260);
}

:global(.dark) .section-heading {
  color: oklch(0.75 0.02 260);
}

.section-description {
  margin: 0;
  font-size: 0.8rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-description {
  color: oklch(0.60 0.02 260);
}

.markdown-editor {
  flex: 1;
  width: 100%;
  padding: 1rem;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  resize: none;
  background: oklch(0.98 0.003 260);
  color: oklch(0.25 0.02 260);
}

:global(.dark) .markdown-editor {
  background: oklch(0.12 0.015 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.01 260);
}

.markdown-editor:focus {
  outline: none;
  border-color: oklch(0.65 0.15 250);
  box-shadow: 0 0 0 3px oklch(0.65 0.15 250 / 0.15);
}

.markdown-editor::placeholder {
  color: oklch(0.60 0.01 260);
}

:global(.dark) .markdown-editor::placeholder {
  color: oklch(0.45 0.01 260);
}

.markdown-preview {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 8px;
  background: oklch(0.98 0.003 260);
}

:global(.dark) .markdown-preview {
  background: oklch(0.12 0.015 260);
  border-color: oklch(0.30 0.02 260);
}

.preview-content {
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .preview-content {
  color: oklch(0.90 0.01 260);
}
</style>
