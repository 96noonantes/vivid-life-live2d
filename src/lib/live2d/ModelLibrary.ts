/**
 * [修正 #9] 'use client' 削除 - ブラウザAPIに依存しない純粋なTypeScript定数
 */

/**
 * Live2D Model Preset Library
 *
 * Provides a curated set of free Live2D Cubism models available on public CDNs.
 * Each preset includes metadata for display and the model3.json URL for loading.
 */

export interface ModelPreset {
  id: string;
  name: string;
  nameJa: string;
  modelUrl: string;
  thumbnailUrl?: string;
  description: string;
  descriptionJa: string;
  tags: string[];
  style: 'anime' | 'realistic' | 'chibi' | 'fantasy' | 'cyberpunk';
  defaultEmotion: string;
}

/**
 * Available Live2D model presets from public CDNs
 * These are free sample models from the Live2D / pixi-live2d-display community
 */
export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'hiyori-pro',
    name: 'Hiyori Pro',
    nameJa: 'ひより Pro',
    modelUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/hiyori/hiyori_pro_t10.model3.json',
    description: 'Official Live2D sample model with full expression support.',
    descriptionJa: 'Live2D公式サンプルモデル。豊富な表情パラメータを搭載。',
    tags: ['official', 'female', 'school'],
    style: 'anime',
    defaultEmotion: 'neutral',
  },
  {
    id: 'hiyori',
    name: 'Hiyori',
    nameJa: 'ひより',
    modelUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/hiyori/hiyori_pro_t10.model3.json',
    description: 'Standard Hiyori model variant with breathing and physics.',
    descriptionJa: '標準的なひよりモデル。呼吸・物理演算対応。',
    tags: ['official', 'female', 'casual'],
    style: 'anime',
    defaultEmotion: 'relax',
  },
  {
    id: 'shizuku',
    name: 'Shizuku',
    nameJa: '雫',
    modelUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
    description: 'Cubism 2 model with elegant design and smooth animations.',
    descriptionJa: 'Cubism 2モデル。エレガントなデザインとなめらかなアニメーション。',
    tags: ['official', 'female', 'elegant'],
    style: 'anime',
    defaultEmotion: 'neutral',
  },
  {
    id: 'haru',
    name: 'Haru',
    nameJa: 'ハル',
    modelUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
    description: 'Greeter model with welcoming poses and expressions.',
    descriptionJa: 'グリーターモデル。ウェルカムポーズと表情を搭載。',
    tags: ['official', 'female', 'greeter'],
    style: 'anime',
    defaultEmotion: 'joy',
  },
];

/**
 * Get a model preset by ID
 */
export function getModelPreset(id: string): ModelPreset | undefined {
  return MODEL_PRESETS.find(m => m.id === id);
}

/**
 * Get all model presets
 */
export function getAllPresets(): ModelPreset[] {
  return [...MODEL_PRESETS];
}

/**
 * Get presets filtered by style
 */
export function getPresetsByStyle(style: ModelPreset['style']): ModelPreset[] {
  return MODEL_PRESETS.filter(m => m.style === style);
}

/**
 * Character generation prompt templates for AI portrait generation
 */
export const PORTRAIT_PROMPTS: Record<string, string> = {
  anime: '1girl, solo, portrait, anime style, front-facing, cute, detailed eyes, beautiful hair',
  male_anime: '1boy, solo, portrait, anime style, front-facing, handsome, detailed eyes',
  fantasy: '1girl, solo, portrait, fantasy mage, magical aura, ornate robe, glowing eyes',
  cyberpunk: '1girl, solo, portrait, cyberpunk style, neon highlights, futuristic outfit, tech wear',
  chibi: '1girl, solo, chibi, cute, big head, small body, simple design, kawaii',
  warrior: '1girl, solo, portrait, warrior princess, armor, determined expression, heroic',
  maid: '1girl, solo, portrait, maid outfit, cute, apron, headband, gentle smile',
  school: '1girl, solo, portrait, school uniform, sailor suit, neat hair, gentle expression',
};

/**
 * Style options for the character generator UI
 */
export const STYLE_OPTIONS = [
  { id: 'anime', label: 'アニメ', labelEn: 'Anime', description: '標準的なアニメ風' },
  { id: 'fantasy', label: 'ファンタジー', labelEn: 'Fantasy', description: '魔法・幻想風' },
  { id: 'cyberpunk', label: 'サイバーパンク', labelEn: 'Cyberpunk', description: '近未来テック風' },
  { id: 'chibi', label: 'ちび', labelEn: 'Chibi', description: 'デフォルメ可愛い風' },
  { id: 'realistic', label: 'リアル', labelEn: 'Realistic', description: 'セミリアル風' },
] as const;
