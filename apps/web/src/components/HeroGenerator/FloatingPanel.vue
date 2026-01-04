<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    isOpen: boolean
    position?: 'left' | 'right'
    ignoreRefs?: (HTMLElement | null | undefined)[]
  }>(),
  {
    position: 'right',
    ignoreRefs: () => [],
  }
)

const emit = defineEmits<{
  close: []
}>()

const computedTransitionName = computed(() => {
  return props.position === 'left' ? 'popup' : 'subpanel-right'
})

const positionClass = computed(() => `position-${props.position}`)

const handleClickOutside = () => {
  emit('close')
}

const clickOutsideOptions = computed(() => ({
  handler: handleClickOutside,
  ignore: props.ignoreRefs,
}))
</script>

<template>
  <Transition :name="computedTransitionName">
    <aside
      v-if="isOpen"
      v-click-outside="clickOutsideOptions"
      class="floating-panel"
      :class="positionClass"
    >
      <div class="floating-panel-header">
        <h2>{{ title }}</h2>
        <button class="floating-panel-close" @click="emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="floating-panel-content">
        <slot />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.floating-panel {
  position: absolute;
  width: 18rem;
  z-index: 40;
  display: flex;
  flex-direction: column;
  background: oklch(0.96 0.01 260);
}

:global(.dark) .floating-panel {
  background: oklch(0.10 0.02 260);
}

/* Left position (from left sidebar) - popup style */
.floating-panel.position-left {
  left: 100%;
  top: 0;
  border-right: 1px solid oklch(0.88 0.01 260);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  max-height: 100vh;
}

:global(.dark) .floating-panel.position-left {
  border-right-color: oklch(0.25 0.02 260);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
}

/* Right position (from right panel) - full height */
.floating-panel.position-right {
  top: 0;
  bottom: 0;
  right: 16rem;
  border-right: 1px solid oklch(0.88 0.01 260);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

:global(.dark) .floating-panel.position-right {
  border-right-color: oklch(0.20 0.02 260);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
}

/* Header */
.floating-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

:global(.dark) .floating-panel-header {
  border-bottom-color: oklch(0.20 0.02 260);
}

.floating-panel-header h2 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .floating-panel-header h2 {
  color: oklch(0.70 0.02 260);
}

.floating-panel-close {
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-panel-close .material-icons {
  font-size: 1.125rem;
}

:global(.dark) .floating-panel-close {
  color: oklch(0.60 0.02 260);
}

.floating-panel-close:hover {
  color: oklch(0.25 0.02 260);
}

:global(.dark) .floating-panel-close:hover {
  color: oklch(0.90 0.02 260);
}

/* Content */
.floating-panel-content {
  flex: 1;
  overflow-y: auto;
}

/* Left position uses padding in content */
.floating-panel.position-left .floating-panel-content {
  padding: 1rem;
}

/* Right position uses smaller padding */
.floating-panel.position-right .floating-panel-content {
  padding: 0.5rem;
}

/* Transitions - defined globally in HeroViewGeneratorView.css */
</style>
