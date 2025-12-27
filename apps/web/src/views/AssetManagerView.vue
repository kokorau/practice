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
  <div class="w-screen h-screen bg-gray-900 text-white flex flex-col">
    <!-- Header -->
    <header class="flex items-center gap-4 px-4 py-2 border-b border-gray-700 bg-gray-800">
      <RouterLink to="/" class="text-blue-400 hover:text-blue-300 text-sm">
        &larr; Home
      </RouterLink>
      <h1 class="text-lg font-semibold">Asset Manager</h1>
    </header>

    <!-- Main content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left panel: Tree -->
      <div class="w-80 flex-shrink-0">
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
  </div>
</template>
