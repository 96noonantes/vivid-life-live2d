'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Live2DEngine, VividnessSyncManager, OutfitPluginLoader, OcclusionManager, OutfitTransitionEffect } from '@/lib/live2d';
import type { OutfitManifest, VividnessState, ModelPreset } from '@/lib/live2d';
import { MODEL_PRESETS } from '@/lib/live2d';

const DEFAULT_MODEL_URL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/hiyori/hiyori_pro_t10.model3.json';

export interface GeneratedCharacter {
  id: string;
  name: string;
  modelUrl: string | null;
  portraitUrl: string | null;
  prompt: string;
  style: string;
  createdAt: number;
}

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

  // Character generation state
  const [currentCharacter, setCurrentCharacter] = useState<ModelPreset>(MODEL_PRESETS[0]);
  const [generatedPortraits, setGeneratedPortraits] = useState<GeneratedCharacter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customModelUrl, setCustomModelUrl] = useState('');

  const initialize = useCallback(async (canvas: HTMLCanvasElement, container: HTMLDivElement) => {
    if (engineRef.current?.isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const engine = new Live2DEngine();
      await engine.initialize({
        canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      });
      engineRef.current = engine;

      const syncManager = new VividnessSyncManager(engine);
      syncManager.onStateUpdate = (state) => {
        setVividnessState(state);
      };
      syncManagerRef.current = syncManager;

      const pluginLoader = new OutfitPluginLoader();
      await pluginLoader.initialize();
      pluginLoaderRef.current = pluginLoader;

      const occlusionManager = new OcclusionManager();
      occlusionManagerRef.current = occlusionManager;

      const transition = new OutfitTransitionEffect(container);
      transitionRef.current = transition;
      containerRef.current = container;

      // Load default model
      await engine.loadBaseModel(DEFAULT_MODEL_URL);
      syncManager.start();

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

  /**
   * Switch to a different character model from the preset library
   */
  const switchCharacter = useCallback(async (preset: ModelPreset) => {
    if (!engineRef.current || !syncManagerRef.current || !occlusionManagerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Stop sync during transition
      syncManagerRef.current.stop();

      // Play transition
      if (transitionRef.current) {
        await transitionRef.current.playTransition(async () => {
          await engineRef.current!.switchCharacter(preset.modelUrl);
        });
      } else {
        await engineRef.current.switchCharacter(preset.modelUrl);
      }

      // Reset occlusion and outfit state
      occlusionManagerRef.current.clearAll();
      setCurrentOutfit(null);

      // Restart sync with new model
      syncManagerRef.current.start();
      setCurrentCharacter(preset);

      // Set default emotion for this character
      if (preset.defaultEmotion) {
        syncManagerRef.current.setEmotion(preset.defaultEmotion);
        setCurrentEmotion(preset.defaultEmotion);
      }

      // Reload outfits for new model
      if (pluginLoaderRef.current) {
        const outfits = await pluginLoaderRef.current.getAvailableOutfits();
        setAvailableOutfits(outfits);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to switch character');
      console.error('Character switch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load a character from a custom model URL
   */
  const loadCustomModel = useCallback(async (url: string) => {
    if (!engineRef.current || !syncManagerRef.current || !occlusionManagerRef.current) return;
    if (!url.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      syncManagerRef.current.stop();

      if (transitionRef.current) {
        await transitionRef.current.playTransition(async () => {
          await engineRef.current!.switchCharacter(url.trim());
        });
      } else {
        await engineRef.current.switchCharacter(url.trim());
      }

      occlusionManagerRef.current.clearAll();
      setCurrentOutfit(null);
      syncManagerRef.current.start();

      // Create a custom preset for tracking
      const customPreset: ModelPreset = {
        id: 'custom-' + Date.now(),
        name: 'Custom Model',
        nameJa: 'カスタムモデル',
        modelUrl: url.trim(),
        description: 'User-loaded custom model',
        descriptionJa: 'ユーザー読み込みカスタムモデル',
        tags: ['custom'],
        style: 'anime',
        defaultEmotion: 'neutral',
      };
      setCurrentCharacter(customPreset);

      if (pluginLoaderRef.current) {
        const outfits = await pluginLoaderRef.current.getAvailableOutfits();
        setAvailableOutfits(outfits);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load custom model');
      console.error('Custom model load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Generate a character portrait using AI
   */
  const generatePortrait = useCallback(async (prompt: string, style: string): Promise<GeneratedCharacter | null> => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      const character: GeneratedCharacter = {
        id: 'gen-' + Date.now(),
        name: 'Generated Character',
        modelUrl: null, // Portrait only - no .moc3 model
        portraitUrl: data.image,
        prompt: data.prompt || prompt,
        style,
        createdAt: Date.now(),
      };

      setGeneratedPortraits(prev => [character, ...prev].slice(0, 20)); // Keep last 20
      return character;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate portrait');
      console.error('Portrait generation error:', e);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const changeOutfit = useCallback(async (outfitId: string) => {
    if (!engineRef.current || !occlusionManagerRef.current) return;

    try {
      setIsLoading(true);
      const outfit = availableOutfits.find(o => o.id === outfitId);
      if (!outfit) throw new Error(`Outfit ${outfitId} not found`);

      if (transitionRef.current) {
        await transitionRef.current.playTransition(async () => {
          if (currentOutfit) {
            engineRef.current!.removeOutfit(currentOutfit);
            const baseModel = engineRef.current!.currentBaseModel;
            if (baseModel) {
              occlusionManagerRef.current!.restoreModel(baseModel, 'base');
            }
          }
          await engineRef.current!.loadOutfit(outfitId, outfit.modelUrl, outfit.zIndex);
          const baseModel = engineRef.current!.currentBaseModel;
          if (baseModel && outfit.hide_parts.length > 0) {
            occlusionManagerRef.current!.applyOcclusion(baseModel, 'base', outfit.hide_parts);
          }
        });
      } else {
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
    const x = (clientX / canvasWidth) * 2 - 1;
    const y = (clientY / canvasHeight) * 2 - 1;
    syncManagerRef.current.setLookAtTarget(x, y);
  }, []);

  const handleGyroscope = useCallback((beta: number, gamma: number) => {
    if (!syncManagerRef.current) return;
    const x = Math.max(-1, Math.min(1, gamma / 45));
    const y = Math.max(-1, Math.min(1, (beta - 45) / 45));
    syncManagerRef.current.setLookAtTarget(x, y);
  }, []);

  const handleResize = useCallback((width: number, height: number) => {
    if (!engineRef.current?.isInitialized) return;
    engineRef.current.resize(width, height);
  }, []);

  // Cleanup
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
    // Character generation & switching
    currentCharacter,
    switchCharacter,
    loadCustomModel,
    customModelUrl,
    setCustomModelUrl,
    generatePortrait,
    generatedPortraits,
    isGenerating,
  };
}
