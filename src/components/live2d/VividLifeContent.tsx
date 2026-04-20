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

// Emotion definitions with Japanese labels
const EMOTIONS = [
  { id: 'neutral', label: 'ニュートラル', emoji: '😐', color: 'bg-gray-500' },
  { id: 'joy', label: '喜び', emoji: '😊', color: 'bg-yellow-500' },
  { id: 'sorrow', label: '悲しみ', emoji: '😢', color: 'bg-blue-500' },
  { id: 'anger', label: '怒り', emoji: '😠', color: 'bg-red-500' },
  { id: 'relax', label: 'リラックス', emoji: '😌', color: 'bg-green-500' },
  { id: 'surprise', label: '驚き', emoji: '😮', color: 'bg-purple-500' },
];

export default function VividLifeContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    canvasRef,
    initialize,
    isInitialized,
    isLoading,
    currentOutfit,
    availableOutfits,
    currentEmotion,
    error,
    changeOutfit,
    removeOutfit,
    setEmotion,
    handleMouseMove,
    handleGyroscope,
  } = useLive2D();

  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [statusInfo, setStatusInfo] = useState({ breath: 0, lookX: 0, lookY: 0, emotion: 'neutral' });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      initialize(canvas, container);
    }
  }, [initialize, canvasRef]);

  // Mouse move tracking
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

  // Touch tracking for mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInitialized) return;

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      handleMouseMove(touch.clientX - rect.left, touch.clientY - rect.top, rect.width, rect.height);
    };

    canvas.addEventListener('touchmove', onTouchMove);
    return () => canvas.removeEventListener('touchmove', onTouchMove);
  }, [isInitialized, handleMouseMove, canvasRef]);

  // Gyroscope
  useEffect(() => {
    if (!gyroEnabled || !isInitialized) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        handleGyroscope(e.beta, e.gamma);
      }
    };

    // Request permission for iOS
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

  // Update status info periodically
  useEffect(() => {
    if (!isInitialized) return;
    const interval = setInterval(() => {
      setStatusInfo(prev => ({
        breath: Math.sin(Date.now() / 1000) * 0.5 + 0.5,
        lookX: 0,
        lookY: 0,
        emotion: currentEmotion,
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [isInitialized, currentEmotion]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row">
      {/* Live2D Canvas Area */}
      <div ref={containerRef} className="flex-1 relative min-h-[60vh] md:min-h-screen">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-400 text-sm font-mono">LOADING MODEL...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center">
            <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
              <p className="text-red-400 text-sm font-mono mb-2">ERROR</p>
              <p className="text-red-300 text-xs">{error}</p>
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

        {/* Status bar at bottom */}
        {isInitialized && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 to-transparent h-24 flex items-end p-4">
            <div className="flex gap-4 text-xs font-mono text-cyan-400/60">
              <span>BREATH: {(statusInfo.breath * 100).toFixed(0)}%</span>
              <span>EMOTION: {statusInfo.emotion}</span>
              <span>OUTFIT: {currentOutfit || 'NONE'}</span>
            </div>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute top-4 left-4">
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="text-cyan-400">Vivid</span>
            <span className="text-white">Life</span>
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">Live2D Outfit Plugin System</p>
        </div>

        {/* Initial loading state when not yet initialized and not loading */}
        {!isInitialized && !isLoading && !error && (
          <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-cyan-400/30 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-cyan-400 text-sm font-mono">VIVID-LIFE ENGINE</p>
                <p className="text-gray-600 text-xs font-mono mt-1">Initializing WebGL context...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-96 bg-gray-900 border-l border-gray-800">
        <ScrollArea className="h-screen">
          <div className="p-4 space-y-4">
            {/* System Status */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400 font-mono">SYSTEM STATUS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-400 font-mono">
                    {isInitialized ? 'VIVIDNESS ENGINE ACTIVE' : 'INITIALIZING...'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Separator className="bg-gray-700/50" />

            {/* Outfit Selection */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400 font-mono">OUTFIT PLUGIN</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableOutfits.map((outfit) => (
                  <button
                    key={outfit.id}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      currentOutfit === outfit.id
                        ? 'border-cyan-400/50 bg-cyan-950/30 shadow-lg shadow-cyan-400/10'
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
                    }`}
                    onClick={() => changeOutfit(outfit.id)}
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{outfit.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{outfit.id}</p>
                      </div>
                      {currentOutfit === outfit.id && (
                        <Badge className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 text-[10px]">
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
                    className="w-full mt-2 border-gray-600/50 text-gray-400 hover:text-red-400 hover:border-red-400/50 hover:bg-red-950/30"
                    onClick={removeOutfit}
                    disabled={isLoading}
                  >
                    衣装を外す
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Emotion Control */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400 font-mono">EMOTION SYNC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {EMOTIONS.map((emotion) => (
                    <button
                      key={emotion.id}
                      className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1 ${
                        currentEmotion === emotion.id
                          ? 'border-cyan-400/50 bg-cyan-950/30 shadow-lg shadow-cyan-400/10'
                          : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
                      }`}
                      onClick={() => setEmotion(emotion.id)}
                    >
                      <span className="text-xl">{emotion.emoji}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{emotion.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gyroscope Control */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400 font-mono">GYROSCOPE</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-400">デバイスジャイロで視線追従</Label>
                  <Switch
                    checked={gyroEnabled}
                    onCheckedChange={setGyroEnabled}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-2 font-mono">
                  iOS: 設定 → Safari → モーション許可が必要
                </p>
              </CardContent>
            </Card>

            {/* Vividness Status */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400 font-mono">VIVIDNESS MONITOR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 font-mono">BREATH</span>
                    <span className="text-cyan-400 font-mono">{(statusInfo.breath * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400/60 rounded-full transition-all duration-100"
                      style={{ width: `${statusInfo.breath * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 font-mono">EMOTION</span>
                    <span className="text-cyan-400 font-mono">{currentEmotion.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 font-mono">SYNC STATUS</span>
                    <span className="text-green-400 font-mono">{isInitialized ? 'ACTIVE' : 'PENDING'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Info */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400 font-mono">ARCHITECTURE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-[10px] font-mono text-gray-500">
                <div className="flex justify-between"><span>Rendering</span><span className="text-gray-400">WebGL (PixiJS)</span></div>
                <div className="flex justify-between"><span>Model Format</span><span className="text-gray-400">.moc3 (Cubism 4)</span></div>
                <div className="flex justify-between"><span>Sync Mode</span><span className="text-gray-400">Parameter Broadcast</span></div>
                <div className="flex justify-between"><span>Physics</span><span className="text-gray-400">Individual / Model</span></div>
                <div className="flex justify-between"><span>Cache</span><span className="text-gray-400">IndexedDB (7d)</span></div>
                <div className="flex justify-between"><span>Occlusion</span><span className="text-gray-400">Per-part Opacity</span></div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
