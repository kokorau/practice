<script setup lang="ts">
import { computed } from 'vue'
import type { SemanticColorToken, SectionContent } from '../../modules/SiteSimulator/Domain/ValueObject'
import type { FontPreset } from '../../modules/Font/Domain/ValueObject'
import type { StylePack } from '../../modules/StylePack/Domain/ValueObject'
import { roundedToCss } from '../../modules/StylePack/Domain/ValueObject'
import { TemplateRenderer } from '../../modules/SiteSimulator/Infra'

const props = defineProps<{
  sections: readonly SectionContent[]
  getCssColor: (token: SemanticColorToken) => string
  font: FontPreset | undefined
  stylePack: StylePack
}>()

const fontFamily = computed(() => props.font?.family ?? 'inherit')
const borderRadius = computed(() => roundedToCss[props.stylePack.rounded])

const renderedHtml = computed(() => {
  return props.sections
    .map(section =>
      TemplateRenderer.render(section, {
        getCssColor: props.getCssColor,
        stylePack: props.stylePack,
      })
    )
    .join('\n')
})
</script>

<template>
  <div class="demo-preview" :style="{ fontFamily }">
    <div
      :style="{
        backgroundColor: getCssColor('surface.base'),
        borderRadius,
        overflow: 'hidden',
      }"
      v-html="renderedHtml"
    />
  </div>
</template>
