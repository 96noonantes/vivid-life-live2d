'use client';

import { useEffect, useRef, useState } from 'react';
import { useLive2D } from '@/hooks/useLive2D';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MODEL_PRESETS, STYLE_OPTIONS, PORTRAIT_PROMPTS } from '@/lib/live2d/ModelLibrary';
import type { ModelPreset } from '@/lib/live2d/ModelLibrary';

// Emotion definitions
const EMOTIONS = [
  { id: 'neutral', label: 'ニュートラル', symbol: '～', color: 'bg-gray-500/30 border-gray-500/50' },
  { id: 'joy', label: '喜び', symbol: '◇', color: 'bg-yellow-500/20 border-yellow-500/50' },
  { id: 'sorrow', label: '悲しみ', symbol: '△', color: 'bg-blue-500/20 border-blue-500/50' },
  { id: 'anger', label: '怒り', symbol: '×', color: 'bg-red-500/20 border-red-500/50' },
  { id: 'relax', label: 'リラックス', symbol: '○', color: 'bg-green-500/20 border-green-500/50' },
  { id: 'surprise', label: '驚き', symbol: '☆', color: 'bg-purple-500/20 border-purple-500/50' },
];

// Prompt templates for Live2D character generation
const LIVE2D_PROMPT_TEMPLATES = [
  { id: 'anime', label: 'アニメ少女', prompt: '1girl, cute anime girl, big expressive eyes, long flowing hair, school uniform, gentle smile' },
  { id: 'male', label: 'アニメ少年', prompt: '1boy, handsome anime boy, sharp eyes, short neat hair, casual jacket, confident expression' },
  { id: 'fantasy', label: 'ファンタジー', prompt: '1girl, fantasy mage girl, magical aura, ornate robe with gold trim, glowing staff, mystical eyes' },
  { id: 'cyberpunk', label: 'サイバーパンク', prompt: '1girl, cyberpunk girl, neon-pink hair, tech wear jacket, LED glasses, futuristic city vibe' },
  { id: 'chibi', label: 'ちびキャラ', prompt: '1girl, chibi cute girl, big round head, tiny body, oversized ribbon, pastel colors, kawaii' },
  { id: 'warrior', label: '戦士', prompt: '1girl, warrior princess, silver armor, long ponytail, determined eyes, sword at side, heroic pose' },
  { id: 'maid', label: 'メイド', prompt: '1girl, cute maid girl, frilly maid dress, white apron, lace headband, gentle smile, holding tray' },
  { id: 'school', label: 'スクール', prompt: '1girl, school girl, navy sailor uniform, pleated skirt, neat twin tails, gentle expression, holding notebook' },
];

