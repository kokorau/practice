import type {
  PreviewArtifact,
  OutputArtifactRepository,
  OutputArtifactListener,
} from '../Domain/OutputArtifactRepository'

/**
 * UseCase for rendering and managing PreviewArtifact.
 *
 * Provides interface to save rendered artifacts and subscribe to changes.
 * The repository handles storage and change detection (html/css/both).
 */
export type RenderArtifactUseCase = {
  /**
   * Get the current artifact from repository.
   */
  get(): PreviewArtifact | null

  /**
   * Save a new artifact. Repository will detect change type and notify subscribers.
   */
  save(artifact: PreviewArtifact): void

  /**
   * Clear the stored artifact.
   */
  clear(): void

  /**
   * Subscribe to artifact changes.
   * @returns unsubscribe function
   */
  subscribe(listener: OutputArtifactListener): () => void
}

export const createRenderArtifactUseCase = (
  repository: OutputArtifactRepository
): RenderArtifactUseCase => ({
  get: () => repository.get(),
  save: (artifact: PreviewArtifact) => repository.save(artifact),
  clear: () => repository.clear(),
  subscribe: (listener: OutputArtifactListener) => repository.subscribe(listener),
})
