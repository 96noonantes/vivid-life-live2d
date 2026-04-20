'use client';

import type { Live2DEngine } from './Live2DEngine';

export interface VividnessState {
  // Breathing
  breathAngle: number;
  breathCycle: number;
  // Blinking
  blinkTimer: number;
  blinkInterval: number;
  isBlinking: boolean;
  // Look-at
  lookAtX: number;
  lookAtY: number;
  targetLookAtX: number;
  targetLookAtY: number;
  // Emotion
  currentEmotion: string;
  emotionIntensity: number;
  // Micro-movement
  bodyAngleZ: number;
  microMovementTime: number;
}

/**
 * Emotion parameter mapping for Live2D Cubism models.
 * Each emotion maps to a set of parameter IDs and target values.
 * Values are multiplied by the emotion intensity before being applied.
 */
const EMOTION_PARAMETER_MAP: Record<string, Record<string, number>> = {
  joy: {
    ParamMouthOpenY: 0.4,
    ParamEyeLOpen: 1.2,
    ParamEyeROpen: 1.2,
    ParamBrowLY: 0.5,
    ParamBrowRY: 0.5,
    ParamMouthForm: 0.5,
  },
  sorrow: {
    ParamMouthOpenY: 0.1,
    ParamEyeLOpen: 0.4,
    ParamEyeROpen: 0.4,
    ParamBrowLY: -0.5,
    ParamBrowRY: -0.5,
    ParamMouthForm: -0.5,
  },
  anger: {
    ParamMouthOpenY: 0.3,
    ParamEyeLOpen: 0.8,
    ParamEyeROpen: 0.8,
    ParamBrowLY: -0.7,
    ParamBrowRY: -0.7,
    ParamMouthForm: -0.3,
  },
  relax: {
    ParamMouthOpenY: 0.1,
    ParamEyeLOpen: 0.6,
    ParamEyeROpen: 0.6,
    ParamBrowLY: 0.2,
    ParamBrowRY: 0.2,
    ParamMouthForm: 0.3,
  },
  surprise: {
    ParamMouthOpenY: 0.8,
    ParamEyeLOpen: 1.5,
    ParamEyeROpen: 1.5,
    ParamBrowLY: 0.8,
    ParamBrowRY: 0.8,
    ParamMouthForm: 0.0,
  },
  neutral: {},
};

export class VividnessSyncManager {
  private engine: Live2DEngine;
  private state: VividnessState;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private _isActive = false;

  // Callback for external state monitoring
  public onStateUpdate?: (state: VividnessState) => void;

  constructor(engine: Live2DEngine) {
    this.engine = engine;
    this.state = {
      breathAngle: 0,
      breathCycle: 4.0, // 4 second breathing cycle
      blinkTimer: 0,
      blinkInterval: 3.0 + Math.random() * 2.0, // Random blink interval 3-5s
      isBlinking: false,
      lookAtX: 0,
      lookAtY: 0,
      targetLookAtX: 0,
      targetLookAtY: 0,
      currentEmotion: 'neutral',
      emotionIntensity: 0,
      bodyAngleZ: 0,
      microMovementTime: 0,
    };
  }

  get isActive() { return this._isActive; }
  get vividnessState() { return { ...this.state }; }

  start(): void {
    if (this._isActive) return;
    this._isActive = true;
    this.lastTime = performance.now();
    this.update();
  }

