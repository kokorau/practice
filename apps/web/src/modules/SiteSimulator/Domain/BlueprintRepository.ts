import type { SiteBlueprint } from './ValueObject/SiteBlueprint'

/**
 * Repository interface for Blueprint persistence.
 *
 * InMemory implementation stores a single blueprint.
 * Future implementations could use localStorage, IndexedDB, or remote storage.
 */
export type BlueprintRepository = {
  get(): SiteBlueprint | null
  save(blueprint: SiteBlueprint): void
  clear(): void
}
