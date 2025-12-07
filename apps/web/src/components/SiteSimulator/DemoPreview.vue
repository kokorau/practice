<script setup lang="ts">
import type { SemanticColorToken } from '../../modules/SiteSimulator/Domain/ValueObject'

defineProps<{
  getCssColor: (token: SemanticColorToken) => string
}>()
</script>

<template>
  <div class="demo-preview">
    <div
      class="rounded-lg p-6"
      :style="{ backgroundColor: getCssColor('surface.base') }"
    >
      <h3
        class="text-xl font-semibold mb-2"
        :style="{ color: getCssColor('text.primary') }"
      >
        Page Title
      </h3>
      <p class="mb-6" :style="{ color: getCssColor('text.secondary') }">
        This is a description on the base surface.
      </p>

      <!-- surface.elevated -->
      <div
        class="-mx-6 px-6 py-5 mb-6"
        :style="{ backgroundColor: getCssColor('surface.elevated') }"
      >
        <h4
          class="text-lg font-semibold mb-2"
          :style="{ color: getCssColor('text.primary') }"
        >
          Section Title
        </h4>
        <p :style="{ color: getCssColor('text.secondary') }">
          This is a section using the elevated surface.
        </p>

        <!-- surface.card (3 columns) -->
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div
            v-for="i in 3"
            :key="i"
            class="rounded-lg p-4"
            :style="{
              backgroundColor: getCssColor('surface.card'),
              borderColor: getCssColor('surface.border'),
              borderWidth: '1px',
              borderStyle: 'solid',
            }"
          >
            <h5
              class="font-semibold mb-1"
              :style="{ color: getCssColor('text.primary') }"
            >
              Card {{ i }}
            </h5>
            <p class="text-sm" :style="{ color: getCssColor('text.secondary') }">
              Card description text.
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          class="px-4 py-2 rounded font-medium"
          :style="{
            backgroundColor: getCssColor('brand.primary'),
            color: getCssColor('text.onBrandPrimary'),
          }"
        >
          Primary Button
        </button>
        <button
          class="px-4 py-2 rounded font-medium"
          :style="{
            backgroundColor: getCssColor('accent.base'),
            color: getCssColor('text.onAccent'),
          }"
        >
          Accent Button
        </button>
      </div>
    </div>
  </div>
</template>
