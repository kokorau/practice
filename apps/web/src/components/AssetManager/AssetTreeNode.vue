<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AssetNode, FolderNode, NodeId, AssetTree } from '../../modules/AssetManager'
import { $AssetNode, $AssetTree } from '../../modules/AssetManager'
import type { Asset, AssetType } from '../../modules/Asset'

const props = defineProps<{
  node: AssetNode
  tree: AssetTree
  selectedNodeId: NodeId | null
  assets: Map<string, Asset>
  depth?: number
}>()

const emit = defineEmits<{
  select: [node: AssetNode]
}>()

const depth = computed(() => props.depth ?? 0)
const isFolder = computed(() => $AssetNode.isFolder(props.node))
const isExpanded = ref(false)

const children = computed(() => {
  if (!isFolder.value) return []
  return $AssetTree.getChildren(props.tree, props.node.id)
})

const isSelected = computed(() => props.selectedNodeId === props.node.id)

const getAssetType = computed(() => {
  if (isFolder.value) return 'folder'
  const asset = props.assets.get(($AssetNode.isAssetRef(props.node) ? props.node.assetId : '') as string)
  return asset?.meta.type ?? 'other'
})

const handleClick = () => {
  if (isFolder.value) {
    isExpanded.value = !isExpanded.value
  }
  emit('select', props.node)
}
</script>

<template>
  <div class="select-none">
    <div
      class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700/50 rounded text-sm"
      :class="{ 'bg-blue-600/30': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="handleClick"
    >
      <!-- Folder icons -->
      <template v-if="getAssetType === 'folder'">
        <svg v-if="isExpanded" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      </template>
      <!-- Image icon -->
      <svg v-else-if="getAssetType === 'image'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
      </svg>
      <!-- Video icon -->
      <svg v-else-if="getAssetType === 'video'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
      </svg>
      <!-- Audio icon -->
      <svg v-else-if="getAssetType === 'audio'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
      </svg>
      <!-- Document icon -->
      <svg v-else-if="getAssetType === 'document'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
      </svg>
      <!-- Font icon -->
      <svg v-else-if="getAssetType === 'font'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
      <!-- Data icon -->
      <svg v-else-if="getAssetType === 'data'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clip-rule="evenodd" />
      </svg>
      <!-- Other/default icon -->
      <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
      </svg>
      <span class="truncate" :class="isFolder ? 'text-gray-200' : 'text-gray-400'">
        {{ node.name }}
      </span>
    </div>

    <template v-if="isFolder && isExpanded">
      <AssetTreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :tree="tree"
        :selected-node-id="selectedNodeId"
        :assets="assets"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>
