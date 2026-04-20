'use client';

import { Application, Container } from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

// Register PIXI globally for pixi-live2d-display
if (typeof window !== 'undefined') {
  (window as any).PIXI = { Application, Container };
}

export interface Live2DEngineConfig {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
  backgroundColor?: number;
}

export class Live2DEngine {
  private app: Application | null = null;
  private baseModel: Live2DModel | null = null;
  private outfitModels: Map<string, Live2DModel> = new Map();
  private container: Container | null = null;
  private _isInitialized = false;

  // Callbacks
  public onModelLoaded?: (model: Live2DModel, type: 'base' | 'outfit') => void;
  public onError?: (error: Error) => void;

  get isInitialized() { return this._isInitialized; }
  get currentBaseModel() { return this.baseModel; }
  get currentOutfits() { return this.outfitModels; }
  get pixiApp() { return this.app; }

  async initialize(config: Live2DEngineConfig): Promise<void> {
    try {
      // Load CubismCore if not already loaded
      await this.loadCubismCore();

      this.app = new Application({
        view: config.canvas,
        width: config.width || 800,
        height: config.height || 800,
        backgroundColor: config.backgroundColor || 0x00000000,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      this.container = new Container();
      this.app.stage.addChild(this.container);

      this._isInitialized = true;
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  private async loadCubismCore(): Promise<void> {
    if ((window as any).Live2DCubismCore) return;

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="live2dcubismcore"]');
      if (existingScript) {
        const checkInterval = setInterval(() => {
          if ((window as any).Live2DCubismCore) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('CubismCore load timeout'));
        }, 10000);
        return;
      }

      const script = document.createElement('script');
      script.src = '/live2d/cubism4/live2dcubismcore.min.js';
      script.onload = () => {
        const checkInterval = setInterval(() => {
          if ((window as any).Live2DCubismCore) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('CubismCore initialization timeout'));
        }, 10000);
      };
      script.onerror = () => reject(new Error('Failed to load CubismCore script'));
      document.head.appendChild(script);
    });
  }

  async loadBaseModel(modelUrl: string): Promise<Live2DModel> {
    if (!this.app || !this.container) throw new Error('Engine not initialized');

    // Remove existing base model
    if (this.baseModel) {
      this.container.removeChild(this.baseModel as any);
      this.baseModel.destroy();
    }

    const model = await Live2DModel.from(modelUrl, { autoInteract: false });

    // Scale and position model at center
    const scale = Math.min(
      (this.app.screen.width * 0.8) / model.width,
      (this.app.screen.height * 0.9) / model.height
    );
    model.scale.set(scale);
    model.x = (this.app.screen.width - model.width) / 2;
    model.y = (this.app.screen.height - model.height) / 2;

    this.container.addChildAt(model as any, 0);
    this.baseModel = model;
    this.onModelLoaded?.(model, 'base');

    return model;
  }

  async loadOutfit(outfitId: string, modelUrl: string, zIndex: number = 1): Promise<Live2DModel> {
    if (!this.app || !this.container) throw new Error('Engine not initialized');
    if (!this.baseModel) throw new Error('Base model must be loaded first');

    // Remove existing outfit with same ID
    if (this.outfitModels.has(outfitId)) {
      const existing = this.outfitModels.get(outfitId)!;
      this.container.removeChild(existing as any);
      existing.destroy();
      this.outfitModels.delete(outfitId);
    }

    const model = await Live2DModel.from(modelUrl, { autoInteract: false });

    // Match base model transform
    const baseScale = this.baseModel.scale.x;
    model.scale.set(baseScale);
    model.x = this.baseModel.x;
    model.y = this.baseModel.y;

    // Add at proper z-index (after base model)
    const insertIndex = Math.min(zIndex + 1, this.container.children.length);
    this.container.addChildAt(model as any, insertIndex);
    this.outfitModels.set(outfitId, model);
    this.onModelLoaded?.(model, 'outfit');

    return model;
  }

  removeOutfit(outfitId: string): boolean {
    const model = this.outfitModels.get(outfitId);
    if (!model) return false;

    this.container?.removeChild(model as any);
    model.destroy();
    this.outfitModels.delete(outfitId);
    return true;
  }

  destroy(): void {
    this.outfitModels.forEach(model => model.destroy());
    this.outfitModels.clear();
    if (this.baseModel) {
      this.baseModel.destroy();
      this.baseModel = null;
    }
    this.app?.destroy(true);
    this.app = null;
    this._isInitialized = false;
  }
}
