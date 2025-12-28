import type { SiteBlueprint } from './ValueObject/SiteBlueprint'

export type BlueprintListener = (blueprint: SiteBlueprint) => void

/**
 * Repository interface for Blueprint persistence.
 *
 * Supports subscription for reactive updates across multiple consumers.
 * Future implementations could use localStorage, IndexedDB, WebSocket, etc.
 */
export type BlueprintRepository = {
  get(): SiteBlueprint | null
  save(blueprint: SiteBlueprint): void
  clear(): void
  /**
   * Subscribe to blueprint changes.
   * @returns unsubscribe function
   */
  subscribe(listener: BlueprintListener): () => void
}
