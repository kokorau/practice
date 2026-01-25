/**
 * DSL Reference Extraction Utilities
 *
 * Extract @ references from DSL expressions and AST nodes.
 */

import type { AstNode } from './ast'
import { parse } from './parser'

/**
 * Represents a reference extracted from a DSL expression.
 *
 * DSL supports two reference formats:
 * - Short form: @t, @x → namespace: null, path: "t" or "x"
 * - Namespaced form: @timeline:track-a → namespace: "timeline", path: "track-a"
 */
export interface DslReference {
  /** Full reference key (e.g., "timeline:track-a" or "t") */
  key: string
  /** Namespace prefix, or null for short form references */
  namespace: string | null
  /** Path after the namespace (or the full identifier for short form) */
  path: string
}

/**
 * Extract all @ references from an AST node.
 *
 * Traverses the AST recursively and collects all ReferenceNode instances.
 *
 * @param ast - The AST node to analyze
 * @returns Array of DslReference objects found in the AST
 *
 * @example
 * const ast = parse('range(@timeline:track-a, 0, 100)')
 * extractReferences(ast)
 * // → [{ key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' }]
 *
 * @example
 * const ast = parse('add(@t, @x)')
 * extractReferences(ast)
 * // → [
 * //     { key: 't', namespace: null, path: 't' },
 * //     { key: 'x', namespace: null, path: 'x' }
 * //   ]
 */
export function extractReferences(ast: AstNode): DslReference[] {
  const references: DslReference[] = []

  function traverse(node: AstNode): void {
    switch (node.type) {
      case 'reference':
        references.push({
          key: node.namespace ? `${node.namespace}:${node.path}` : node.path,
          namespace: node.namespace,
          path: node.path,
        })
        break

      case 'call':
        for (const arg of node.args) {
          traverse(arg)
        }
        break

      case 'binary':
        traverse(node.left)
        traverse(node.right)
        break

      case 'unary':
        traverse(node.operand)
        break

      case 'number':
      case 'identifier':
        // No references in these nodes
        break
    }
  }

  traverse(ast)
  return references
}

/**
 * Extract all @ references from a DSL expression string.
 *
 * Convenience function that parses the expression and extracts references.
 *
 * @param expr - The DSL expression string to analyze
 * @returns Array of DslReference objects found in the expression
 *
 * @example
 * extractReferencesFromExpression('range(@timeline:track-mask, 0.1, 0.9)')
 * // → [{ key: 'timeline:track-mask', namespace: 'timeline', path: 'track-mask' }]
 *
 * @example
 * extractReferencesFromExpression('mul(@timeline:a, @timeline:b)')
 * // → [
 * //     { key: 'timeline:a', namespace: 'timeline', path: 'a' },
 * //     { key: 'timeline:b', namespace: 'timeline', path: 'b' }
 * //   ]
 */
export function extractReferencesFromExpression(expr: string): DslReference[] {
  const ast = parse(expr)
  return extractReferences(ast)
}

/**
 * Extract unique track IDs from references with the 'timeline' namespace.
 *
 * Filters references to only those with namespace 'timeline' and returns
 * their path values (track IDs) as a unique array.
 *
 * @param references - Array of DslReference objects
 * @returns Array of unique track IDs
 *
 * @example
 * const refs = [
 *   { key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' },
 *   { key: 't', namespace: null, path: 't' },
 *   { key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' },
 * ]
 * extractTimelineTrackIds(refs) // → ['track-a']
 */
export function extractTimelineTrackIds(references: DslReference[]): string[] {
  const trackIds = new Set<string>()
  for (const ref of references) {
    if (ref.namespace === 'timeline') {
      trackIds.add(ref.path)
    }
  }
  return Array.from(trackIds)
}

/**
 * Extract timeline track IDs directly from a DSL expression string.
 *
 * Convenience function combining parse + extract + filter operations.
 *
 * @param expr - The DSL expression string to analyze
 * @returns Array of unique track IDs referenced in the expression
 *
 * @example
 * extractTimelineTrackIdsFromExpression('range(@timeline:opacity, 0, 1)')
 * // → ['opacity']
 */
export function extractTimelineTrackIdsFromExpression(expr: string): string[] {
  const references = extractReferencesFromExpression(expr)
  return extractTimelineTrackIds(references)
}
