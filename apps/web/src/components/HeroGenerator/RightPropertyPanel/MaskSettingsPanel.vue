<script setup lang="ts">
/**
 * @deprecated Use EffectorSettingsPanel instead
 * This component is kept for backward compatibility
 */
import type { RGBA, MaskPatternLayer, Viewport } from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette } from '@practice/semantic-color-palette'
import type { SurfaceLayerNodeConfig, ProcessorNodeConfig } from '@practice/section-visual'
import SchemaFields from '../../SchemaFields.vue'
import MaskPatternThumbnail from '../MaskPatternThumbnail.vue'

/**
 * Legacy mask spec creator type for backward compatibility.
 */
type MaskSpecCreator = (color1: RGBA, color2: RGBA, viewport: Viewport) => { shader: string; uniforms: ArrayBuffer; bufferSize: number }

/**
 * Mask pattern item for thumbnail list.
 * Uses children-based format compatible with MaskPattern.
 * Also supports legacy createSpec for backward compatibility.
 */
export interface MaskPatternItem {
  label: string
  children: MaskPatternLayer[]
  createSpec?: MaskSpecCreator
}

defineProps<{
  maskPatterns: MaskPatternItem[]
  selectedMaskIndex: number | null
  maskShapeSchema: ObjectSchema | null
  maskShapeParams: Record<string, unknown> | null
  maskOuterColor: RGBA
  maskInnerColor: RGBA
  createBackgroundThumbnailSpec?: (viewport: Viewport) => { shader: string; uniforms: ArrayBuffer; bufferSize: number } | null
  // Pipeline-based rendering props
  surface?: SurfaceLayerNodeConfig
  processor?: ProcessorNodeConfig
  palette?: PrimitivePalette
}>()

const emit = defineEmits<{
  'update:selectedMaskIndex': [value: number]
  'update:maskShapeParams': [value: Record<string, unknown>]
}>()
</script>

<template>
  <div class="processor-settings">
    <!-- Shape params (shown when mask is selected) -->
    <div v-if="maskShapeSchema && maskShapeParams" class="shape-params">
      <SchemaFields
        :schema="maskShapeSchema"
        :model-value="maskShapeParams"
        :exclude="['cutout']"
        @update:model-value="emit('update:maskShapeParams', $event)"
      />
    </div>
    <div class="pattern-grid">
      <button
        v-for="(pattern, i) in maskPatterns"
        :key="i"
        class="pattern-button"
        :class="{ active: selectedMaskIndex === i }"
        @click="emit('update:selectedMaskIndex', i)"
      >
        <MaskPatternThumbnail
          v-if="pattern.createSpec"
          :create-background-spec="createBackgroundThumbnailSpec"
          :create-mask-spec="pattern.createSpec"
          :mask-color1="maskOuterColor"
          :mask-color2="maskInnerColor"
        />
        <span class="pattern-label">{{ pattern.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.processor-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shape-params {
  padding: 0.5rem 0;
  border-bottom: 1px solid oklch(0.90 0.01 260);
}

:global(.dark) .shape-params {
  border-bottom-color: oklch(0.22 0.02 260);
}

/* Pattern Grid */
.pattern-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

:global(.dark) .pattern-button {
  border-color: oklch(0.30 0.02 260);
}

.pattern-button:hover {
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .pattern-button:hover {
  border-color: oklch(0.40 0.02 260);
}

.pattern-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.pattern-label {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
  text-align: left;
}

:global(.dark) .pattern-label {
  color: oklch(0.70 0.02 260);
}
</style>
