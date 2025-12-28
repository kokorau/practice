<script setup lang="ts">
import { computed } from 'vue'
import Prism from 'prismjs'
// CSS言語を追加（markupはコアに含まれている）
import 'prismjs/components/prism-css'
// ダークテーマ
import 'prismjs/themes/prism-tomorrow.css'

const props = defineProps<{
  code: string
  language: 'html' | 'css'
}>()

const highlightedCode = computed(() => {
  // Prismでは'html'は'markup'として扱う
  const lang = props.language === 'html' ? 'markup' : props.language
  const grammar = Prism.languages[lang]
  if (!grammar) return props.code
  return Prism.highlight(props.code, grammar, lang)
})
</script>

<template>
  <pre class="code-highlight"><code v-html="highlightedCode" /></pre>
</template>

<style scoped>
.code-highlight {
  margin: 0;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #1d1f21;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-highlight code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
}
</style>
