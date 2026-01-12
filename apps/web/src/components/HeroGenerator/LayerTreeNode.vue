<script setup lang="ts">
/**
 * LayerTreeNode
 *
 * Recursive tree node component for layer panel (Figma-style)
 * - Nested display with expand/collapse
 * - Type-specific icons
 * - Visibility toggle
 * - Modifier sub-items (Effect/Mask)
 */

import { computed } from 'vue'
import type { SceneNode, Group, LayerVariant } from '../../modules/HeroScene'
import { isGroup, isLayer, isEffectModifier } from '../../modules/HeroScene'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  node: SceneNode
  depth: number
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [nodeId: string]
  'toggle-expand': [nodeId: string]
  'toggle-visibility': [nodeId: string]
  'select-processor': [nodeId: string, processorType: 'effect' | 'mask']
  'remove-layer': [nodeId: string]
}>()

// ============================================================
// Computed
// ============================================================

const isSelected = computed(() => props.selectedId === props.node.id)
const isGroupNode = computed(() => isGroup(props.node))
const hasChildren = computed(() => isGroupNode.value && (props.node as Group).children.length > 0)
const isExpanded = computed(() => props.node.expanded)

// Get node variant for Layer nodes
const nodeVariant = computed((): LayerVariant | 'group' => {
  if (isLayer(props.node)) {
    return props.node.variant
  }
  return 'group'
})

// Get children for group nodes
const children = computed(() => {
  if (isGroup(props.node)) {
    return props.node.children
  }
  return []
})

// Get modifier info for display
// Note: Effect details are managed by useEffectManager and shown in property panel
// Layer tree only shows whether effect modifiers exist
const modifiers = computed(() => {
  const result: { type: 'effect' | 'mask'; label: string; value: string; enabled: boolean }[] = []

  // Groups may have modifiers too
  const nodeModifiers = props.node.modifiers
  // Effect placeholder - details are in useEffectManager
  const effectMod = nodeModifiers.find(isEffectModifier)
  if (effectMod) {
    result.push({
      type: 'effect',
      label: 'Effect',
      value: '', // Details shown in property panel
      enabled: true,
    })
  }

  return result
})

// ============================================================
// Icon & Label Helpers
// ============================================================

const getLayerIcon = (variant: LayerVariant | 'group'): string => {
  switch (variant) {
    case 'base': return 'gradient'
    case 'surface': return 'texture'
    case 'group': return 'folder_open'
    case 'model3d': return 'view_in_ar'
    case 'image': return 'image'
    case 'text': return 'text_fields'
    default: return 'layers'
  }
}

const getLayerTypeLabel = (variant: LayerVariant | 'group'): string => {
  switch (variant) {
    case 'base': return 'Base'
    case 'surface': return 'Surface'
    case 'group': return 'Group'
    case 'model3d': return '3D Model'
    case 'image': return 'Image'
    case 'text': return 'Text'
    default: return 'Layer'
  }
}

// ============================================================
// Event Handlers
// ============================================================

const handleSelect = () => {
  emit('select', props.node.id)
}

const handleToggleExpand = (e: Event) => {
  e.stopPropagation()
  emit('toggle-expand', props.node.id)
}

const handleToggleVisibility = (e: Event) => {
  e.stopPropagation()
  emit('toggle-visibility', props.node.id)
}

const handleRemove = (e: Event) => {
  e.stopPropagation()
  emit('remove-layer', props.node.id)
}

const handleSelectProcessor = (type: 'effect' | 'mask') => {
  emit('select-processor', props.node.id, type)
}
</script>

<template>
  <div class="layer-tree-node">
    <!-- Node Header -->
    <div
      class="node-header"
      :class="{ selected: isSelected }"
      @click="handleSelect"
    >
      <!-- Expand Toggle (Group only) -->
      <button
        v-if="hasChildren || isGroupNode"
        class="expand-toggle"
        :class="{ expanded: isExpanded }"
        @click="handleToggleExpand"
      >
        <span class="material-icons">chevron_right</span>
      </button>
      <span v-else class="expand-spacer" />

      <!-- Type Icon -->
      <span class="material-icons layer-icon">{{ getLayerIcon(nodeVariant) }}</span>

      <!-- Layer Info -->
      <div class="layer-info">
        <span class="layer-type">{{ getLayerTypeLabel(nodeVariant) }}</span>
        <span class="layer-name">{{ node.name }}</span>
      </div>

      <!-- Visibility Toggle -->
      <button
        class="visibility-toggle"
        :class="{ hidden: !node.visible }"
        @click="handleToggleVisibility"
      >
        <span class="material-icons">{{ node.visible ? 'visibility' : 'visibility_off' }}</span>
      </button>

      <!-- Remove Button -->
      <button
        class="remove-toggle"
        @click="handleRemove"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Modifiers (Effect/Mask) - Visual sub-items when selected -->
    <div v-if="isSelected && modifiers.length > 0" class="processors">
      <button
        v-for="mod in modifiers"
        :key="mod.type"
        class="processor-item"
        @click="handleSelectProcessor(mod.type)"
      >
        <span class="processor-label">{{ mod.label }}</span>
        <span class="processor-value">{{ mod.value }}</span>
        <span class="material-icons processor-arrow">chevron_right</span>
      </button>
    </div>

    <!-- Children (Recursive) -->
    <template v-if="isExpanded && children.length > 0">
      <LayerTreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        @select="(id: string) => emit('select', id)"
        @toggle-expand="(id: string) => emit('toggle-expand', id)"
        @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
        @select-processor="(id: string, type: 'effect' | 'mask') => emit('select-processor', id, type)"
        @remove-layer="(id: string) => emit('remove-layer', id)"
      />
    </template>
  </div>
