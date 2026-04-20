'use client';

/**
 * 貫通防止 (Occlusion Logic)
 * 
 * When an outfit is applied, certain parts of the base body should be hidden
 * to prevent the skin from "piercing through" the clothing during deep bends
 * (e.g., elbows, knees). This is achieved by setting the opacity of specified
 * parts to 0, eliminating the "CG feel" and enhancing the sense of reality.
 */
export class OcclusionManager {
  private hiddenParts: Map<string, Set<string>> = new Map(); // modelId -> Set of part IDs

  /**
   * Apply occlusion to a model by hiding specified parts
   */
  applyOcclusion(model: any, modelId: string, hideParts: string[]): void {
    // Restore previously hidden parts first
    this.restoreModel(model, modelId);

    // Record and apply new hidden parts
    const hiddenSet = new Set(hideParts);
    this.hiddenParts.set(modelId, hiddenSet);

    try {
      const internalModel = model.internalModel;
      if (!internalModel) return;

      const coreModel = internalModel.coreModel;
      if (!coreModel) return;

      const parts = coreModel._model?.parts;
      if (!parts) return;

      for (let i = 0; i < parts.count; i++) {
        const partId = parts.ids[i];
        if (hideParts.includes(partId)) {
          parts.opacities[i] = 0;
        }
      }
    } catch (e) {
      console.warn('OcclusionManager: Failed to apply occlusion', e);
    }
  }

  /**
   * Restore all hidden parts on a model to full opacity
   */
  restoreModel(model: any, modelId: string): void {
    try {
      const internalModel = model.internalModel;
      if (!internalModel) return;

      const coreModel = internalModel.coreModel;
      if (!coreModel) return;

      const parts = coreModel._model?.parts;
      if (!parts) return;

      // Restore all opacities to 1
      for (let i = 0; i < parts.count; i++) {
        parts.opacities[i] = 1;
      }
    } catch (e) {
      // Non-fatal
    }

    this.hiddenParts.delete(modelId);
  }

  /**
   * Get the set of currently hidden parts for a model
   */
  getHiddenParts(modelId: string): Set<string> | undefined {
    return this.hiddenParts.get(modelId);
  }

  /**
   * Clear all occlusion records
   */
  clearAll(): void {
    this.hiddenParts.clear();
  }
}
