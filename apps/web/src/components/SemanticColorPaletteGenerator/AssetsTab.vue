<script setup lang="ts">
import { computed } from 'vue'
import { usePaletteAssets } from '../../composables/SemanticColorPalette/usePaletteAssets'
import { $Asset } from '../../modules/Asset'
import AssetTreePanel from '../AssetManager/AssetTreePanel.vue'
import AssetPreviewPanel from '../AssetManager/AssetPreviewPanel.vue'

const emit = defineEmits<{
  loadBrandGuide: [content: string]
}>()

const {
  tree,
  assets,
  selectedNodeId,
  selectedAsset,
  selectNode,
  createFolder,
  pickFiles,
  BRAND_GUIDE_ASSET_ID,
} = usePaletteAssets()

// Check if selected asset is a markdown file
const isMarkdownSelected = computed(() => {
  if (!selectedAsset.value) return false
  const name = selectedAsset.value.name.toLowerCase()
  const mime = selectedAsset.value.meta.mimeType
  return name.endsWith('.md') || mime === 'text/markdown'
})

// Check if selected asset is the Brand Guide
const isBrandGuideSelected = computed(() => {
  return selectedAsset.value?.id === BRAND_GUIDE_ASSET_ID
})

// Load selected markdown file as Brand Guide
const loadAsBrandGuide = async () => {
  if (!selectedAsset.value || !isMarkdownSelected.value) return

  const blob = await $Asset.toBlob(selectedAsset.value)
  const content = await blob.text()
  emit('loadBrandGuide', content)
}
</script>

<template>
  <div class="assets-tab">
    <!-- Toolbar -->
    <div class="assets-toolbar">
      <div class="assets-toolbar-info">
        <span v-if="isBrandGuideSelected" class="assets-badge assets-badge-primary">
          Brand Guide (自動同期中)
        </span>
        <span v-else-if="isMarkdownSelected" class="assets-badge">
          Markdown
        </span>
      </div>

      <button
        v-if="isMarkdownSelected && !isBrandGuideSelected"
        class="assets-btn"
        title="Load selected markdown as Brand Guide"
        @click="loadAsBrandGuide"
      >
        <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        Load as Brand Guide
      </button>
    </div>

    <!-- Asset Manager Panels -->
    <div class="assets-panels">
      <!-- Left panel: Tree -->
      <div class="assets-tree-panel">
        <AssetTreePanel
          :tree="tree"
          :selected-node-id="selectedNodeId"
          :assets="assets"
          @select="selectNode"
          @create-folder="createFolder"
          @pick-files="pickFiles"
        />
      </div>

      <!-- Right panel: Preview -->
      <div class="assets-preview-panel">
        <AssetPreviewPanel :asset="selectedAsset" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.assets-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-gray-900, #111827);
}

.assets-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-gray-700, #374151);
  background: var(--color-gray-800, #1f2937);
  min-height: 52px;
}

.assets-toolbar-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.assets-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-gray-300, #d1d5db);
  background: var(--color-gray-700, #374151);
  border-radius: 9999px;
}

.assets-badge-primary {
  color: var(--color-green-200, #bbf7d0);
  background: var(--color-green-800, #166534);
}

.assets-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-300, #d1d5db);
  background: var(--color-gray-700, #374151);
  border: 1px solid var(--color-gray-600, #4b5563);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.assets-btn:hover:not(:disabled) {
  background: var(--color-gray-600, #4b5563);
  color: white;
}

.assets-btn-primary {
  background: var(--color-blue-600, #2563eb);
  border-color: var(--color-blue-500, #3b82f6);
  color: white;
}

.assets-btn-primary:hover:not(:disabled) {
  background: var(--color-blue-500, #3b82f6);
}

.assets-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.assets-panels {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.assets-tree-panel {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-gray-700, #374151);
  overflow: hidden;
}

.assets-preview-panel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
</style>
