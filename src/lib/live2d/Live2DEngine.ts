'use client';

// Lazy imports to avoid SSR "window is not defined" errors
// pixi.js and pixi-live2d-display require browser globals at module load time
let PIXI: any = null;
let Live2DModel: any = null;

async function ensurePixiLoaded(): Promise<void> {
  if (PIXI && Live2DModel) return;

  const pixiModule = await import('pixi.js');
  PIXI = pixiModule;

  // Register PIXI globally BEFORE importing pixi-live2d-display
  if (typeof window !== 'undefined') {
    (window as any).PIXI = {
      Application: pixiModule.Application,
      Container: pixiModule.Container,
    };
  }

  const live2dModule = await import('pixi-live2d-display');
  Live2DModel = live2dModule.Live2DModel;
}

export interface Live2DEngineConfig {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
  backgroundColor?: number;
}

export class Live2DEngine {
  private app: any = null;
  private baseModel: any = null;
  private outfitModels: Map<string, any> = new Map();
  private container: any = null;
  private _isInitialized = false;

  // Callbacks
  public onModelLoaded?: (model: any, type: 'base' | 'outfit') => void;
  public onError?: (error: Error) => void;

  get isInitialized() { return this._isInitialized; }
  get currentBaseModel() { return this.baseModel; }
  get currentOutfits() { return this.outfitModels; }
  get pixiApp() { return this.app; }

  async initialize(config: Live2DEngineConfig): Promise<void> {
    try {
      // Lazy-load pixi.js and pixi-live2d-display
      await ensurePixiLoaded();

      // Load CubismCore if not already loaded
      await this.loadCubismCore();

      this.app = new PIXI.Application({
        view: config.canvas,
        width: config.width || 800,
        height: config.height || 800,
        backgroundColor: config.backgroundColor || 0x00000000,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      this.container = new PIXI.Container();
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
        }, 15000);
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
        }, 15000);
      };
      script.onerror = () => reject(new Error('Failed to load CubismCore script'));
      document.head.appendChild(script);
    });
  }

  async loadBaseModel(modelUrl: string): Promise<any> {
    if (!this.app || !this.container) throw new Error('Engine not initialized');

    // Remove existing base model
    if (this.baseModel) {
      this.container.removeChild(this.baseModel);
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

    this.container.addChildAt(model, 0);
    this.baseModel = model;
    this.onModelLoaded?.(model, 'base');

    return model;
  }

  async loadOutfit(outfitId: string, modelUrl: string, zIndex: number = 1): Promise<any> {
    if (!this.app || !this.container) throw new Error('Engine not initialized');
    if (!this.baseModel) throw new Error('Base model must be loaded first');

    // Remove existing outfit with same ID
    if (this.outfitModels.has(outfitId)) {
      const existing = this.outfitModels.get(outfitId)!;
      this.container.removeChild(existing);
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
    this.container.addChildAt(model, insertIndex);
    this.outfitModels.set(outfitId, model);
    this.onModelLoaded?.(model, 'outfit');

    return model;
  }

  removeOutfit(outfitId: string): boolean {
    const model = this.outfitModels.get(outfitId);
    if (!model) return false;

    this.container?.removeChild(model);
    model.destroy();
    this.outfitModels.delete(outfitId);
    return true;
  }

  /**
   * Resize the renderer to fit the container
   */
  resize(width: number, height: number): void {
    if (!this.app) return;
    this.app.renderer.resize(width, height);

    // Re-center base model
    if (this.baseModel) {
      const scale = Math.min(
        (width * 0.8) / this.baseModel.width * this.baseModel.scale.x,
        (height * 0.9) / this.baseModel.height * this.baseModel.scale.y
      );
      // Don't rescale - just reposition
      this.baseModel.x = (width - this.baseModel.width * this.baseModel.scale.x) / 2;
      this.baseModel.y = (height - this.baseModel.height * this.baseModel.scale.y) / 2;
    }

    // Re-center outfit models
    this.outfitModels.forEach((model) => {
      if (this.baseModel) {
        model.x = this.baseModel.x;
        model.y = this.baseModel.y;
      }
    });
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
