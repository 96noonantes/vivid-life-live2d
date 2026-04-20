'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Live2DEngine, VividnessSyncManager, OutfitPluginLoader, OcclusionManager, OutfitTransitionEffect } from '@/lib/live2d';
import type { OutfitManifest, VividnessState } from '@/lib/live2d';

const BASE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/hiyori/hiyori_pro_t10.model3.json';

export function useLive2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Live2DEngine | null>(null);
  const syncManagerRef = useRef<VividnessSyncManager | null>(null);
  const pluginLoaderRef = useRef<OutfitPluginLoader | null>(null);
  const occlusionManagerRef = useRef<OcclusionManager | null>(null);
  const transitionRef = useRef<OutfitTransitionEffect | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOutfit, setCurrentOutfit] = useState<string | null>(null);
  const [availableOutfits, setAvailableOutfits] = useState<OutfitManifest[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [error, setError] = useState<string | null>(null);
  const [vividnessState, setVividnessState] = useState<VividnessState | null>(null);

  const initialize = useCallback(async (canvas: HTMLCanvasElement, container: HTMLDivElement) => {
    if (engineRef.current?.isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      // Initialize engine (lazy-loads pixi.js internally)
      const engine = new Live2DEngine();
      await engine.initialize({
        canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      });
      engineRef.current = engine;

      // Initialize sync manager with state callback
      const syncManager = new VividnessSyncManager(engine);
      syncManager.onStateUpdate = (state) => {
        setVividnessState(state);
      };
      syncManagerRef.current = syncManager;

      // Initialize plugin loader
      const pluginLoader = new OutfitPluginLoader();
      await pluginLoader.initialize();
      pluginLoaderRef.current = pluginLoader;

      // Initialize occlusion manager
      const occlusionManager = new OcclusionManager();
      occlusionManagerRef.current = occlusionManager;

      // Initialize transition effect
      const transition = new OutfitTransitionEffect(container);
      transitionRef.current = transition;
      containerRef.current = container;

      // Load base model
      await engine.loadBaseModel(BASE_MODEL_URL);

      // Start vividness sync (breathing, blinking, look-at, emotions)
      syncManager.start();

      // Load available outfits from manifests
      const outfits = await pluginLoader.getAvailableOutfits();
      setAvailableOutfits(outfits);

      setIsInitialized(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to initialize Live2D';
      setError(message);
      console.error('Live2D initialization error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeOutfit = useCallback(async (outfitId: string) => {
    if (!engineRef.current || !occlusionManagerRef.current) return;

    try {
      setIsLoading(true);
      const outfit = availableOutfits.find(o => o.id === outfitId);
      if (!outfit) throw new Error(`Outfit ${outfitId} not found`);

      // Play transition effect to maintain vividness during the swap
      if (transitionRef.current) {
        await transitionRef.current.playTransition(async () => {
          // Remove previous outfit
          if (currentOutfit) {
            engineRef.current!.removeOutfit(currentOutfit);
            const baseModel = engineRef.current!.currentBaseModel;
            if (baseModel) {
              occlusionManagerRef.current!.restoreModel(baseModel, 'base');
            }
          }

          // Load new outfit
          await engineRef.current!.loadOutfit(outfitId, outfit.modelUrl, outfit.zIndex);

          // Apply occlusion (hide base body parts that would poke through)
          const baseModel = engineRef.current!.currentBaseModel;
          if (baseModel && outfit.hide_parts.length > 0) {
            occlusionManagerRef.current!.applyOcclusion(baseModel, 'base', outfit.hide_parts);
          }
        });
      } else {
        // No transition, just swap directly
        if (currentOutfit) {
          engineRef.current.removeOutfit(currentOutfit);
          const baseModel = engineRef.current.currentBaseModel;
          if (baseModel) {
            occlusionManagerRef.current.restoreModel(baseModel, 'base');
          }
        }

        await engineRef.current.loadOutfit(outfitId, outfit.modelUrl, outfit.zIndex);

        const baseModel = engineRef.current.currentBaseModel;
        if (baseModel && outfit.hide_parts.length > 0) {
          occlusionManagerRef.current.applyOcclusion(baseModel, 'base', outfit.hide_parts);
        }
      }

      setCurrentOutfit(outfitId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change outfit');
      console.error('Outfit change error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [availableOutfits, currentOutfit]);

  const removeOutfit = useCallback(() => {
    if (!engineRef.current || !occlusionManagerRef.current || !currentOutfit) return;

    engineRef.current.removeOutfit(currentOutfit);
    const baseModel = engineRef.current.currentBaseModel;
    if (baseModel) {
      occlusionManagerRef.current.restoreModel(baseModel, 'base');
    }
    setCurrentOutfit(null);
  }, [currentOutfit]);

  const setEmotion = useCallback((emotion: string) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.setEmotion(emotion);
    setCurrentEmotion(emotion);
  }, []);

  const handleMouseMove = useCallback((clientX: number, clientY: number, canvasWidth: number, canvasHeight: number) => {
    if (!syncManagerRef.current) return;
    // Normalize to -1 to 1 (center = 0)
    const x = (clientX / canvasWidth) * 2 - 1;
    const y = (clientY / canvasHeight) * 2 - 1;
    syncManagerRef.current.setLookAtTarget(x, y);
  }, []);

  const handleGyroscope = useCallback((beta: number, gamma: number) => {
    if (!syncManagerRef.current) return;
    // gamma: left/right tilt (-90 to 90) -> normalize to -1 to 1
    // beta: front/back tilt (0 to 180) -> normalize to -1 to 1
    const x = Math.max(-1, Math.min(1, gamma / 45));
    const y = Math.max(-1, Math.min(1, (beta - 45) / 45));
    syncManagerRef.current.setLookAtTarget(x, y);
  }, []);

  const handleResize = useCallback((width: number, height: number) => {
    if (!engineRef.current?.isInitialized) return;
    engineRef.current.resize(width, height);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      syncManagerRef.current?.stop();
      engineRef.current?.destroy();
    };
  }, []);

  return {
    canvasRef,
    initialize,
    isInitialized,
    isLoading,
    currentOutfit,
    availableOutfits,
    currentEmotion,
    error,
    vividnessState,
    changeOutfit,
    removeOutfit,
    setEmotion,
    handleMouseMove,
    handleGyroscope,
    handleResize,
  };
}
