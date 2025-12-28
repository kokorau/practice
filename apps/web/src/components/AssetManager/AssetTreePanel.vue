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
  <div class="asset-tree-container">
    <!-- Toolbar -->
    <div class="tree-toolbar">
      <div class="tree-toolbar-actions">
        <button
          class="tree-action-btn"
          title="New Folder"
          @click="handleCreateFolder"
        >
          <svg class="tree-action-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="tree-action-btn"
          title="Add Files"
          @click="emit('pickFiles')"
        >
          <svg class="tree-action-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tree -->
    <div class="tree-content">
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
      <div v-else class="tree-empty">
        <p class="tree-empty-text">No assets</p>
        <p class="tree-empty-hint">Click + to add files</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asset-tree-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid oklch(0.85 0.01 260);
  flex-shrink: 0;
}

:global(.dark) .tree-toolbar {
  border-bottom-color: oklch(0.30 0.02 260);
}

.tree-toolbar-actions {
  display: flex;
  gap: 0.25rem;
}

.tree-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  color: oklch(0.50 0.02 260);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

:global(.dark) .tree-action-btn {
  color: oklch(0.60 0.02 260);
}

.tree-action-btn:hover {
  color: oklch(0.35 0.02 260);
  background: oklch(0.92 0.01 260);
}

:global(.dark) .tree-action-btn:hover {
  color: oklch(0.85 0.02 260);
  background: oklch(0.25 0.02 260);
}

.tree-action-icon {
  width: 1rem;
  height: 1rem;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem 0;
}

.tree-empty {
  padding: 2rem 1rem;
  text-align: center;
}

.tree-empty-text {
  margin: 0;
  font-size: 0.875rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .tree-empty-text {
  color: oklch(0.55 0.02 260);
}

.tree-empty-hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: oklch(0.60 0.02 260);
}

:global(.dark) .tree-empty-hint {
  color: oklch(0.50 0.02 260);
}
</style>
