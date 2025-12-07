<script setup lang="ts">
import type { SemanticColorToken } from '../../modules/SiteSimulator/Domain/ValueObject'

defineProps<{
  getCssColor: (token: SemanticColorToken) => string
  paletteGroups: Array<{
    name: string
    tokens: SemanticColorToken[]
  }>
}>()
</script>

<template>
  <div class="palette-preview">
    <div class="space-y-6">
      <div v-for="group in paletteGroups" :key="group.name">
        <h3 class="text-sm text-gray-400 mb-3">{{ group.name }}</h3>
        <div class="flex gap-3 flex-wrap">
          <div
            v-for="token in group.tokens"
            :key="token"
            class="flex flex-col items-center"
          >
            <div
              class="w-14 h-14 rounded border border-gray-600"
              :style="{ backgroundColor: getCssColor(token) }"
            />
            <span class="text-xs text-gray-500 mt-1">
              {{ token.split('.')[1] }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
