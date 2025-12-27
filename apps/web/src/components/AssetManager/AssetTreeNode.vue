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

const getTypeIcon = (node: AssetNode): string => {
  if ($AssetNode.isFolder(node)) {
    return isExpanded.value ? 'v' : '>'
  }
  const asset = props.assets.get(($AssetNode.isAssetRef(node) ? node.assetId : '') as string)
  const type: AssetType = asset?.meta.type ?? 'other'
  switch (type) {
    case 'image':
      return '#'
    case 'video':
      return '@'
    case 'audio':
      return '~'
    case 'document':
      return '='
    case 'font':
      return 'A'
    case 'data':
      return '{}'
    default:
      return '*'
  }
}

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
      class="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-700/50 rounded text-sm"
      :class="{ 'bg-blue-600/30': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="handleClick"
    >
      <span class="w-4 text-center text-gray-500 font-mono text-xs">{{ getTypeIcon(node) }}</span>
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
