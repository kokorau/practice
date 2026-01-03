<script setup lang="ts">
/**
 * HeroCanvasSection - Renders a hero section using WebGPU canvas
 *
 * This component takes a HeroViewConfig and renders it using the
 * HeroScene WebGPU renderer instead of HTML templates.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'
import type { HeroViewConfig } from '../../modules/HeroScene/Domain/HeroViewConfig'
import { useHeroScene } from '../../composables/SiteBuilder'
import HeroPreview from '../HeroGenerator/HeroPreview.vue'

const props = defineProps<{
  config: HeroViewConfig
  primitivePalette: PrimitivePalette
  isDark?: boolean
}>()

// Wrap props as computed/ref for useHeroScene
const primitivePaletteRef = computed(() => props.primitivePalette)
const isDarkRef = computed(() => props.isDark ?? false)

const heroPreviewRef = ref<InstanceType<typeof HeroPreview> | null>(null)

const {
  initPreview,
  fromHeroViewConfig,
  foregroundConfig,
  foregroundTitleColor,
  foregroundBodyColor,
  destroyPreview,
} = useHeroScene({
  primitivePalette: primitivePaletteRef,
  isDark: isDarkRef,
})

onMounted(async () => {
  // Initialize WebGPU on the canvas
  await initPreview(heroPreviewRef.value?.canvasRef)

  // Apply the HeroViewConfig
  await fromHeroViewConfig(props.config)
})

onUnmounted(() => {
  destroyPreview()
})
</script>

<template>
  <section class="hero-canvas-section context-canvas">
    <HeroPreview
      ref="heroPreviewRef"
      :foreground-config="foregroundConfig"
      :title-color="foregroundTitleColor"
      :body-color="foregroundBodyColor"
    />
  </section>
</template>

<style scoped>
.hero-canvas-section {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--site-radius-lg, 12px);
}
</style>
