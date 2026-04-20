'use client';

import type { Live2DModel } from 'pixi-live2d-display';

export class OcclusionManager {
  private hiddenParts: Map<string, Set<string>> = new Map(); // modelId -> Set of part IDs

  applyOcclusion(model: Live2DModel, modelId: string, hideParts: string[]): void {
    // Restore previously hidden parts
    this.restoreModel(model, modelId);

    // Hide new parts
    const hiddenSet = new Set(hideParts);
    this.hiddenParts.set(modelId, hiddenSet);

    try {
      const internalModel = (model as any).internalModel;
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

  restoreModel(model: Live2DModel, modelId: string): void {
    try {
      const internalModel = (model as any).internalModel;
      if (!internalModel) return;

      const coreModel = internalModel.coreModel;
      if (!coreModel) return;

      const parts = coreModel._model?.parts;
      if (!parts) return;

      // Restore all opacities to 1
      for (let i = 0; i < parts.count; i++) {
        parts.opacities[i] = 1;
      }
    } catch {
      // Non-fatal
    }

    this.hiddenParts.delete(modelId);
  }

  clearAll(): void {
    this.hiddenParts.clear();
  }
}
