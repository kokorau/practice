import type { SiteBlueprint, BlueprintRepository } from '../Domain'

/**
 * UseCase for updating the SiteBlueprint.
 *
 * Provides a simple interface to update and persist the blueprint.
 * The repository handles the actual storage (InMemory, localStorage, etc.).
 */
export type UpdateBlueprintUseCase = {
  /**
   * Get the current blueprint from repository.
   */
  get(): SiteBlueprint | null

  /**
   * Update the blueprint in repository.
   */
  update(blueprint: SiteBlueprint): void

  /**
   * Clear the stored blueprint.
   */
  clear(): void
}

export const createUpdateBlueprintUseCase = (
  repository: BlueprintRepository
): UpdateBlueprintUseCase => ({
  get: () => repository.get(),
  update: (blueprint: SiteBlueprint) => repository.save(blueprint),
  clear: () => repository.clear(),
})