export default function VividLifeContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const {
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
    // Character generation
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
  } = useLive2D();

  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'character' | 'outfit' | 'emotion' | 'settings'>('character');

  // Portrait generation state (旧機能)
  const [portraitPrompt, setPortraitPrompt] = useState(PORTRAIT_PROMPTS.anime);
  const [portraitStyle, setPortraitStyle] = useState('anime');
  const [selectedTemplate, setSelectedTemplate] = useState('anime');
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);

  // Live2D character generation state
  const [charPrompt, setCharPrompt] = useState(LIVE2D_PROMPT_TEMPLATES[0].prompt);
  const [charStyle, setCharStyle] = useState('anime');
  const [selectedCharTemplate, setSelectedCharTemplate] = useState('anime');
  const [charPreview, setCharPreview] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      initialize(canvas, container);
    }
  }, [initialize, canvasRef]);

  // Resize observer
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) handleResize(width, height);
      }
    });
    observer.observe(canvasContainer);
    return () => observer.disconnect();
  }, [handleResize]);

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInitialized) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      handleMouseMove(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    };
    canvas.addEventListener('mousemove', onMouseMove);
    return () => canvas.removeEventListener('mousemove', onMouseMove);
  }, [isInitialized, handleMouseMove, canvasRef]);

  // Touch tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInitialized) return;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      handleMouseMove(touch.clientX - rect.left, touch.clientY - rect.top, rect.width, rect.height);
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => canvas.removeEventListener('touchmove', onTouchMove);
  }, [isInitialized, handleMouseMove, canvasRef]);

  // Gyroscope
  useEffect(() => {
    if (!gyroEnabled || !isInitialized) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) handleGyroscope(e.beta, e.gamma);
    };
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((r: string) => { if (r === 'granted') window.addEventListener('deviceorientation', handleOrientation); })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroEnabled, isInitialized, handleGyroscope]);

  // Determine breath value based on mode
  const breathValue = activeCharacterMode === 'sprite' && spriteState
    ? spriteState.breathValue
    : vividnessState
      ? Math.sin(vividnessState.breathAngle) * 0.5 + 0.5
      : 0;

  // Handle portrait generation (旧機能)
  const handleGeneratePortrait = async () => {
    const result = await generatePortrait(portraitPrompt, portraitStyle);
    if (result?.portraitUrl) {
      setPortraitPreview(result.portraitUrl);
    }
  };

  // Handle Live2D character generation
  const handleGenerateLive2DCharacter = async () => {
    const result = await generateLive2DCharacter(charPrompt, charStyle);
    if (result) {
      setCharPreview(result.parts.base);
      // [修正 #5] フォールバック通知
      if (result.fallbackParts.length > 0) {
        const partLabels: Record<string, string> = {
          eyesClosed: '閉眼', joy: '喜び', sorrow: '悲しみ',
          anger: '怒り', surprise: '驚き', relax: 'リラックス',
        };
        const labels = result.fallbackParts.map(k => partLabels[k] || k).join('、');
        // 少し遅延させてトースト表示（生成完了オーバーレイが消えた後）
        setTimeout(() => {
          alert(`一部の表情パーツ（${labels}）の生成に失敗しました。ニュートラル表情で代用しています。`);
        }, 1500);
      }
    }
  };

  // Handle template selection for character generation
  const handleCharTemplateSelect = (templateId: string) => {
    const template = LIVE2D_PROMPT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedCharTemplate(templateId);
      setCharPrompt(template.prompt);
    }
  };

  // Handle custom model URL submit
  const handleCustomModelSubmit = () => {
    if (customModelUrl.trim()) {
      loadCustomModel(customModelUrl);
    }
  };

  // Handle displaying a previously generated character
  const handleDisplayGeneratedCharacter = (charId: string) => {
    const charData = generatedCharacters.find(c => c.id === charId);
    if (charData) {
      displaySpriteCharacter(charData);
      setCharPreview(charData.parts.base);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row">
      {/* Live2D Canvas Area */}
      <div ref={containerRef} className="flex-1 relative" style={{ minHeight: '100vh' }}>
        <div ref={canvasContainerRef} className="absolute inset-0">
          <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: 'none' }} />
        </div>

        {/* Loading overlay */}
        {isLoading && isInitialized && (
          <div className="absolute inset-0 bg-gray-950/60 flex items-center justify-center backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-400 text-xs font-mono tracking-wider">PROCESSING...</p>
            </div>
          </div>
        )}

        {/* Generation progress overlay */}
        {generationProgress && (
          <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center backdrop-blur-md z-25">
            <div className="flex flex-col items-center gap-4 max-w-sm w-full px-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-2 border-cyan-400/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-cyan-400 text-sm font-mono font-bold">
                    {generationProgress.percentage}%
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-cyan-400 text-sm font-mono tracking-wider">
                  CHARACTER GENERATION
                </p>
                <p className="text-gray-400 text-xs font-mono mt-1">
                  {generationProgress.stage}
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress.percentage}%` }}
                />
              </div>
              {/* Part generation indicators */}
              <div className="flex gap-2">
                {['base', 'eyes', 'joy', 'sad', 'angry', 'surp', 'relax'].map((part, i) => (
                  <div
                    key={part}
                    className={`w-6 h-6 rounded border text-[7px] font-mono flex items-center justify-center transition-all ${
                      i < generationProgress.current
                        ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-400'
                        : i === generationProgress.current
                          ? 'border-cyan-400/40 bg-cyan-950/30 text-cyan-400/60 animate-pulse'
                          : 'border-gray-700/30 bg-gray-800/20 text-gray-600'
                    }`}
                  >
                    {part}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center z-30">
            <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-6 max-w-sm text-center mx-4">
              <p className="text-red-400 text-sm font-mono mb-2 tracking-wider">SYSTEM ERROR</p>
              <p className="text-red-300/80 text-xs leading-relaxed">{error}</p>
              <Button variant="outline" size="sm" className="mt-4 border-red-500/50 text-red-300 hover:bg-red-950/50" onClick={() => window.location.reload()}>
                再読み込み
              </Button>
            </div>
          </div>
        )}

        {/* Initial loading */}
        {!isInitialized && !error && (
          <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-2 border-cyan-400/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-transparent border-b-cyan-400/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <p className="text-cyan-400 text-lg font-mono tracking-widest">VIVID-LIFE</p>
                <p className="text-gray-600 text-xs font-mono mt-2">{isLoading ? 'Loading model assets...' : 'Initializing WebGL context...'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Title overlay */}
        {isInitialized && (
          <div className="absolute top-4 left-4 z-10">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              <span className="text-cyan-400">Vivid</span><span className="text-white/90">Life</span>
            </h1>
            <p className="text-[10px] text-gray-600 font-mono mt-0.5 tracking-wider">
              {currentCharacter.nameJa} | {activeCharacterMode === 'sprite' ? 'AI GENERATED' : 'LIVE2D CHARACTER'} SYSTEM
            </p>
          </div>
        )}

        {/* Status bar */}
        {isInitialized && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950/90 via-gray-950/40 to-transparent h-20 flex items-end p-3 z-10">
            <div className="flex gap-3 text-[10px] font-mono text-cyan-400/50">
              <span>BREATH {(breathValue * 100).toFixed(0)}%</span>
              <span className="text-gray-700">|</span>
              <span>EMO {currentEmotion.toUpperCase()}</span>
              <span className="text-gray-700">|</span>
              <span>MODE {activeCharacterMode === 'sprite' ? 'AI' : 'L2D'}</span>
              <span className="text-gray-700">|</span>
              <span>CHAR {currentCharacter.nameJa}</span>
            </div>
          </div>
        )}

        {/* Portrait preview overlay */}
        {portraitPreview && (
          <div className="absolute top-4 right-16 md:right-auto md:left-4 md:top-auto md:bottom-24 z-20">
            <div className="bg-gray-900/90 border border-cyan-400/30 rounded-lg p-2 backdrop-blur-sm max-w-[200px]">
              <p className="text-[9px] text-cyan-400/60 font-mono mb-1">GENERATED PORTRAIT</p>
              <img src={portraitPreview} alt="Generated portrait" className="w-full rounded" />
              <button
                className="w-full mt-1 text-[9px] text-gray-500 hover:text-white font-mono"
                onClick={() => setPortraitPreview(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* Mobile panel toggle */}
        <button
          className="absolute top-4 right-4 z-20 md:hidden bg-gray-800/80 border border-gray-700/50 rounded-lg p-2 backdrop-blur-sm"
          onClick={() => setPanelOpen(!panelOpen)}
          aria-label="Toggle control panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
            {panelOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><path d="M3 12h18M3 6h18M3 18h18" /></>}
          </svg>
        </button>
      </div>

      {/* Control Panel */}
      <div className={`w-full md:w-80 lg:w-96 bg-gray-900/95 md:bg-gray-900 border-l border-gray-800/50 fixed md:relative inset-0 md:inset-auto z-30 md:z-auto transition-transform duration-300 ease-in-out ${panelOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <ScrollArea className="h-screen">
          <div className="p-4 space-y-3">
            {/* Close button mobile */}
            <button className="absolute top-3 right-3 md:hidden text-gray-500 hover:text-white" onClick={() => setPanelOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-800/30 rounded-lg p-0.5">
              {[
                { id: 'character' as const, label: 'キャラ', icon: '♠' },
                { id: 'outfit' as const, label: '衣装', icon: '♦' },
                { id: 'emotion' as const, label: '感情', icon: '♥' },
                { id: 'settings' as const, label: '設定', icon: '♣' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-mono transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="block text-xs">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ====== CHARACTER TAB ====== */}
            {activeTab === 'character' && (
              <>
                {/* ===== AI Live2D Character Generator ===== */}
                <Card className="bg-gray-800/40 border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.05)]">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400 font-mono tracking-wider flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      AI LIVE2D CHARACTER GENERATOR
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-3">
                    <p className="text-[9px] text-gray-500 font-mono leading-relaxed">
                      プロンプトを入力すると、7種類の表情パーツ画像をAIが生成し、
                      呼吸・瞬き・視線追従・感情表現が可能なLive2D風キャラクターを構築します
                    </p>

                    {/* Template quick select */}
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono mb-1.5">テンプレート</p>
                      <div className="flex flex-wrap gap-1">
                        {LIVE2D_PROMPT_TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            className={`px-2 py-1 rounded text-[9px] font-mono border transition-all ${
                              selectedCharTemplate === t.id
                                ? 'border-cyan-400/40 bg-cyan-950/20 text-cyan-400'
                                : 'border-gray-700/30 bg-gray-800/20 text-gray-500 hover:text-gray-300'
                            }`}
                            onClick={() => handleCharTemplateSelect(t.id)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Style selector */}
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono mb-1.5">スタイル</p>
                      <div className="flex flex-wrap gap-1">
                        {STYLE_OPTIONS.map((s) => (
                          <button
                            key={s.id}
                            className={`px-2 py-1 rounded text-[9px] font-mono border transition-all ${
                              charStyle === s.id
                                ? 'border-cyan-400/40 bg-cyan-950/20 text-cyan-400'
                                : 'border-gray-700/30 bg-gray-800/20 text-gray-500 hover:text-gray-300'
                            }`}
                            onClick={() => setCharStyle(s.id)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt input */}
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono mb-1">プロンプト</p>
                      <textarea
                        value={charPrompt}
                        onChange={(e) => setCharPrompt(e.target.value)}
                        className="w-full h-24 bg-gray-800/50 border border-gray-700/50 rounded-md p-2 text-[10px] font-mono text-gray-300 resize-none focus:border-cyan-400/50 focus:outline-none"
                        placeholder="キャラクターの描写を入力... 例: 1girl, cute anime girl, long blue hair, red eyes, school uniform"
                      />
                    </div>

                    {/* Generate button */}
                    <Button
                      size="sm"
                      className={`w-full h-9 text-[11px] font-mono ${
                        isGenerating
                          ? 'bg-gray-700/50 text-gray-400 cursor-wait'
                          : 'bg-gradient-to-r from-cyan-400/25 to-teal-400/25 text-cyan-400 border border-cyan-400/30 hover:from-cyan-400/35 hover:to-teal-400/35'
                      }`}
                      onClick={handleGenerateLive2DCharacter}
                      disabled={isGenerating || !charPrompt.trim()}
                    >
                      {isGenerating && generationProgress ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-cyan-400/50 border-t-transparent rounded-full animate-spin" />
                          生成中... {generationProgress.percentage}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                          Live2Dキャラクターを生成
                        </span>
                      )}
                    </Button>

                    {/* Generation info */}
                    <div className="bg-gray-800/30 rounded-md p-2 space-y-1">
                      <p className="text-[9px] text-gray-600 font-mono">生成パーツ一覧:</p>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { key: 'base', label: 'ベース' },
                          { key: 'eyesClosed', label: '閉眼' },
                          { key: 'joy', label: '喜び' },
                          { key: 'sorrow', label: '悲しみ' },
                          { key: 'anger', label: '怒り' },
                          { key: 'surprise', label: '驚き' },
                          { key: 'relax', label: 'リラックス' },
                        ].map(part => (
                          <div key={part.key} className="text-[8px] text-gray-500 font-mono bg-gray-800/40 rounded px-1 py-0.5 text-center">
                            {part.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generated characters gallery */}
                    {generatedCharacters.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 font-mono mb-1.5">生成済みキャラクター</p>
                        <div className="space-y-1.5">
                          {generatedCharacters.slice(0, 5).map((char) => (
                            <button
                              key={char.id}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                activeCharacterMode === 'sprite' && currentCharacter.id === char.id
                                  ? 'border-cyan-400/40 bg-cyan-950/20'
                                  : 'border-gray-700/30 bg-gray-800/20 hover:border-gray-600/40'
                              }`}
                              onClick={() => handleDisplayGeneratedCharacter(char.id)}
                            >
                              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                <img src={char.parts.base} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[10px] text-gray-300 font-mono truncate">
                                  {char.prompt.slice(0, 40)}...
                                </p>
                                <p className="text-[8px] text-gray-600 font-mono mt-0.5">
                                  {char.style} | {new Date(char.createdAt).toLocaleTimeString('ja-JP')}
                                </p>
                              </div>
                              {activeCharacterMode === 'sprite' && currentCharacter.id === char.id && (
                                <Badge className="bg-cyan-400/15 text-cyan-400 border-cyan-400/20 text-[8px] px-1 py-0 flex-shrink-0">ACTIVE</Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator className="bg-gray-800/50" />

                {/* Model Preset Library */}
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">PRESET MODEL LIBRARY</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-1.5">
                    {MODEL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 ${
                          currentCharacter.id === preset.id && activeCharacterMode === 'live2d'
                            ? 'border-cyan-400/40 bg-cyan-950/20 shadow-[0_0_12px_rgba(34,211,238,0.08)]'
                            : 'border-gray-700/30 bg-gray-800/20 hover:border-gray-600/40 hover:bg-gray-800/40'
                        }`}
                        onClick={() => switchCharacter(preset)}
                        disabled={isLoading}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-white/90">{preset.nameJa}</p>
                            <p className="text-[10px] text-gray-600 font-mono mt-0.5">{preset.descriptionJa}</p>
                          </div>
                          {currentCharacter.id === preset.id && activeCharacterMode === 'live2d' && (
                            <Badge className="bg-cyan-400/15 text-cyan-400 border-cyan-400/20 text-[9px] px-1.5 py-0">ACTIVE</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Custom Model URL Input */}
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">CUSTOM MODEL URL</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    <Input
                      value={customModelUrl}
                      onChange={(e) => setCustomModelUrl(e.target.value)}
                      placeholder="https://example.com/model.model3.json"
                      className="bg-gray-800/50 border-gray-700/50 text-xs font-mono text-gray-300 placeholder:text-gray-600 h-8"
                    />
                    <Button
                      size="sm"
                      className="w-full bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/30 h-7 text-[11px]"
                      onClick={handleCustomModelSubmit}
                      disabled={isLoading || !customModelUrl.trim()}
                    >
                      モデルを読み込む
                    </Button>
                    <p className="text-[9px] text-gray-700 font-mono">
                      .model3.json または .model.json のURLを入力
                    </p>
                  </CardContent>
                </Card>

                <Separator className="bg-gray-800/50" />

                {/* Legacy AI Portrait Generator */}
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-gray-500 font-mono tracking-wider">PORTRAIT GENERATOR (LEGACY)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-3">
                    {/* Style selector */}
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono mb-1.5">スタイル</p>
                      <div className="flex flex-wrap gap-1">
                        {STYLE_OPTIONS.map((s) => (
                          <button
                            key={s.id}
                            className={`px-2 py-1 rounded text-[9px] font-mono border transition-all ${
                              portraitStyle === s.id
                                ? 'border-cyan-400/40 bg-cyan-950/20 text-cyan-400'
                                : 'border-gray-700/30 bg-gray-800/20 text-gray-500 hover:text-gray-300'
                            }`}
                            onClick={() => setPortraitStyle(s.id)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt input */}
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono mb-1">プロンプト</p>
                      <textarea
                        value={portraitPrompt}
                        onChange={(e) => setPortraitPrompt(e.target.value)}
                        className="w-full h-16 bg-gray-800/50 border border-gray-700/50 rounded-md p-2 text-[10px] font-mono text-gray-300 resize-none focus:border-cyan-400/50 focus:outline-none"
                        placeholder="キャラクターの描写を入力..."
                      />
                    </div>

                    <Button
                      size="sm"
                      className={`w-full h-7 text-[11px] font-mono ${
                        isGenerating
                          ? 'bg-gray-700/50 text-gray-400 cursor-wait'
                          : 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/30'
                      }`}
                      onClick={handleGeneratePortrait}
                      disabled={isGenerating || !portraitPrompt.trim()}
                    >
                      {isGenerating ? '生成中...' : '肖像画を生成（画像のみ）'}
                    </Button>

                    {/* Generated portraits gallery */}
                    {generatedPortraits.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 font-mono mb-1.5">生成済み肖像画</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {generatedPortraits.slice(0, 6).map((char) => (
                            <button
                              key={char.id}
                              className="aspect-[3/4] rounded border border-gray-700/30 overflow-hidden hover:border-cyan-400/40 transition-all"
                              onClick={() => setPortraitPreview(char.portraitUrl)}
                            >
                              {char.portraitUrl && (
                                <img src={char.portraitUrl} alt="Portrait" className="w-full h-full object-cover" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ====== OUTFIT TAB ====== */}
            {activeTab === 'outfit' && (
              <Card className="bg-gray-800/40 border-gray-700/30">
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">OUTFIT PLUGIN</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {activeCharacterMode === 'sprite' && (
                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-md p-2 mb-2">
                      <p className="text-[9px] text-amber-400/80 font-mono">
                        AI生成キャラクター表示中は衣装プラグインは利用できません
                      </p>
                    </div>
                  )}
                  {activeCharacterMode === 'live2d' && availableOutfits.length === 0 && (
                    <p className="text-[11px] text-gray-600 font-mono py-2">Loading outfits...</p>
                  )}
                  {availableOutfits.map((outfit) => (
                    <button
                      key={outfit.id}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 ${
                        currentOutfit === outfit.id
                          ? 'border-cyan-400/40 bg-cyan-950/20 shadow-[0_0_12px_rgba(34,211,238,0.08)]'
                          : 'border-gray-700/30 bg-gray-800/20 hover:border-gray-600/40 hover:bg-gray-800/40'
                      }`}
                      onClick={() => changeOutfit(outfit.id)}
                      disabled={isLoading || activeCharacterMode === 'sprite'}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white/90">{outfit.name}</p>
                          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{outfit.id}</p>
                        </div>
                        {currentOutfit === outfit.id && (
                          <Badge className="bg-cyan-400/15 text-cyan-400 border-cyan-400/20 text-[9px] px-1.5 py-0">ACTIVE</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                  {currentOutfit && (
                    <Button variant="outline" size="sm" className="w-full mt-1 border-gray-700/40 text-gray-500 hover:text-red-400 hover:border-red-400/40 hover:bg-red-950/20 h-7 text-[11px]" onClick={removeOutfit} disabled={isLoading}>
                      衣装を外す
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ====== EMOTION TAB ====== */}
            {activeTab === 'emotion' && (
              <>
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">EMOTION SYNC</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {EMOTIONS.map((emotion) => (
                        <button
                          key={emotion.id}
                          className={`p-2.5 rounded-lg border transition-all duration-200 flex flex-col items-center gap-0.5 ${
                            currentEmotion === emotion.id
                              ? `border-cyan-400/40 ${emotion.color} shadow-[0_0_12px_rgba(34,211,238,0.08)]`
                              : 'border-gray-700/30 bg-gray-800/20 hover:border-gray-600/40 hover:bg-gray-800/40'
                          }`}
                          onClick={() => setEmotion(emotion.id)}
                        >
                          <span className="text-lg text-white/70">{emotion.symbol}</span>
                          <span className="text-[9px] text-gray-500 font-mono">{emotion.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* Mode indicator */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${activeCharacterMode === 'sprite' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                      <span className="text-[9px] text-gray-500 font-mono">
                        {activeCharacterMode === 'sprite' ? 'AI生成キャラクター - 表情スプライト切替' : 'Live2Dモデル - パラメータ制御'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Vividness Monitor */}
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">VIVIDNESS MONITOR</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-600 font-mono">BREATH</span>
                        <span className="text-cyan-400/70 font-mono">{(breathValue * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400/40 rounded-full transition-all duration-75" style={{ width: `${breathValue * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600 font-mono">LOOK-AT</span>
                      <span className="text-cyan-400/70 font-mono">
                        {activeCharacterMode === 'sprite' && spriteState
                          ? `X:${spriteState.lookAtX.toFixed(2)} Y:${spriteState.lookAtY.toFixed(2)}`
                          : vividnessState
                            ? `X:${vividnessState.lookAtX.toFixed(2)} Y:${vividnessState.lookAtY.toFixed(2)}`
                            : 'X:0.00 Y:0.00'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600 font-mono">BLINK</span>
                      <span className={`font-mono ${
                        activeCharacterMode === 'sprite' && spriteState
                          ? spriteState.isBlinking ? 'text-amber-400/70' : 'text-gray-600'
                          : vividnessState?.isBlinking ? 'text-amber-400/70' : 'text-gray-600'
                      }`}>
                        {(activeCharacterMode === 'sprite' && spriteState ? spriteState.isBlinking : vividnessState?.isBlinking) ? 'BLINK' : 'OPEN'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600 font-mono">EMOTION</span>
                      <span className="text-cyan-400/70 font-mono">{currentEmotion.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600 font-mono">MODE</span>
                      <span className={`font-mono ${activeCharacterMode === 'sprite' ? 'text-purple-400/70' : 'text-emerald-400/70'}`}>
                        {activeCharacterMode === 'sprite' ? 'AI SPRITE' : 'LIVE2D'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600 font-mono">SYNC</span>
                      <span className={`font-mono ${isInitialized ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
                        {isInitialized ? 'ACTIVE' : 'PENDING'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ====== SETTINGS TAB ====== */}
            {activeTab === 'settings' && (
              <>
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">SYSTEM STATUS</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isInitialized ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                      <span className="text-[11px] text-gray-400 font-mono">{isInitialized ? 'VIVIDNESS ENGINE ACTIVE' : 'INITIALIZING...'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${activeCharacterMode === 'sprite' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                      <span className="text-[11px] text-gray-400 font-mono">
                        {activeCharacterMode === 'sprite' ? 'AI SPRITE MODE' : 'LIVE2D MODEL MODE'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">GYROSCOPE</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-gray-400 font-mono">デバイスジャイロで視線追従</Label>
                      <Switch checked={gyroEnabled} onCheckedChange={setGyroEnabled} />
                    </div>
                    <p className="text-[9px] text-gray-700 mt-1.5 font-mono">iOS: 設定 → Safari → モーション許可が必要</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">ARCHITECTURE</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-1 text-[10px] font-mono">
                    {[
                      ['Rendering', 'WebGL (PixiJS)'],
                      ['Model Format', '.moc3 / .model (Cubism)'],
                      ['AI Character', 'Sprite Layers (7 parts)'],
                      ['Sync Mode', 'Parameter Broadcast'],
                      ['Physics', 'Individual / Model'],
                      ['Cache', 'IndexedDB (7d)'],
                      ['Occlusion', 'Per-part Opacity'],
                      ['Transition', 'Blur + Particles'],
                      ['AI Generation', 'z-ai-web-dev-sdk'],
                      ['Animation', 'Breath/Blink/LookAt/Sway'],
                    ].map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}</span>
                        <span className="text-gray-400">{val}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Current character info */}
                <Card className="bg-gray-800/40 border-gray-700/30">
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">CURRENT CHARACTER</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name</span>
                      <span className="text-gray-400">{currentCharacter.nameJa}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mode</span>
                      <span className={` ${activeCharacterMode === 'sprite' ? 'text-purple-400' : 'text-emerald-400'}`}>
                        {activeCharacterMode === 'sprite' ? 'AI SPRITE' : 'LIVE2D'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Style</span>
                      <span className="text-gray-400">{currentCharacter.style}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Default Emo</span>
                      <span className="text-gray-400">{currentCharacter.defaultEmotion}</span>
                    </div>
                    {activeCharacterMode === 'live2d' && (
                      <div className="mt-1.5">
                        <p className="text-gray-600 text-[9px]">URL</p>
                        <p className="text-gray-500 text-[8px] break-all mt-0.5">{currentCharacter.modelUrl}</p>
                      </div>
                    )}
                    {activeCharacterMode === 'sprite' && generatedCharacters.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-gray-600 text-[9px]">AI生成パーツ数</p>
                        <p className="text-gray-500 text-[8px] mt-0.5">7 images (base + 6 expressions)</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
