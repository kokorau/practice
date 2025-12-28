<script setup lang="ts">
import { useAssetManager } from '../composables/AssetManager'
import AssetTreePanel from '../components/AssetManager/AssetTreePanel.vue'
import AssetPreviewPanel from '../components/AssetManager/AssetPreviewPanel.vue'

const {
  tree,
  assets,
  selectedNodeId,
  selectedAsset,
  selectNode,
  createFolder,
  pickFiles,
} = useAssetManager()
</script>

<template>
  <div class="w-[1200px] h-[1000px] mx-auto my-8 bg-gray-900 text-white flex overflow-hidden rounded-xl border border-gray-700 shadow-2xl">
    <!-- Left panel: Tree -->
    <div class="w-80 flex-shrink-0 border-r border-gray-700">
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
    <div class="flex-1">
      <AssetPreviewPanel :asset="selectedAsset" />
    </div>
  </div>
</template>
