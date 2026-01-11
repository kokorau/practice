<script setup lang="ts">
/**
 * ClipGroupShapePanel
 *
 * クリップグループ形状選択パネルのコンテンツ
 */
import type { ObjectSchema } from '@practice/schema'
import type { MaskPattern, TextureRenderSpec, RGBA } from '@practice/texture'
import SchemaFields from '../../SchemaFields.vue'
import MaskPatternThumbnail from '../MaskPatternThumbnail.vue'

defineProps<{
  // Shape params
  shapeSchema: ObjectSchema | null
  shapeParams: Record<string, unknown> | null
  // Patterns
  patterns: MaskPattern[]
  selectedIndex: number | null
  // Colors for thumbnail
  maskOuterColor: RGBA
  maskInnerColor: RGBA
  // Background thumbnail spec creator
  createBackgroundThumbnailSpec: (viewport: { width: number; height: number }) => TextureRenderSpec | null
}>()

const emit = defineEmits<{
  (e: 'update:shapeParams', value: Record<string, unknown>): void
  (e: 'update:selectedIndex', value: number): void
}>()
</script>

<template>
  <!-- Shape params (shown when mask is selected) -->
  <div v-if="shapeSchema && shapeParams" class="shape-params">
    <SchemaFields
      :schema="shapeSchema"
      :model-value="shapeParams"
      :exclude="['cutout']"
      @update:model-value="emit('update:shapeParams', $event)"
    />
  </div>
  <div class="pattern-grid">
    <button
      v-for="(pattern, i) in patterns"
      :key="i"
      class="pattern-button"
      :class="{ active: selectedIndex === i }"
      @click="emit('update:selectedIndex', i)"
    >
      <MaskPatternThumbnail
        :create-background-spec="createBackgroundThumbnailSpec"
        :create-mask-spec="pattern.createSpec"
        :mask-color1="maskOuterColor"
        :mask-color2="maskInnerColor"
      />
      <span class="pattern-label">{{ pattern.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.shape-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

:global(.dark) .shape-params {
  background: oklch(0.18 0.02 260);
}

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
</style>
