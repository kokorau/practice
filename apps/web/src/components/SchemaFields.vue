<script setup lang="ts">
/**
 * SchemaFields
 *
 * Renders form fields automatically from a schema definition.
 * Supports number (slider) and boolean (checkbox) fields.
 */
import { computed } from 'vue'
import { getFields, type ObjectSchema, type FieldMeta } from '@practice/schema'
import RangeInput from './RangeInput.vue'

const props = defineProps<{
  schema: ObjectSchema
  modelValue: Record<string, unknown>
  /** Fields to exclude from rendering (e.g., 'enabled') */
  exclude?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const fields = computed<FieldMeta[]>(() => {
  const all = getFields(props.schema)
  if (!props.exclude?.length) return all
  return all.filter(f => !props.exclude!.includes(f.key))
})

const updateField = (key: string, value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="schema-fields">
    <template v-for="field in fields" :key="field.key">
      <!-- Number field: slider -->
      <RangeInput
        v-if="field.schema.type === 'number'"
        :label="field.schema.label"
        :min="field.schema.min"
        :max="field.schema.max"
        :step="field.schema.step"
        :model-value="(modelValue[field.key] as number) ?? field.schema.default"
        @update:model-value="updateField(field.key, $event)"
        label-class="text-gray-400"
        input-class="bg-gray-700"
      />

      <!-- Boolean field: checkbox -->
      <label v-else-if="field.schema.type === 'boolean'" class="schema-checkbox">
        <input
          type="checkbox"
          :checked="(modelValue[field.key] as boolean) ?? field.schema.default"
          @change="updateField(field.key, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ field.schema.label }}</span>
      </label>
    </template>
  </div>
</template>

<style scoped>
.schema-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schema-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.70 0.02 260);
  cursor: pointer;
}

.schema-checkbox input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: oklch(0.55 0.20 250);
}
</style>
