<script setup lang="ts">
/**
 * HeroCanvasSection - Renders a hero section using WebGPU canvas
 *
 * This component takes a HeroViewConfig and renders it using the
 * HeroScene WebGPU renderer instead of HTML templates.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { HeroViewConfig } from '@practice/section-visual'
import { useHeroScene } from '../../composables/SiteBuilder'
import { provideLayerSelection } from '../../composables/useLayerSelection'
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

// Provide layer selection context (required by useHeroScene)
const layerSelection = provideLayerSelection()

const heroScene = useHeroScene({
  primitivePalette: primitivePaletteRef,
  isDark: isDarkRef,
  layerSelection,
})

onMounted(async () => {
  // Initialize WebGPU on the canvas
  await heroScene.renderer.initPreview(heroPreviewRef.value?.canvasRef)

  // Apply the HeroViewConfig
  await heroScene.serialization.fromHeroViewConfig(props.config)
})

onUnmounted(() => {
  heroScene.renderer.destroyPreview()
})
</script>

<template>
  <section class="hero-canvas-section context-canvas">
    <HeroPreview
      ref="heroPreviewRef"
      :foreground-config="heroScene.foreground.foregroundConfig.value"
      :title-color="heroScene.foreground.foregroundTitleColor.value"
      :body-color="heroScene.foreground.foregroundBodyColor.value"
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
