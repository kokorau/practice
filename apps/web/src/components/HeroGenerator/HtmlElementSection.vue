<script setup lang="ts">
import { computed } from 'vue'
import type { ForegroundElementConfig, ForegroundElementType } from '@practice/section-visual'
import AddItemMenu, { type MenuItemOption } from './AddItemMenu.vue'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  foregroundElements: ForegroundElementConfig[]
  selectedElementId: string | null
}>()

const emit = defineEmits<{
  'select': [elementId: string]
  'add': [type: ForegroundElementType]
  'remove': [elementId: string]
  'contextmenu': [elementId: string, event: MouseEvent]
}>()

// ============================================================
// Add Menu
// ============================================================

const elementTypes: MenuItemOption<ForegroundElementType>[] = [
  { type: 'title', label: 'Title', icon: 'title' },
  { type: 'description', label: 'Description', icon: 'notes' },
]

// ============================================================
// Computed
// ============================================================

const visibleElements = computed(() =>
  props.foregroundElements.filter(el => el.visible)
)

// ============================================================
// Handlers
// ============================================================

const getElementIcon = (type: ForegroundElementType) =>
  type === 'title' ? 'title' : 'notes'

const getElementLabel = (type: ForegroundElementType) =>
  type === 'title' ? 'Title' : 'Description'

const handleSelect = (elementId: string) => {
  emit('select', elementId)
}

const handleRemove = (elementId: string) => {
  emit('remove', elementId)
}

const handleContextMenu = (elementId: string, event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  emit('contextmenu', elementId, event)
}
</script>

<template>
  <div class="html-element-section">
    <div class="section-header">
      <span class="material-icons section-icon">code</span>
      <span class="section-title">HTML</span>
      <AddItemMenu
        :items="elementTypes"
        title="Add HTML Element"
        @select="(type: ForegroundElementType) => emit('add', type)"
      />
    </div>

    <div class="element-list">
      <div
        v-for="element in visibleElements"
        :key="element.id"
        class="element-item"
        :class="{ selected: selectedElementId === element.id }"
        @click="handleSelect(element.id)"
        @contextmenu="handleContextMenu(element.id, $event)"
      >
        <span class="material-icons element-icon">{{ getElementIcon(element.type) }}</span>
        <span class="element-name">{{ getElementLabel(element.type) }}</span>
        <button
          class="element-remove"
          title="Remove"
          @click.stop="handleRemove(element.id)"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div v-if="visibleElements.length === 0" class="element-empty">
        No HTML elements
      </div>
    </div>
  </div>
</template>

<style scoped>
.html-element-section {
  /* No background or padding */
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.85 0.01 260);
}

:global(.dark) .section-header {
  border-bottom-color: oklch(0.25 0.02 260);
}

.section-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-icon {
  color: oklch(0.60 0.02 260);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .section-title {
  color: oklch(0.70 0.02 260);
}

/* Element List */
.element-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.element-item:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .element-item:hover {
  background: oklch(0.24 0.02 260);
}

.element-item.selected {
  background: oklch(0.55 0.15 250 / 0.15);
}

:global(.dark) .element-item.selected {
  background: oklch(0.55 0.15 250 / 0.25);
}

.element-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .element-icon {
  color: oklch(0.60 0.02 260);
}

.element-name {
  flex: 1;
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .element-name {
  color: oklch(0.85 0.02 260);
}

/* Remove Button */
.element-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.25rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  color: oklch(0.55 0.02 260);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.element-item:hover .element-remove {
  opacity: 1;
}

.element-remove:hover {
  color: oklch(0.50 0.15 25);
  background: oklch(0.90 0.05 25);
}

:global(.dark) .element-remove:hover {
  color: oklch(0.70 0.15 25);
  background: oklch(0.28 0.05 25);
}

.element-remove .material-icons {
  font-size: 0.875rem;
}

/* Empty State */
.element-empty {
  padding: 0.75rem;
  font-size: 0.75rem;
  color: oklch(0.55 0.02 260);
  text-align: center;
}

:global(.dark) .element-empty {
  color: oklch(0.55 0.02 260);
}
</style>
