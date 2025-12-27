<script setup lang="ts">
import { computed } from 'vue'
import type { AssetNode, NodeId, AssetTree } from '../../modules/AssetManager'
import { $AssetTree } from '../../modules/AssetManager'
import type { Asset } from '../../modules/Asset'
import AssetTreeNode from './AssetTreeNode.vue'

const props = defineProps<{
  tree: AssetTree
  selectedNodeId: NodeId | null
  assets: Map<string, Asset>
}>()

const emit = defineEmits<{
  select: [node: AssetNode]
  createFolder: [name: string]
  pickFiles: []
}>()

const rootChildren = computed(() => $AssetTree.getChildren(props.tree, props.tree.rootId))

const handleCreateFolder = () => {
  emit('createFolder', 'New Folder')
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-900 border-r border-gray-700">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700">
      <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Assets</span>
      <div class="flex gap-1">
        <button
          class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="New Folder"
          @click="handleCreateFolder"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Add Files"
          @click="emit('pickFiles')"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tree -->
    <div class="flex-1 overflow-y-auto py-1">
      <template v-if="rootChildren.length > 0">
        <AssetTreeNode
          v-for="node in rootChildren"
          :key="node.id"
          :node="node"
          :tree="tree"
          :selected-node-id="selectedNodeId"
          :assets="assets"
          @select="emit('select', $event)"
        />
      </template>
      <div v-else class="px-4 py-8 text-center text-gray-500 text-sm">
        <p>No assets</p>
        <p class="mt-1 text-xs">Click [+F] to add files</p>
      </div>
    </div>
  </div>
</template>
