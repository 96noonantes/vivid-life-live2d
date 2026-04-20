'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false to avoid "window is not defined" error
// from pixi.js and pixi-live2d-display which require browser environment
const VividLifeContent = dynamic(
  () => import('@/components/live2d/VividLifeContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-400/30 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-cyan-400 text-sm font-mono">VIVID-LIFE ENGINE</p>
            <p className="text-gray-600 text-xs font-mono mt-1">Loading client modules...</p>
          </div>
        </div>
      </div>
    ),
  }
);

export default function VividLifePage() {
  return <VividLifeContent />;
}
