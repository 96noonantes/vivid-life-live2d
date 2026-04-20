'use client';

/**
 * CharacterGenerator - AI画像生成でLive2Dパーツ画像を生成するパイプライン
 *
 * プロンプトから以下のパーツ画像を生成:
 * 1. ベース（ニュートラル表情の全身像）
 * 2. 閉眼（瞬き用）
 * 3. 喜び表情
 * 4. 悲しみ表情
 * 5. 怒り表情
 * 6. 驚き表情
 * 7. リラックス表情
 *
 * 各パーツはLive2Dの構造を意識したプロンプトで生成され、
 * SpriteCharacterRendererでレイヤー化アニメーション可能
 */

export interface CharacterPartImages {
  base: string;          // ニュートラル表情（ベース画像）
  eyesClosed: string;    // 閉眼（瞬き用）
  joy: string;           // 喜び表情
  sorrow: string;        // 悲しみ表情
  anger: string;         // 怒り表情
  surprise: string;      // 驚き表情
  relax: string;         // リラックス表情
}

export interface GeneratedCharacterData {
  id: string;
  name: string;
  prompt: string;
  style: string;
  parts: CharacterPartImages;
  createdAt: number;
  /** 生成に使用した各パーツのプロンプト */
  partPrompts: Record<keyof CharacterPartImages, string>;
}

export type GenerationProgress = {
  stage: string;
  current: number;
  total: number;
  percentage: number;
};

export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Live2Dパーツを意識したプロンプト構築
 * 各表情バリアントの画像を一貫性のあるキャラクターデザインで生成する
 */
export class CharacterGenerator {

  /**
   * ベースキャラクターのプロンプトを構築
   * Live2D互換の正面立ち絵を指定
   */
  static buildBasePrompt(userPrompt: string, style: string): string {
    const stylePrefix = CharacterGenerator.getStylePrefix(style);
    return [
      stylePrefix,
      userPrompt.trim(),
      'front-facing full body portrait,',
      'Live2D character design, clean lineart, cel-shaded,',
      'clear parts separation: head, eyes, mouth, hair, body, outfit,',
      'symmetrical face, centered composition,',
      'transparent background, high quality, detailed',
    ].join(' ');
  }

  /**
   * 表情バリアントのプロンプトを構築
   * ベースキャラクターと同一デザインで表情のみ変更
   */
  static buildExpressionPrompt(
    userPrompt: string,
    style: string,
    expression: keyof CharacterPartImages
  ): string {
    const stylePrefix = CharacterGenerator.getStylePrefix(style);
    const expressionMap: Record<string, string> = {
      base: 'neutral calm expression, gentle closed mouth, relaxed eyes',
      eyesClosed: 'eyes completely closed, peaceful sleeping expression, gentle smile, same character design',
      joy: 'happy smiling expression, bright open eyes, wide smile showing teeth, raised cheeks, sparkling eyes',
      sorrow: 'sad crying expression, teary downcast eyes, slightly open downturned mouth, drooping eyebrows',
      anger: 'angry furious expression, sharp narrowed eyes, gritted teeth, furrowed eyebrows, intense gaze',
      surprise: 'surprised shocked expression, wide open eyes, small open round mouth, raised eyebrows',
      relax: 'relaxed peaceful expression, half-closed content eyes, gentle soft smile, serene face',
    };

    return [
      stylePrefix,
      userPrompt.trim(),
      'front-facing full body portrait,',
      'Live2D character design, clean lineart, cel-shaded,',
      expressionMap[expression] || expressionMap.base,
      'same character design as reference, consistent appearance,',
      'symmetrical face, centered composition,',
      'transparent background, high quality, detailed',
    ].join(' ');
  }

  /**
   * スタイルプレフィックスを取得
   */
  static getStylePrefix(style: string): string {
    const styleMap: Record<string, string> = {
      anime: 'anime art style, Japanese anime aesthetic, vibrant colors,',
      fantasy: 'fantasy anime art, magical aura, ornate details, ethereal lighting,',
      cyberpunk: 'cyberpunk anime style, neon accents, futuristic fashion, dark atmosphere,',
      chibi: 'chibi anime style, cute small character, big head, small body, kawaii, simple design,',
      realistic: 'semi-realistic anime style, detailed rendering, soft lighting, natural proportions,',
    };
    return styleMap[style] || styleMap.anime;
  }

  /**
   * 全パーツ画像を並列生成
   */
  static async generateAllParts(
    userPrompt: string,
    style: string,
    onProgress?: ProgressCallback
  ): Promise<GeneratedCharacterData> {
    const partKeys: (keyof CharacterPartImages)[] = [
      'base', 'eyesClosed', 'joy', 'sorrow', 'anger', 'surprise', 'relax'
    ];

    const total = partKeys.length;
    let completed = 0;

    const partPrompts: Record<string, string> = {};
    const parts: Record<string, string> = {};

    // Build all prompts first
    for (const key of partKeys) {
      partPrompts[key] = CharacterGenerator.buildExpressionPrompt(userPrompt, style, key);
    }

    onProgress?.({
      stage: '画像生成を開始しています...',
      current: 0,
      total,
      percentage: 0,
    });

    // Generate all parts in parallel (2 concurrent to avoid API rate limits)
    const batchSize = 2;
    for (let i = 0; i < partKeys.length; i += batchSize) {
      const batch = partKeys.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (key) => {
          try {
            const response = await fetch('/api/generate-character', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: partPrompts[key],
                partType: key,
              }),
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            return { key, image: data.image };
          } catch (error) {
            console.error(`Failed to generate part "${key}":`, error);
            // フォールバック: ベース画像を再利用
            return { key, image: null };
          }
        })
      );

      for (const result of results) {
        completed++;
        if (result.image) {
          parts[result.key] = result.image;
        }
        onProgress?.({
          stage: `パーツ生成中... (${completed}/${total})`,
          current: completed,
          total,
          percentage: Math.round((completed / total) * 100),
        });
      }
    }

    // フォールバック: 欠落したパーツはベース画像で代用
    if (!parts.base) {
      throw new Error('ベース画像の生成に失敗しました');
    }
    for (const key of partKeys) {
      if (!parts[key]) {
        parts[key] = parts.base;
      }
    }

    return {
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Generated Character',
      prompt: userPrompt,
      style,
      parts: parts as CharacterPartImages,
      createdAt: Date.now(),
      partPrompts: partPrompts as Record<keyof CharacterPartImages, string>,
    };
  }
}