  stop(): void {
    this._isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  setLookAtTarget(x: number, y: number): void {
    // x, y are normalized -1 to 1
    this.state.targetLookAtX = Math.max(-1, Math.min(1, x));
    this.state.targetLookAtY = Math.max(-1, Math.min(1, y));
  }

  setEmotion(emotion: string, intensity: number = 1.0): void {
    this.state.currentEmotion = emotion;
    this.state.emotionIntensity = Math.max(0, Math.min(1, intensity));
  }

  private update = (): void => {
    if (!this._isActive) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta to avoid large jumps
    this.lastTime = now;

    this.updateInvoluntaryMovement(deltaTime);
    this.updateLookAt(deltaTime);
    this.updateBlinking(deltaTime);
    this.applyToModels();

    // Notify external listeners
    this.onStateUpdate?.(this.vividnessState);

    this.animationFrameId = requestAnimationFrame(this.update);
  };

  /**
   * 不随意運動: Breathing and micro body sway
   */
  private updateInvoluntaryMovement(dt: number): void {
    // Breathing cycle
    this.state.breathAngle += (2 * Math.PI / this.state.breathCycle) * dt;

    // Micro body sway - sinusoidal with slight randomization
    this.state.microMovementTime += dt;
    this.state.bodyAngleZ = Math.sin(this.state.microMovementTime * 0.5) * 1.5; // ±1.5 degrees
  }

  /**
   * 視線追従: Smooth interpolation for look-at
   */
  private updateLookAt(dt: number): void {
    // Exponential smoothing for natural feel
    const lerpFactor = 1 - Math.pow(0.001, dt);
    this.state.lookAtX += (this.state.targetLookAtX - this.state.lookAtX) * lerpFactor;
    this.state.lookAtY += (this.state.targetLookAtY - this.state.lookAtY) * lerpFactor;
  }

  /**
   * 瞬き: Random blinking with natural timing
   */
  private updateBlinking(dt: number): void {
    this.state.blinkTimer += dt;

    if (!this.state.isBlinking && this.state.blinkTimer >= this.state.blinkInterval) {
      this.state.isBlinking = true;
      this.state.blinkTimer = 0;
    }

    if (this.state.isBlinking && this.state.blinkTimer >= 0.15) { // Blink duration 150ms
      this.state.isBlinking = false;
      this.state.blinkTimer = 0;
      this.state.blinkInterval = 2.5 + Math.random() * 3.0; // Next blink in 2.5-5.5s
    }
  }

  /**
   * Apply all vividness parameters to base model and broadcast to outfits
   */
  private applyToModels(): void {
    const baseModel = this.engine.currentBaseModel;
    if (!baseModel) return;

    // Apply to base model first
    this.applyVividnessToModel(baseModel);

    // BROADCAST: Sync all parameters to outfit models
    this.engine.currentOutfits.forEach((outfitModel: any) => {
      this.syncParametersToOutfit(baseModel, outfitModel);
      this.applyVividnessToModel(outfitModel);
    });
  }

  /**
   * Apply vividness (breathing, look-at, blinking, emotion) to a model
   */
  private applyVividnessToModel(model: any): void {
    try {
      const internalModel = model.internalModel;
      if (!internalModel) return;

      // Breathing
      const breathValue = Math.sin(this.state.breathAngle) * 0.5 + 0.5;
      this.setParameterValue(model, 'ParamBreath', breathValue);

      // Body micro-movement
      this.setParameterValue(model, 'ParamBodyAngleZ', this.state.bodyAngleZ);

      // Look-at (Head and Eyes)
      this.setParameterValue(model, 'ParamAngleX', this.state.lookAtX * 30);
      this.setParameterValue(model, 'ParamAngleY', -this.state.lookAtY * 30);
      this.setParameterValue(model, 'ParamAngleZ', this.state.lookAtX * -5);
      this.setParameterValue(model, 'ParamEyeBallX', this.state.lookAtX);
      this.setParameterValue(model, 'ParamEyeBallY', -this.state.lookAtY);

      // Blinking
      if (this.state.isBlinking) {
        this.setParameterValue(model, 'ParamEyeLOpen', 0);
        this.setParameterValue(model, 'ParamEyeROpen', 0);
      }

      // Emotion expressions
      this.applyEmotion(model);
    } catch {
      // Silently handle parameter errors - not all models have all parameters
    }
  }

  /**
   * パラメータ・ブロードキャスト: Copy all parameter values from source to target
   * This is the core of the "Multi-Model Synchronize" architecture.
   * Outfit models receive identical expression, pose, and look-at data as the base model.
   */
  private syncParametersToOutfit(source: any, target: any): void {
    try {
      const sourceInternal = source.internalModel;
      const targetInternal = target.internalModel;
      if (!sourceInternal || !targetInternal) return;

      // For Cubism 4 models
      const sourceModel = sourceInternal.coreModel;
      const targetModel = targetInternal.coreModel;

      if (sourceModel && targetModel) {
        const sourceParams = sourceModel._model?.parameters;
        const targetParams = targetModel._model?.parameters;

        if (sourceParams && targetParams) {
          const count = Math.min(sourceParams.count, targetParams.count);
          for (let i = 0; i < count; i++) {
            try {
              targetParams.values[i] = sourceParams.values[i];
            } catch {
              // Skip if parameter doesn't exist on target
            }
          }
        }
      }
    } catch {
      // Sync errors are non-fatal
    }
  }

  /**
   * 感情同期: Apply emotion-specific parameter overrides
   */
  private applyEmotion(model: any): void {
    const emotion = this.state.currentEmotion;
    const intensity = this.state.emotionIntensity;

    const params = EMOTION_PARAMETER_MAP[emotion] || EMOTION_PARAMETER_MAP.neutral;
    for (const [paramId, value] of Object.entries(params)) {
      this.setParameterValue(model, paramId, value * intensity);
    }
  }

  /**
   * Set a parameter value by ID on a Live2D model
   */
  private setParameterValue(model: any, paramId: string, value: number): void {
    try {
      const internalModel = model.internalModel;
      if (!internalModel) return;

      // For pixi-live2d-display with Cubism 4
      const coreModel = internalModel.coreModel;
      if (coreModel) {
        const paramIndex = coreModel._model?.parameters?.ids?.indexOf(paramId);
        if (paramIndex !== undefined && paramIndex >= 0) {
          coreModel._model.parameters.values[paramIndex] = value;
        }
      }
    } catch {
      // Parameter may not exist on this model
    }
  }
}