</template>

<style scoped>
.layer-tree-node {
  display: flex;
  flex-direction: column;
}

/* Node Header */
.node-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 0.25rem;
}

.node-header:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .node-header:hover {
  background: oklch(0.24 0.02 260);
}

.node-header.selected {
  background: oklch(0.55 0.15 250 / 0.15);
}

:global(.dark) .node-header.selected {
  background: oklch(0.55 0.15 250 / 0.25);
}

/* Expand Toggle */
.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  border-radius: 0.125rem;
  transition: transform 0.15s, color 0.15s;
  flex-shrink: 0;
}

:global(.dark) .expand-toggle {
  color: oklch(0.55 0.02 260);
}

.expand-toggle:hover {
  color: oklch(0.35 0.02 260);
}

:global(.dark) .expand-toggle:hover {
  color: oklch(0.75 0.02 260);
}

.expand-toggle.expanded {
  transform: rotate(90deg);
}

.expand-toggle .material-icons {
  font-size: 1rem;
}

.expand-spacer {
  width: 1rem;
  flex-shrink: 0;
}

/* Layer Icon */
.layer-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .layer-icon {
  color: oklch(0.60 0.02 260);
}

/* Layer Info */
.layer-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.layer-type {
  display: none;
}

.layer-name {
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .layer-name {
  color: oklch(0.85 0.02 260);
}

/* Visibility Toggle */
.visibility-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  border-radius: 0.125rem;
  transition: color 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.node-header:hover .visibility-toggle,
.visibility-toggle.hidden {
  opacity: 1;
}

:global(.dark) .visibility-toggle {
  color: oklch(0.60 0.02 260);
}

.visibility-toggle:hover {
  color: oklch(0.30 0.02 260);
}

:global(.dark) .visibility-toggle:hover {
  color: oklch(0.85 0.02 260);
}

.visibility-toggle.hidden {
  color: oklch(0.70 0.01 260);
}

:global(.dark) .visibility-toggle.hidden {
  color: oklch(0.40 0.02 260);
}

.visibility-toggle .material-icons {
  font-size: 1rem;
}

.visibility-spacer {
  width: 1.25rem;
  flex-shrink: 0;
}

/* Remove Toggle */
.remove-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.55 0.02 260);
  cursor: pointer;
  border-radius: 0.125rem;
  transition: color 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.node-header:hover .remove-toggle {
  opacity: 1;
}

:global(.dark) .remove-toggle {
  color: oklch(0.50 0.02 260);
}

.remove-toggle:hover {
  color: oklch(0.60 0.15 25);
}

.remove-toggle .material-icons {
  font-size: 1rem;
}

/* Processors */
.processors {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0.125rem 0 0.25rem;
}

.processor-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: oklch(0.94 0.01 260);
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 0.25rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  margin-right: 0.5rem;
}

:global(.dark) .processor-item {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.25 0.02 260);
}

.processor-item:hover {
  background: oklch(0.90 0.01 260);
  border-color: oklch(0.80 0.01 260);
}

:global(.dark) .processor-item:hover {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.32 0.02 260);
}

.processor-label {
  font-size: 0.625rem;
  font-weight: 500;
  color: oklch(0.50 0.02 260);
  min-width: 2.5rem;
}

:global(.dark) .processor-label {
  color: oklch(0.60 0.02 260);
}

.processor-value {
  flex: 1;
  font-size: 0.6875rem;
  color: oklch(0.30 0.02 260);
}

:global(.dark) .processor-value {
  color: oklch(0.80 0.02 260);
}

.processor-arrow {
  font-size: 0.875rem;
  color: oklch(0.60 0.02 260);
}

:global(.dark) .processor-arrow {
  color: oklch(0.45 0.02 260);
}

.processor-item:hover .processor-arrow {
  color: oklch(0.40 0.02 260);
}

:global(.dark) .processor-item:hover .processor-arrow {
  color: oklch(0.70 0.02 260);
}
</style>
