'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Live2DEngine, VividnessSyncManager, OutfitPluginLoader, OcclusionManager, OutfitTransitionEffect, CharacterGenerator, SpriteCharacterRenderer } from '@/lib/live2d';
import type { OutfitManifest, VividnessState, ModelPreset, GeneratedCharacterData, GenerationProgress } from '@/lib/live2d';
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
  const spriteRendererRef = useRef<SpriteCharacterRenderer | null>(null);
  const spriteAnimFrameRef = useRef<number | null>(null);

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

  // AI character generation state
  const [generatedCharacters, setGeneratedCharacters] = useState<GeneratedCharacterData[]>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [activeCharacterMode, setActiveCharacterMode] = useState<'live2d' | 'sprite'>('live2d');

  // Sprite animation state for vividness display
  const [spriteState, setSpriteState] = useState<{
    breathValue: number;
    isBlinking: boolean;
    lookAtX: number;
    lookAtY: number;
    emotion: string;
  } | null>(null);

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

      // Stop sprite animation if running
      stopSpriteAnimation();

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
      setActiveCharacterMode('live2d');

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

      stopSpriteAnimation();
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
      setActiveCharacterMode('live2d');

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
   * Generate a character portrait using AI (旧機能 - 単一画像のみ)
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
        modelUrl: null,
        portraitUrl: data.image,
        prompt: data.prompt || prompt,
        style,
        createdAt: Date.now(),
      };

      setGeneratedPortraits(prev => [character, ...prev].slice(0, 20));
      return character;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate portrait');
      console.error('Portrait generation error:', e);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * AI画像生成でLive2Dキャラクターを生成（パーツ別7枚生成 + スプライトアニメーション）
   */
  const generateLive2DCharacter = useCallback(async (prompt: string, style: string): Promise<GeneratedCharacterData | null> => {
    if (!engineRef.current || !engineRef.current.isInitialized) {
      setError('エンジンが初期化されていません');
      return null;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setGenerationProgress({
        stage: 'キャラクター生成を準備中...',
        current: 0,
        total: 7,
        percentage: 0,
      });

      // CharacterGeneratorで全パーツを生成
      const characterData = await CharacterGenerator.generateAllParts(prompt, style, (progress) => {
        setGenerationProgress(progress);
      });

      // 生成完了 → SpriteCharacterRendererで表示
      await displaySpriteCharacter(characterData);

      // 保存
      setGeneratedCharacters(prev => [characterData, ...prev].slice(0, 10));
      setGenerationProgress(null);

      return characterData;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'キャラクター生成に失敗しました');
      console.error('Character generation error:', e);
      setGenerationProgress(null);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * 生成済みキャラクターデータからスプライトキャラクターを表示
   */
  const displaySpriteCharacter = useCallback(async (characterData: GeneratedCharacterData) => {
    if (!engineRef.current || !engineRef.current.pixiApp) return;

    try {
      setIsLoading(true);

      // 既存のLive2Dモデルの同期を停止
      syncManagerRef.current?.stop();
      stopSpriteAnimation();

      // トランジション効果
      if (transitionRef.current) {
        await transitionRef.current.playTransition(async () => {
          // SpriteCharacterRendererを作成
          const renderer = await SpriteCharacterRenderer.create(
            characterData.parts,
            engineRef.current!.pixiApp,
            characterData.id
          );

          // エンジンにスプライトキャラクターを設定
          engineRef.current!.setSpriteCharacter(renderer);
          spriteRendererRef.current = renderer;
        });
      } else {
        const renderer = await SpriteCharacterRenderer.create(
          characterData.parts,
          engineRef.current.pixiApp,
          characterData.id
        );
        engineRef.current.setSpriteCharacter(renderer);
        spriteRendererRef.current = renderer;
      }

      // スプライトアニメーションループを開始
      startSpriteAnimation();
      setActiveCharacterMode('sprite');
      setCurrentEmotion('neutral');

      // 疑似キャラクターpreset
      const spritePreset: ModelPreset = {
        id: characterData.id,
        name: 'Generated Character',
        nameJa: '生成キャラクター',
        modelUrl: '',
        description: `AI生成: ${characterData.prompt.slice(0, 50)}`,
        descriptionJa: `AI生成キャラクター`,
        tags: ['generated', 'ai', characterData.style],
        style: characterData.style as any,
        defaultEmotion: 'neutral',
      };
      setCurrentCharacter(spritePreset);

      // 衣装リストをクリア（スプライトモードでは衣装未対応）
      setAvailableOutfits([]);
      setCurrentOutfit(null);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'スプライトキャラクターの表示に失敗しました');
      console.error('Sprite character display error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * スプライトアニメーションループを開始
   */
  const startSpriteAnimation = useCallback(() => {
    if (spriteAnimFrameRef.current) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      const renderer = spriteRendererRef.current;
      if (renderer && renderer.isReady) {
        renderer.update(dt);

        // 状態をUIに通知（VividnessState代替）
        const state = renderer.getState();
        setSpriteState({
          breathValue: Math.sin(state.breathAngle) * 0.5 + 0.5,
          isBlinking: state.isBlinking,
          lookAtX: state.lookAtX,
          lookAtY: state.lookAtY,
          emotion: state.currentEmotion,
        });
      }

      spriteAnimFrameRef.current = requestAnimationFrame(animate);
    };

    spriteAnimFrameRef.current = requestAnimationFrame(animate);
  }, []);

  /**
   * スプライトアニメーションループを停止
   */
  const stopSpriteAnimation = useCallback(() => {
    if (spriteAnimFrameRef.current) {
      cancelAnimationFrame(spriteAnimFrameRef.current);
      spriteAnimFrameRef.current = null;
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
    // Live2Dモード
    if (activeCharacterMode === 'live2d' && syncManagerRef.current) {
      syncManagerRef.current.setEmotion(emotion);
    }
    // スプライトモード
    if (activeCharacterMode === 'sprite' && spriteRendererRef.current) {
      spriteRendererRef.current.setEmotion(emotion as any);
    }
    setCurrentEmotion(emotion);
  }, [activeCharacterMode]);

  const handleMouseMove = useCallback((clientX: number, clientY: number, canvasWidth: number, canvasHeight: number) => {
    const x = (clientX / canvasWidth) * 2 - 1;
    const y = (clientY / canvasHeight) * 2 - 1;

    // Live2Dモード
    if (activeCharacterMode === 'live2d' && syncManagerRef.current) {
      syncManagerRef.current.setLookAtTarget(x, y);
    }
    // スプライトモード
    if (activeCharacterMode === 'sprite' && spriteRendererRef.current) {
      spriteRendererRef.current.setLookAtTarget(x, y);
    }
  }, [activeCharacterMode]);

  const handleGyroscope = useCallback((beta: number, gamma: number) => {
    const x = Math.max(-1, Math.min(1, gamma / 45));
    const y = Math.max(-1, Math.min(1, (beta - 45) / 45));

    if (activeCharacterMode === 'live2d' && syncManagerRef.current) {
      syncManagerRef.current.setLookAtTarget(x, y);
    }
    if (activeCharacterMode === 'sprite' && spriteRendererRef.current) {
      spriteRendererRef.current.setLookAtTarget(x, y);
    }
  }, [activeCharacterMode]);

  const handleResize = useCallback((width: number, height: number) => {
    if (!engineRef.current?.isInitialized) return;
    engineRef.current.resize(width, height);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopSpriteAnimation();
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
    // New: AI Live2D character generation
    generateLive2DCharacter,
    generatedCharacters,
    generationProgress,
    activeCharacterMode,
    spriteState,
    displaySpriteCharacter,
  };
}
