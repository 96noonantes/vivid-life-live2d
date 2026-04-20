'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLive2D } from '@/hooks/useLive2D';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// Emotion definitions with Japanese labels - matching the spec's emotional sync
const EMOTIONS = [
  { id: 'neutral', label: 'ニュートラル', symbol: '～', color: 'bg-gray-500/30 border-gray-500/50' },
  { id: 'joy', label: '喜び', symbol: '◇', color: 'bg-yellow-500/20 border-yellow-500/50' },
  { id: 'sorrow', label: '悲しみ', symbol: '△', color: 'bg-blue-500/20 border-blue-500/50' },
  { id: 'anger', label: '怒り', symbol: '×', color: 'bg-red-500/20 border-red-500/50' },
  { id: 'relax', label: 'リラックス', symbol: '○', color: 'bg-green-500/20 border-green-500/50' },
  { id: 'surprise', label: '驚き', symbol: '☆', color: 'bg-purple-500/20 border-purple-500/50' },
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
  } = useLive2D();

  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // Initialize the Live2D engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      // Set canvas dimensions from container
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      initialize(canvas, container);
    }
  }, [initialize, canvasRef]);

  // Canvas resize observer for responsive rendering
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          handleResize(width, height);
        }
      }
    });

    observer.observe(canvasContainer);
    return () => observer.disconnect();
  }, [handleResize]);

  // Mouse move tracking for look-at
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

  // Touch tracking for mobile look-at
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

  // Gyroscope for iOS device orientation
  useEffect(() => {
    if (!gyroEnabled || !isInitialized) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        handleGyroscope(e.beta, e.gamma);
      }
    };

    // Request permission for iOS Safari 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [gyroEnabled, isInitialized, handleGyroscope]);

  // Breath value from sync manager (real data)
  const breathValue = vividnessState
    ? Math.sin(vividnessState.breathAngle) * 0.5 + 0.5
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row">
      {/* Live2D Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        style={{ minHeight: '100vh' }}
      >
        {/* Canvas container that fills the area */}
        <div ref={canvasContainerRef} className="absolute inset-0">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ touchAction: 'none' }}
          />
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

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center z-30">
            <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-6 max-w-sm text-center mx-4">
              <p className="text-red-400 text-sm font-mono mb-2 tracking-wider">SYSTEM ERROR</p>
              <p className="text-red-300/80 text-xs leading-relaxed">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-red-500/50 text-red-300 hover:bg-red-950/50"
                onClick={() => window.location.reload()}
              >
                再読み込み
              </Button>
            </div>
          </div>
        )}

        {/* Initial loading state */}
        {!isInitialized && !error && (
          <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-6">
              {/* Animated ring */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-2 border-cyan-400/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-transparent border-b-cyan-400/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <p className="text-cyan-400 text-lg font-mono tracking-widest">VIVID-LIFE</p>
                <p className="text-gray-600 text-xs font-mono mt-2">
                  {isLoading ? 'Loading model assets...' : 'Initializing WebGL context...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Title overlay - top left */}
        {isInitialized && (
          <div className="absolute top-4 left-4 z-10">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              <span className="text-cyan-400">Vivid</span>
              <span className="text-white/90">Life</span>
            </h1>
            <p className="text-[10px] text-gray-600 font-mono mt-0.5 tracking-wider">LIVE2D OUTFIT PLUGIN SYSTEM</p>
          </div>
        )}

        {/* Status bar - bottom */}
        {isInitialized && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950/90 via-gray-950/40 to-transparent h-20 flex items-end p-3 z-10">
            <div className="flex gap-3 text-[10px] font-mono text-cyan-400/50">
              <span>BREATH {(breathValue * 100).toFixed(0)}%</span>
              <span className="text-gray-700">|</span>
              <span>EMO {currentEmotion.toUpperCase()}</span>
              <span className="text-gray-700">|</span>
              <span>OUTFIT {currentOutfit ? currentOutfit.replace('outfit-', '').toUpperCase() : 'BASE'}</span>
            </div>
          </div>
        )}

        {/* Mobile panel toggle button */}
        <button
          className="absolute top-4 right-4 z-20 md:hidden bg-gray-800/80 border border-gray-700/50 rounded-lg p-2 backdrop-blur-sm"
          onClick={() => setPanelOpen(!panelOpen)}
          aria-label="Toggle control panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
            {panelOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <path d="M3 12h18M3 6h18M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Control Panel - Right side */}
      <div
        className={`
          w-full md:w-80 lg:w-96 bg-gray-900/95 md:bg-gray-900 border-l border-gray-800/50
          fixed md:relative inset-0 md:inset-auto z-30 md:z-auto
          transition-transform duration-300 ease-in-out
          ${panelOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <ScrollArea className="h-screen">
          <div className="p-4 space-y-3">
            {/* Close button for mobile */}
            <button
              className="absolute top-3 right-3 md:hidden text-gray-500 hover:text-white"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* System Status */}
            <Card className="bg-gray-800/40 border-gray-700/30">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">SYSTEM STATUS</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isInitialized ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-[11px] text-gray-400 font-mono">
                    {isInitialized ? 'VIVIDNESS ENGINE ACTIVE' : 'INITIALIZING...'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Separator className="bg-gray-800/50" />

            {/* Outfit Plugin Selection */}
            <Card className="bg-gray-800/40 border-gray-700/30">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">OUTFIT PLUGIN</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                {availableOutfits.length === 0 && (
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
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-white/90">{outfit.name}</p>
                        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{outfit.id}</p>
                      </div>
                      {currentOutfit === outfit.id && (
                        <Badge className="bg-cyan-400/15 text-cyan-400 border-cyan-400/20 text-[9px] px-1.5 py-0">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}

                {currentOutfit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1 border-gray-700/40 text-gray-500 hover:text-red-400 hover:border-red-400/40 hover:bg-red-950/20 h-7 text-[11px]"
                    onClick={removeOutfit}
                    disabled={isLoading}
                  >
                    衣装を外す
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Emotion Sync Control */}
            <Card className="bg-gray-800/40 border-gray-700/30">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">EMOTION SYNC</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {EMOTIONS.map((emotion) => (
                    <button
                      key={emotion.id}
                      className={`p-2 rounded-lg border transition-all duration-200 flex flex-col items-center gap-0.5 ${
                        currentEmotion === emotion.id
                          ? `border-cyan-400/40 ${emotion.color} shadow-[0_0_12px_rgba(34,211,238,0.08)]`
                          : 'border-gray-700/30 bg-gray-800/20 hover:border-gray-600/40 hover:bg-gray-800/40'
                      }`}
                      onClick={() => setEmotion(emotion.id)}
                    >
                      <span className="text-base text-white/70">{emotion.symbol}</span>
                      <span className="text-[9px] text-gray-500 font-mono">{emotion.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gyroscope Control */}
            <Card className="bg-gray-800/40 border-gray-700/30">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">GYROSCOPE</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-gray-400 font-mono">デバイスジャイロで視線追従</Label>
                  <Switch
                    checked={gyroEnabled}
                    onCheckedChange={setGyroEnabled}
                  />
                </div>
                <p className="text-[9px] text-gray-700 mt-1.5 font-mono">
                  iOS: 設定 → Safari → モーション許可が必要
                </p>
              </CardContent>
            </Card>

            {/* Vividness Monitor */}
            <Card className="bg-gray-800/40 border-gray-700/30">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">VIVIDNESS MONITOR</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2.5">
                {/* Breath indicator */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-600 font-mono">BREATH</span>
                    <span className="text-cyan-400/70 font-mono">{(breathValue * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400/40 rounded-full transition-all duration-75"
                      style={{ width: `${breathValue * 100}%` }}
                    />
                  </div>
                </div>

                {/* Look-at indicator */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-600 font-mono">LOOK-AT</span>
                    <span className="text-cyan-400/70 font-mono">
                      {vividnessState
                        ? `X:${vividnessState.lookAtX.toFixed(2)} Y:${vividnessState.lookAtY.toFixed(2)}`
                        : 'X:0.00 Y:0.00'}
                    </span>
                  </div>
                </div>

                {/* Blink status */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-600 font-mono">BLINK</span>
                    <span className={`font-mono ${vividnessState?.isBlinking ? 'text-amber-400/70' : 'text-gray-600'}`}>
                      {vividnessState?.isBlinking ? 'BLINK' : 'OPEN'}
                    </span>
                  </div>
                </div>

                {/* Emotion */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-600 font-mono">EMOTION</span>
                    <span className="text-cyan-400/70 font-mono">{currentEmotion.toUpperCase()}</span>
                  </div>
                </div>

                {/* Sync status */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-600 font-mono">SYNC</span>
                    <span className={`font-mono ${isInitialized ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
                      {isInitialized ? 'ACTIVE' : 'PENDING'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Info */}
            <Card className="bg-gray-800/40 border-gray-700/30">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-cyan-400/80 font-mono tracking-wider">ARCHITECTURE</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1 text-[10px] font-mono">
                {[
                  ['Rendering', 'WebGL (PixiJS)'],
                  ['Model Format', '.moc3 (Cubism 4)'],
                  ['Sync Mode', 'Parameter Broadcast'],
                  ['Physics', 'Individual / Model'],
                  ['Cache', 'IndexedDB (7d)'],
                  ['Occlusion', 'Per-part Opacity'],
                  ['Transition', 'Blur + Particles'],
                ].map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}</span>
                    <span className="text-gray-400">{val}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
