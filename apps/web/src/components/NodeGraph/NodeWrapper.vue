<script setup lang="ts">
import { computed } from 'vue'
import { type NodeSize, NODE_SIZES } from './types'

const props = withDefaults(
  defineProps<{
    label?: string
    title?: string
    size?: NodeSize | 'auto'
  }>(),
  {
    size: 'auto',
  }
)

const sizeStyle = computed(() => {
  if (props.size === 'auto') {
    return {}
  }
  const { width, height } = NODE_SIZES[props.size]
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
})
</script>

<template>
  <div class="node-wrapper">
    <div v-if="label || title" class="node-title">
      <span v-if="label" class="node-badge">{{ label }}</span>
      <span v-if="title" class="node-title-text">{{ title }}</span>
      <span v-if="label" class="node-badge-offset" />
    </div>
    <div class="node-preview" :style="sizeStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  position: relative;
  z-index: 1;
}

.node-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 0.5rem;
}

.node-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: #4ecdc4;
  color: #1a1a2e;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.node-title-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.node-badge-offset {
  width: 1.25rem;
  flex-shrink: 0;
}

.node-preview {
  position: relative;
  background: #1e1e3a;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
  overflow: hidden;
}

</style>
