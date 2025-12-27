<script setup lang="ts">
import { ref } from 'vue'
import { useAssetManager } from '../composables/AssetManager'
import type { AssetNode } from '../modules/AssetManager'
import { $AssetNode, $NodeId } from '../modules/AssetManager'
import type { AssetType } from '../modules/Asset'

const {
  currentNodes,
  currentPath,
  breadcrumbs,
  getAsset,
  navigateTo,
  navigateUp,
  handleNodeClick,
  createFolder,
  pickFiles,
  removeNode,
  renameNode,
} = useAssetManager()

const isCreatingFolder = ref(false)
const newFolderName = ref('')
const editingNodeId = ref<string | null>(null)
const editingName = ref('')

const getTypeIcon = (type: AssetType | 'folder') => {
  switch (type) {
    case 'folder':
      return '[D]'
    case 'image':
      return '[I]'
    case 'video':
      return '[V]'
    case 'audio':
      return '[A]'
    case 'document':
      return '[T]'
    case 'font':
      return '[F]'
    case 'data':
      return '[J]'
    default:
      return '[?]'
  }
}

const formatSize = (bytes?: number) => {
  if (bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const getNodeType = (node: AssetNode): AssetType | 'folder' => {
  if ($AssetNode.isFolder(node)) return 'folder'
  const asset = getAsset(node)
  return asset?.meta.type ?? 'other'
}

const getNodeSize = (node: AssetNode): number | undefined => {
  if ($AssetNode.isFolder(node)) return undefined
  const asset = getAsset(node)
  return asset?.meta.size
}

const handleCreateFolder = () => {
  if (newFolderName.value.trim()) {
    createFolder(newFolderName.value.trim())
    newFolderName.value = ''
    isCreatingFolder.value = false
  }
}

const startEditing = (node: AssetNode) => {
  editingNodeId.value = node.id
  editingName.value = node.name
}

const finishEditing = (node: AssetNode) => {
  if (editingName.value.trim() && editingName.value !== node.name) {
    renameNode(node.id, editingName.value.trim())
  }
  editingNodeId.value = null
  editingName.value = ''
}

const handleDelete = (node: AssetNode, event: Event) => {
  event.stopPropagation()
  if (confirm(`Delete "${node.name}"?`)) {
    removeNode(node.id)
  }
}
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <header class="mb-8">
        <RouterLink to="/" class="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
          &larr; Home
        </RouterLink>
        <h1 class="text-3xl font-bold">Asset Manager</h1>
        <p class="text-gray-400 mt-2">Local asset management</p>
      </header>

      <!-- Toolbar -->
      <div class="flex items-center gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
        <!-- Breadcrumbs -->
        <div class="flex-1 flex items-center gap-1 overflow-x-auto">
          <template v-for="(node, index) in breadcrumbs" :key="node.id">
            <span v-if="index > 0" class="text-gray-500">/</span>
            <button
              class="px-2 py-1 text-sm hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
              :class="index === breadcrumbs.length - 1 ? 'text-white' : 'text-gray-400'"
              @click="navigateTo(node.id)"
            >
              {{ node.name }}
            </button>
          </template>
        </div>

        <button
          class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          @click="isCreatingFolder = true"
        >
          New Folder
        </button>
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          @click="pickFiles"
        >
          Add Files
        </button>
      </div>

      <!-- New Folder Input -->
      <div v-if="isCreatingFolder" class="mb-4 flex items-center gap-2">
        <input
          v-model="newFolderName"
          type="text"
          placeholder="Folder name"
          class="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
          @keyup.enter="handleCreateFolder"
          @keyup.escape="isCreatingFolder = false"
        />
        <button
          class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          @click="handleCreateFolder"
        >
          Create
        </button>
        <button
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          @click="isCreatingFolder = false"
        >
          Cancel
        </button>
      </div>

      <!-- Up button -->
      <div v-if="breadcrumbs.length > 1" class="mb-2">
        <button
          class="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          @click="navigateUp"
        >
          <span>..</span>
          <span class="text-sm">Parent folder</span>
        </button>
      </div>

      <!-- File List -->
      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-300">Name</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-300 w-24">Type</th>
              <th class="text-right px-4 py-3 text-sm font-medium text-gray-300 w-28">Size</th>
              <th class="text-right px-4 py-3 text-sm font-medium text-gray-300 w-44">Modified</th>
              <th class="w-20"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="node in currentNodes"
              :key="node.id"
              class="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer"
              @click="handleNodeClick(node)"
              @dblclick="startEditing(node)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-gray-500 font-mono text-xs">{{ getTypeIcon(getNodeType(node)) }}</span>
                  <template v-if="editingNodeId === node.id">
                    <input
                      v-model="editingName"
                      type="text"
                      class="flex-1 px-2 py-1 bg-gray-900 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      @click.stop
                      @keyup.enter="finishEditing(node)"
                      @keyup.escape="editingNodeId = null"
                      @blur="finishEditing(node)"
                    />
                  </template>
                  <template v-else>
                    {{ node.name }}
                  </template>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-400 text-sm">{{ getNodeType(node) }}</td>
              <td class="px-4 py-3 text-gray-400 text-sm text-right">
                {{ formatSize(getNodeSize(node)) }}
              </td>
              <td class="px-4 py-3 text-gray-400 text-sm text-right">
                {{ node.updatedAt.toLocaleDateString() }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="!$NodeId.isRoot(node.id)"
                  class="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded text-sm transition-colors"
                  @click="handleDelete(node, $event)"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="currentNodes.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-gray-500">
                Empty folder. Click "Add Files" or "New Folder" to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Path display -->
      <div class="mt-4 text-sm text-gray-500">
        Current path: <code class="font-mono">{{ currentPath }}</code>
      </div>
    </div>
  </div>
</template>
