<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  data: unknown
  name?: string
  depth?: number
  initialExpanded?: boolean
}>(), {
  name: 'root',
  depth: 0,
  initialExpanded: true,
})

const isExpanded = ref(props.initialExpanded)

const dataType = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

const isExpandable = computed(() => {
  return dataType.value === 'object' || dataType.value === 'array'
})

const entries = computed(() => {
  if (dataType.value === 'array') {
    return (props.data as unknown[]).map((value, index) => ({
      key: String(index),
      value,
    }))
  }
  if (dataType.value === 'object' && props.data !== null) {
    return Object.entries(props.data as Record<string, unknown>).map(([key, value]) => ({
      key,
      value,
    }))
  }
  return []
})

const previewText = computed(() => {
  if (dataType.value === 'array') {
    const arr = props.data as unknown[]
    return `Array(${arr.length})`
  }
  if (dataType.value === 'object') {
    const keys = Object.keys(props.data as Record<string, unknown>)
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`
  }
  return ''
})

const formattedValue = computed(() => {
  if (dataType.value === 'string') return `"${props.data}"`
  if (dataType.value === 'null') return 'null'
  if (dataType.value === 'undefined') return 'undefined'
  return String(props.data)
})

const toggle = () => {
  if (isExpandable.value) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <div class="json-tree" :style="{ '--depth': depth }">
    <div
      class="json-tree-row"
      :class="{ expandable: isExpandable }"
      @click="toggle"
    >
      <!-- Expand/Collapse Icon -->
      <span v-if="isExpandable" class="json-tree-toggle">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="json-tree-toggle-placeholder" />

      <!-- Key -->
      <span v-if="name !== 'root'" class="json-tree-key">{{ name }}</span>
      <span v-if="name !== 'root'" class="json-tree-colon">:</span>

      <!-- Value (primitive or preview) -->
      <template v-if="!isExpandable">
        <span class="json-tree-value" :class="dataType">{{ formattedValue }}</span>
      </template>
      <template v-else-if="!isExpanded">
        <span class="json-tree-preview">{{ previewText }}</span>
      </template>
      <template v-else>
        <span class="json-tree-bracket">{{ dataType === 'array' ? '[' : '{' }}</span>
      </template>
    </div>

    <!-- Children (recursive) -->
    <template v-if="isExpandable && isExpanded">
      <div class="json-tree-children">
        <JsonTreeViewer
          v-for="entry in entries"
          :key="entry.key"
          :name="entry.key"
          :data="entry.value"
          :depth="depth + 1"
        />
      </div>
      <div class="json-tree-row json-tree-close">
        <span class="json-tree-toggle-placeholder" />
        <span class="json-tree-bracket">{{ dataType === 'array' ? ']' : '}' }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.json-tree {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 0.75rem;
  line-height: 1.6;
}

.json-tree-row {
  display: flex;
  align-items: flex-start;
  padding: 0.125rem 0;
  padding-left: calc(var(--depth) * 1rem);
  cursor: default;
}

.json-tree-row.expandable {
  cursor: pointer;
}

.json-tree-row.expandable:hover {
  background: oklch(0.22 0.02 260);
  border-radius: 0.25rem;
}

.json-tree-toggle {
  flex-shrink: 0;
  width: 1rem;
  font-size: 0.5rem;
  color: oklch(0.55 0.02 260);
  display: flex;
  align-items: center;
  justify-content: center;
}

.json-tree-toggle-placeholder {
  flex-shrink: 0;
  width: 1rem;
}

.json-tree-key {
  color: oklch(0.75 0.15 200);
  margin-right: 0;
}

.json-tree-colon {
  color: oklch(0.60 0.02 260);
  margin-right: 0.5rem;
}

.json-tree-value {
  word-break: break-all;
}

.json-tree-value.string {
  color: oklch(0.75 0.12 140);
}

.json-tree-value.number {
  color: oklch(0.75 0.15 50);
}

.json-tree-value.boolean {
  color: oklch(0.75 0.15 320);
}

.json-tree-value.null,
.json-tree-value.undefined {
  color: oklch(0.60 0.10 260);
  font-style: italic;
}

.json-tree-preview {
  color: oklch(0.55 0.02 260);
  font-style: italic;
}

.json-tree-bracket {
  color: oklch(0.60 0.02 260);
}

.json-tree-children {
  /* Children are indented via --depth CSS variable */
}

.json-tree-close {
  padding-left: calc(var(--depth) * 1rem);
}
</style>
