<script setup lang="ts">
import { computed } from 'vue'
import type { SemanticColorToken } from '../../modules/SiteSimulator/Domain/ValueObject'
import type { FontPreset } from '../../modules/Font/Domain/ValueObject'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import { roundedToCss, gapToMultiplier, paddingToMultiplier } from '../../modules/StylePack/Domain/ValueObject'

const props = defineProps<{
  getCssColor: (token: SemanticColorToken) => string
  font: FontPreset | undefined
  stylePack: StylePack
}>()

// Computed CSS values from StylePack
const borderRadius = computed(() => roundedToCss[props.stylePack.rounded])
const gapValue = computed(() => `${gapToMultiplier[props.stylePack.gap]}rem`)
const paddingValue = computed(() => `${paddingToMultiplier[props.stylePack.padding] * 1.5}rem`)

// Font family
const fontFamily = computed(() => props.font?.family ?? 'inherit')
</script>

<template>
  <div class="demo-preview" :style="{ fontFamily }">
    <div
      :style="{
        backgroundColor: getCssColor('surface.base'),
        borderRadius,
        padding: paddingValue,
      }"
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
        :style="{
          backgroundColor: getCssColor('surface.elevated'),
          margin: `0 -${paddingValue}`,
          padding: paddingValue,
          marginBottom: paddingValue,
        }"
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
        <div
          class="grid grid-cols-3 mt-4"
          :style="{ gap: gapValue }"
        >
          <div
            v-for="i in 3"
            :key="i"
            :style="{
              backgroundColor: getCssColor('surface.card'),
              borderColor: getCssColor('surface.border'),
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius,
              padding: paddingValue,
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

      <div class="flex" :style="{ gap: gapValue }">
        <button
          class="px-4 py-2 font-medium"
          :style="{
            backgroundColor: getCssColor('brand.primary'),
            color: getCssColor('text.onBrandPrimary'),
            borderRadius,
          }"
        >
          Primary Button
        </button>
        <button
          class="px-4 py-2 font-medium"
          :style="{
            backgroundColor: getCssColor('accent.base'),
            color: getCssColor('text.onAccent'),
            borderRadius,
          }"
        >
          Accent Button
        </button>
      </div>
    </div>
  </div>
</template>
