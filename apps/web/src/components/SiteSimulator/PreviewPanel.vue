<script setup lang="ts">
import { ref } from 'vue'
import type { SemanticColorToken, RenderedPalette, SectionContent } from '../../modules/SiteSimulator/Domain/ValueObject'
import { $RenderedPalette } from '../../modules/SiteSimulator/Domain/ValueObject'
import type { FontPreset } from '../../modules/Font/Domain/ValueObject'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import DemoPreview from './DemoPreview.vue'
import PalettePreview from './PalettePreview.vue'

type PreviewMode = 'demo' | 'palette' | 'css'

defineProps<{
  sections: readonly SectionContent[]
  getCssColor: (token: SemanticColorToken) => string
  paletteGroups: Array<{
    name: string
    tokens: SemanticColorToken[]
  }>
  renderedPalette: RenderedPalette
  font: FontPreset | undefined
  stylePack: StylePack
}>()

const previewMode = ref<PreviewMode>('demo')

const previewModes = [
  { id: 'demo' as const, label: 'Demo' },
  { id: 'palette' as const, label: 'Palette' },
  { id: 'css' as const, label: 'CSS' },
]
</script>

<template>
  <main class="preview-panel">
    <!-- Floating Preview Switcher -->
    <div class="preview-switcher">
      <button
        v-for="mode in previewModes"
        :key="mode.id"
        class="preview-tab"
        :class="{ active: previewMode === mode.id }"
        @click="previewMode = mode.id"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Demo Preview -->
    <div v-if="previewMode === 'demo'" class="preview-content demo-mode">
      <DemoPreview :sections="sections" :get-css-color="getCssColor" :rendered-palette="renderedPalette" :font="font" :style-pack="stylePack" />
    </div>

    <!-- Palette Preview -->
    <div v-else-if="previewMode === 'palette'" class="preview-content">
      <PalettePreview
        :get-css-color="getCssColor"
        :palette-groups="paletteGroups"
      />
    </div>

    <!-- CSS Output -->
    <div v-else-if="previewMode === 'css'" class="preview-content">
      <pre class="bg-gray-900 p-4 rounded text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">{{
        $RenderedPalette.toCssVariables(renderedPalette)
      }}</pre>
    </div>
  </main>
</template>

<style scoped>
.preview-panel {
  position: relative;
  padding: 1.5rem;
  overflow-y: auto;
}

.preview-switcher {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(31, 41, 55, 0.95);
  border-radius: 0.5rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.preview-tab {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
}

.preview-tab:hover {
  color: white;
}

.preview-tab.active {
  background: #374151;
  color: white;
}

.preview-content {
  padding-top: 2rem;
}

.preview-content.demo-mode {
  height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
}
</style>
