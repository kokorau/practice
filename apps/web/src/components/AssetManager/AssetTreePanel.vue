<script setup lang="ts">
import { ref, computed } from 'vue'
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

const isCreatingFolder = ref(false)
const newFolderName = ref('')

const rootChildren = computed(() => $AssetTree.getChildren(props.tree, props.tree.rootId))

const handleCreateFolder = () => {
  if (newFolderName.value.trim()) {
    emit('createFolder', newFolderName.value.trim())
    newFolderName.value = ''
    isCreatingFolder.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-900 border-r border-gray-700">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700">
      <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Assets</span>
      <div class="flex gap-1">
        <button
          class="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-xs"
          title="New Folder"
          @click="isCreatingFolder = true"
        >
          [+D]
        </button>
        <button
          class="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-xs"
          title="Add Files"
          @click="emit('pickFiles')"
        >
          [+F]
        </button>
      </div>
    </div>

    <!-- New Folder Input -->
    <div v-if="isCreatingFolder" class="px-2 py-2 border-b border-gray-700">
      <input
        v-model="newFolderName"
        type="text"
        placeholder="Folder name..."
        class="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
        @keyup.enter="handleCreateFolder"
        @keyup.escape="isCreatingFolder = false"
      />
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
