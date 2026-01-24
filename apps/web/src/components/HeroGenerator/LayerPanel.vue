<script setup lang="ts">
import type { LayerNodeConfig, ForegroundElementConfig, ForegroundElementType, LayerDropPosition, ModifierDropPosition } from '@practice/section-visual'
import CanvasLayerSection, { type LayerType, type ContextTargetType, type AddProcessorType } from './CanvasLayerSection.vue'
import HtmlElementSection from './HtmlElementSection.vue'

// ============================================================
// Re-export types for backward compatibility
// ============================================================

export type { LayerType, ContextTargetType, AddProcessorType }

/** Sub-item types within a layer */
export type SubItemType = 'surface' | 'shape' | 'effect' | 'source' | 'filter'

/** HTML element types (re-exported for backward compatibility) */
export type HtmlElementType = ForegroundElementType

// ============================================================
// Props & Emits
// ============================================================

defineProps<{
  layers: LayerNodeConfig[]
  foregroundElements: ForegroundElementConfig[]
  selectedForegroundElementId: string | null
  expandedLayerIds: Set<string>
}>()

const emit = defineEmits<{
  'select-layer': [layerId: string]
  'toggle-expand': [layerId: string]
  'toggle-visibility': [layerId: string]
  'select-processor': [layerId: string, processorType: 'effect' | 'mask' | 'processor']
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
  'add-processor': [layerId: string, processorType: AddProcessorType]
  'layer-contextmenu': [layerId: string, event: MouseEvent, targetType: ContextTargetType, modifierIndex?: number]
  'move-node': [nodeId: string, position: LayerDropPosition]
  'move-modifier': [sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition]
  'select-foreground-element': [elementId: string]
  'add-foreground-element': [type: ForegroundElementType]
  'remove-foreground-element': [elementId: string]
  'foreground-contextmenu': [elementId: string, event: MouseEvent]
}>()
</script>

<template>
  <div class="layer-panel">
    <!-- Canvas Layers Section -->
    <CanvasLayerSection
      :layers="layers"
      :expanded-layer-ids="expandedLayerIds"
      @select-layer="(id: string) => emit('select-layer', id)"
      @toggle-expand="(id: string) => emit('toggle-expand', id)"
      @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
      @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
      @add-layer="(type: LayerType) => emit('add-layer', type)"
      @remove-layer="(id: string) => emit('remove-layer', id)"
      @add-processor="(id: string, type: AddProcessorType) => emit('add-processor', id, type)"
      @contextmenu="(layerId: string, event: MouseEvent, targetType: ContextTargetType, modifierIndex?: number) => emit('layer-contextmenu', layerId, event, targetType, modifierIndex)"
      @move-node="(nodeId: string, position: LayerDropPosition) => emit('move-node', nodeId, position)"
      @move-modifier="(sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition) => emit('move-modifier', sourceNodeId, modifierIndex, position)"
    />

    <!-- HTML Section -->
    <HtmlElementSection
      :foreground-elements="foregroundElements"
      :selected-element-id="selectedForegroundElementId"
      @select="(id: string) => emit('select-foreground-element', id)"
      @add="(type: ForegroundElementType) => emit('add-foreground-element', type)"
      @remove="(id: string) => emit('remove-foreground-element', id)"
      @contextmenu="(id: string, event: MouseEvent) => emit('foreground-contextmenu', id, event)"
    />
  </div>
</template>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
