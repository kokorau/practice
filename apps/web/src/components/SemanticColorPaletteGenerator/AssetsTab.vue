<script setup lang="ts">
import { usePaletteAssets } from '../../composables/SemanticColorPalette/usePaletteAssets'
import AssetTreePanel from '../AssetManager/AssetTreePanel.vue'
import AssetPreviewPanel from '../AssetManager/AssetPreviewPanel.vue'

const {
  tree,
  assets,
  selectedNodeId,
  selectedAsset,
  selectNode,
  createFolder,
  pickFiles,
} = usePaletteAssets()
</script>

<template>
  <div class="assets-tab">
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
  height: calc(100vh - 200px);
  min-height: 500px;
  max-width: 1600px;
  margin: 0 auto;
  background: oklch(0.99 0.005 260);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

:global(.dark) .assets-tab {
  background: oklch(0.16 0.02 260);
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
  border-right: 1px solid oklch(0.85 0.01 260);
  overflow: hidden;
  background: oklch(0.98 0.003 260);
}

:global(.dark) .assets-tree-panel {
  border-right-color: oklch(0.30 0.02 260);
  background: oklch(0.12 0.015 260);
}

.assets-preview-panel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background: oklch(0.98 0.003 260);
}

:global(.dark) .assets-preview-panel {
  background: oklch(0.12 0.015 260);
}
</style>
