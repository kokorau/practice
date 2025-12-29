<script setup lang="ts">
import { ref } from 'vue'
import type { LayoutId } from '../SiteBuilder/layoutPatterns'

defineProps<{
  selectedLayout: LayoutId
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

defineExpose({
  canvasRef,
})
</script>

<template>
  <div class="hero-preview-container">
    <div class="hero-preview-wrapper">
      <div class="hero-preview-frame hero-palette-preview context-canvas">
        <!-- 後景: テクスチャ -->
        <canvas ref="canvasRef" class="layer-background" />

        <!-- 中景: グラフィック（後で実装） -->
        <div class="layer-midground">
          <!-- 画像やグラフィックテキスト -->
        </div>

        <!-- 前景: CTA + テキスト -->
        <div class="layer-foreground">
          <div class="hero-content" :class="`layout-${selectedLayout}`">
            <h1 class="hero-title scp-title">Build Amazing</h1>
            <p class="hero-subtitle scp-body">Create beautiful, responsive websites.<br>Design with confidence.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.hero-preview-wrapper {
  width: 100%;
  max-width: 1200px;
}

.hero-preview-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid oklch(0.25 0.02 260);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* context-canvasのbackground-colorを上書きしてテクスチャを見せる */
.hero-preview-frame.context-canvas {
  background-color: transparent;
}

/* Layer System */
.layer-background,
.layer-midground,
.layer-foreground {
  position: absolute;
  inset: 0;
}

.layer-background {
  z-index: 0;
  width: 100%;
  height: 100%;
}

.layer-midground {
  z-index: 1;
  pointer-events: none;
}

.layer-foreground {
  z-index: 2;
  display: flex;
  padding: 4rem;
}

/* Hero Content */
.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.hero-title {
  margin: 0;
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.1;
}

.hero-subtitle {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.5;
}
</style>
