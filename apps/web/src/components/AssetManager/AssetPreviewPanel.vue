<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import type { Asset } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'

const props = defineProps<{
  asset: Asset | null
}>()

const previewUrl = ref<string | null>(null)
const isLoading = ref(false)

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const formatDate = (date: Date) => {
  return date.toLocaleString()
}

// Clean up previous URL
const revokeUrl = () => {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
}

watch(
  () => props.asset,
  async (asset) => {
    revokeUrl()

    if (!asset) return

    // Only load preview for images
    if (asset.meta.type === 'image') {
      isLoading.value = true
      try {
        previewUrl.value = await $Asset.toObjectUrl(asset)
      } finally {
        isLoading.value = false
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  revokeUrl()
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-800">
    <!-- No selection -->
    <div v-if="!asset" class="flex-1 flex items-center justify-center text-gray-500">
      <p class="text-sm">Select a file to preview</p>
    </div>

    <!-- Asset selected -->
    <template v-else>
      <!-- Preview area -->
      <div class="flex-1 flex items-center justify-center p-4 overflow-hidden bg-gray-900">
        <!-- Image preview -->
        <template v-if="asset.meta.type === 'image'">
          <div v-if="isLoading" class="text-gray-500">Loading...</div>
          <img
            v-else-if="previewUrl"
            :src="previewUrl"
            :alt="asset.name"
            class="max-w-full max-h-full object-contain"
          />
        </template>

        <!-- Video preview -->
        <template v-else-if="asset.meta.type === 'video'">
          <div class="text-gray-500 text-sm">Video preview not implemented</div>
        </template>

        <!-- Audio preview -->
        <template v-else-if="asset.meta.type === 'audio'">
          <div class="text-gray-500 text-sm">Audio preview not implemented</div>
        </template>

        <!-- Other types -->
        <template v-else>
          <div class="text-center text-gray-500">
            <div class="text-4xl mb-2">{{ asset.meta.type }}</div>
            <div class="text-sm">No preview available</div>
          </div>
        </template>
      </div>

      <!-- Info panel -->
      <div class="border-t border-gray-700 p-4 space-y-2">
        <h3 class="font-medium text-white truncate" :title="asset.name">{{ asset.name }}</h3>

        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span class="text-gray-500">Type</span>
          <span class="text-gray-300">{{ asset.meta.mimeType }}</span>

          <span class="text-gray-500">Size</span>
          <span class="text-gray-300">{{ formatSize(asset.meta.size) }}</span>

          <span class="text-gray-500">Created</span>
          <span class="text-gray-300">{{ formatDate(asset.meta.createdAt) }}</span>
        </div>

        <!-- Title & Description -->
        <div v-if="asset.meta.title || asset.meta.description" class="pt-2 border-t border-gray-700">
          <div v-if="asset.meta.title && asset.meta.title !== asset.name" class="text-sm">
            <span class="text-gray-500">Title: </span>
            <span class="text-gray-300">{{ asset.meta.title }}</span>
          </div>
          <div v-if="asset.meta.description" class="text-sm text-gray-400 mt-1">
            {{ asset.meta.description }}
          </div>
        </div>

        <!-- Tags -->
        <div v-if="asset.meta.tags.length > 0" class="flex flex-wrap gap-1 pt-2">
          <span
            v-for="tag in asset.meta.tags"
            :key="tag"
            class="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
