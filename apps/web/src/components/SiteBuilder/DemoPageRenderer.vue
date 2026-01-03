<script setup lang="ts">
/**
 * DemoPageRenderer - Renders a page with mixed HTML and Canvas sections
 *
 * For sections with canvas config, renders using WebGPU.
 * For other sections, renders HTML templates.
 */
import type { Section, RenderTheme } from '../../modules/SemanticSection/Domain'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import { $Section, renderSection } from '../../modules/SemanticSection'
import HeroCanvasSection from './HeroCanvasSection.vue'

const props = defineProps<{
  sections: readonly Section[]
  theme: RenderTheme
  primitivePalette: PrimitivePalette
  isDark?: boolean
}>()

// Render HTML for non-canvas sections
const renderSectionHtml = (section: Section): string => {
  return renderSection(section, props.theme)
}

// Check if section has canvas rendering
const hasCanvas = (section: Section): boolean => {
  return $Section.hasCanvas(section)
}
</script>

<template>
  <div class="demo-page">
    <template v-for="section in sections" :key="section.id">
      <!-- Hero with Canvas rendering -->
      <HeroCanvasSection
        v-if="hasCanvas(section)"
        :config="(section as any).canvas"
        :primitive-palette="primitivePalette"
        :is-dark="isDark"
      />

      <!-- HTML template rendering -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-else
        v-html="renderSectionHtml(section)"
      />
    </template>
  </div>
</template>

<style scoped>
.demo-page {
  display: flex;
  flex-direction: column;
}
</style>
