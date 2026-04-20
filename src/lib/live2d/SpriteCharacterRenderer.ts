'use client';

/**
 * SpriteCharacterRenderer - AI生成画像からLive2D風アニメーションキャラクターを構築
 *
 * PixiJSスプライトレイヤーで以下のアニメーションを実現:
 * - 呼吸 (Breathing): Y軸スケールの微妙な振動
 * - 瞬き (Blinking): 開眼/閉眼スプライトのクロスフェード
 * - LookAt: マウス/ジャイロに追従する位置オフセット
 * - 感情 (Emotion): 表情スプライトの切り替え
 * - 体の揺れ (Body Sway): 微小回転振動
 * - 髪の揺れ (Hair Sway): 遅延追従の回転
 *
 * これはpixi-live2d-displayのモデルと同じコンテナに追加可能
 */

import type { CharacterPartImages } from './CharacterGenerator';

// Lazy PIXI import (SSR回避)
let PIXI: any = null;

async function ensurePixi(): Promise<void> {
  if (PIXI) return;
  const mod = await import('pixi.js');
  PIXI = mod;
}

export type SpriteEmotion = 'neutral' | 'joy' | 'sorrow' | 'anger' | 'surprise' | 'relax';

export interface SpriteAnimationState {
  breathAngle: number;
  breathScale: number;
  swayAngle: number;
  hairSwayAngle: number;
  lookAtX: number;
  lookAtY: number;
  isBlinking: boolean;
  currentEmotion: SpriteEmotion;
  emotionTransition: number; // 0-1 for fade
}

export class SpriteCharacterRenderer {
  private container: any = null;
  private sprites: Map<string, any> = new Map();
  private currentEmotionSprite: string = 'base';
  private eyesClosedSprite: any = null;
  private currentEmotion: SpriteEmotion = 'neutral';

  // アニメーション状態
  private breathAngle = 0;
  private swayAngle = 0;
  private hairSwayAngle = 0;
  private lookAtX = 0;
  private lookAtY = 0;
  private targetLookAtX = 0;
  private targetLookAtY = 0;

  // 瞬き
  private isBlinking = false;
  private blinkTimer = 0;
  private nextBlinkTime = 3000;
  private blinkPhase = 0; // 0: open, 1: closing, 2: closed, 3: opening

  // 感情切り替えフェード
  private emotionFadeAlpha = 1;
  private previousEmotionSprite: any = null;

  // 定数
  private readonly BREATH_SPEED = 0.0015;
  private readonly BREATH_AMOUNT = 0.015;
  private readonly SWAY_SPEED = 0.0008;
  private readonly SWAY_AMOUNT = 0.008;
  private readonly HAIR_SWAY_DELAY = 0.92;
  private readonly LOOK_AT_SMOOTHING = 0.08;
  private readonly LOOK_AT_RANGE = 12;
  private readonly BLINK_CLOSE_DURATION = 80;
  private readonly BLINK_CLOSED_DURATION = 60;
  private readonly BLINK_OPEN_DURATION = 100;

  private _isReady = false;
  private _characterId: string | null = null;

  get isReady() { return this._isReady; }
  get characterId() { return this._characterId; }

  /**
   * AI生成画像からスプライトキャラクターを構築
   */
  static async create(
    parts: CharacterPartImages,
    pixiApp: any,
    characterId: string
  ): Promise<SpriteCharacterRenderer> {
    await ensurePixi();

    const renderer = new SpriteCharacterRenderer();
    renderer._characterId = characterId;

    // ルートコンテナ
    renderer.container = new PIXI.Container();
    renderer.container.sortableChildren = true;

    // 各パーツ画像をスプライトとしてロード
    const partMap: Record<string, string> = {
      base: parts.base,
      eyesClosed: parts.eyesClosed,
      joy: parts.joy,
      sorrow: parts.sorrow,
      anger: parts.anger,
      surprise: parts.surprise,
      relax: parts.relax,
    };

    for (const [key, dataUrl] of Object.entries(partMap)) {
      if (!dataUrl) continue;
      try {
        const texture = await PIXI.Texture.fromURL(dataUrl);
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5, 0.5);
        sprite.alpha = 0; // 初期は非表示
        sprite.zIndex = key === 'base' ? 0 : 1;
        renderer.container.addChild(sprite);
        renderer.sprites.set(key, sprite);
      } catch (e) {
        console.error(`Failed to load sprite for part "${key}":`, e);
      }
    }

    // ベーススプライトを表示
    const baseSprite = renderer.sprites.get('base');
    if (baseSprite) {
      baseSprite.alpha = 1;
      baseSprite.zIndex = 0;
    }

    // 閉眼スプライト（瞬き用）はベースの直上
    const eyesClosed = renderer.sprites.get('eyesClosed');
    if (eyesClosed) {
      eyesClosed.zIndex = 1;
      renderer.eyesClosedSprite = eyesClosed;
    }

    // 表情スプライトはzIndex 2
    for (const emotion of ['joy', 'sorrow', 'anger', 'surprise', 'relax']) {
      const sprite = renderer.sprites.get(emotion);
      if (sprite) {
        sprite.zIndex = 2;
      }
    }

    // コンテナをステージに追加してスケール調整
    const screen = pixiApp.screen;
    renderer.container.x = screen.width / 2;
    renderer.container.y = screen.height / 2;

    // ベーススプライトのサイズに基づいてスケール調整
    if (baseSprite) {
      const scaleX = (screen.width * 0.6) / baseSprite.texture.width;
      const scaleY = (screen.height * 0.85) / baseSprite.texture.height;
      const scale = Math.min(scaleX, scaleY, 1.0);
      renderer.container.scale.set(scale);
    }

    pixiApp.stage.addChild(renderer.container);

    renderer._isReady = true;
    return renderer;
  }

  /**
   * 毎フレーム更新 - VividnessSyncManagerから呼び出し
   */
  update(deltaTime: number): void {
    if (!this._isReady || !this.container) return;

    const dt = deltaTime;

    // ===== 呼吸アニメーション =====
    this.breathAngle += this.BREATH_SPEED * dt;
    const breathScale = 1 + Math.sin(this.breathAngle) * this.BREATH_AMOUNT;

    // ===== 体の揺れ =====
    this.swayAngle += this.SWAY_SPEED * dt;
    const swayRotation = Math.sin(this.swayAngle) * this.SWAY_AMOUNT;

    // ===== 髪の揺れ（遅延追従） =====
    const targetHairAngle = swayRotation * 1.5 + this.lookAtX * 0.02;
    this.hairSwayAngle = this.hairSwayAngle * this.HAIR_SWAY_DELAY + targetHairAngle * (1 - this.HAIR_SWAY_DELAY);

    // ===== LookAt スムージング =====
    this.lookAtX += (this.targetLookAtX - this.lookAtX) * this.LOOK_AT_SMOOTHING;
    this.lookAtY += (this.targetLookAtY - this.lookAtY) * this.LOOK_AT_SMOOTHING;

    const offsetX = this.lookAtX * this.LOOK_AT_RANGE;
    const offsetY = this.lookAtY * this.LOOK_AT_RANGE * 0.5;

    // ===== 瞬き =====
    this.updateBlink(dt);

    // ===== コンテナにアニメーションを適用 =====
    this.container.scale.y = breathScale;
    this.container.rotation = swayRotation;
    this.container.x += offsetX * 0.3;
    this.container.y += offsetY * 0.3;

    // LookAtによる個別パーツオフセット
    for (const [key, sprite] of this.sprites) {
      if (!sprite) continue;
      // 頭部パーツはLookAtでわずかに追従
      sprite.x = offsetX * 0.5;
      sprite.y = offsetY * 0.3;
    }

    // ===== 瞬きスプライトのアルファ制御 =====
    if (this.eyesClosedSprite) {
      this.eyesClosedSprite.alpha = this.isBlinking ? 1 : 0;
    }
  }

  /**
   * 瞬きタイミングの更新
   */
  private updateBlink(dt: number): void {
    this.blinkTimer += dt;

    if (!this.isBlinking) {
      if (this.blinkTimer >= this.nextBlinkTime) {
        this.isBlinking = true;
        this.blinkPhase = 1;
        this.blinkTimer = 0;
      }
    } else {
      const totalDuration = this.BLINK_CLOSE_DURATION + this.BLINK_CLOSED_DURATION + this.BLINK_OPEN_DURATION;
      if (this.blinkTimer >= totalDuration) {
        this.isBlinking = false;
        this.blinkPhase = 0;
        this.blinkTimer = 0;
        // 次の瞬きまでのランダム間隔 (2.5s - 5.5s)
        this.nextBlinkTime = 2500 + Math.random() * 3000;
      }
    }
  }

  /**
   * LookAt対象を設定
   */
  setLookAtTarget(x: number, y: number): void {
    this.targetLookAtX = Math.max(-1, Math.min(1, x));
    this.targetLookAtY = Math.max(-1, Math.min(1, y));
  }

  /**
   * 感情を設定（スプライト切り替え + フェード）
   */
  setEmotion(emotion: SpriteEmotion): void {
    if (this.currentEmotion === emotion) return;

    const emotionSpriteMap: Record<SpriteEmotion, string> = {
      neutral: 'base',
      joy: 'joy',
      sorrow: 'sorrow',
      anger: 'anger',
      surprise: 'surprise',
      relax: 'relax',
    };

    const targetKey = emotionSpriteMap[emotion] || 'base';
    if (this.currentEmotionSprite === targetKey) return;

    // 現在の表情をフェードアウト
    const prevSprite = this.sprites.get(this.currentEmotionSprite);
    if (prevSprite && this.currentEmotionSprite !== 'base') {
      this.fadeSprite(prevSprite, 0, 200);
    }

    // 新しい表情をフェードイン
    const nextSprite = this.sprites.get(targetKey);
    if (nextSprite) {
      this.fadeSprite(nextSprite, 1, 200);
    }

    this.currentEmotion = emotion;
    this.currentEmotionSprite = targetKey;
  }

  /**
   * スプライトのアルファフェード
   */
  private fadeSprite(sprite: any, targetAlpha: number, duration: number): void {
    const startAlpha = sprite.alpha;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      sprite.alpha = startAlpha + (targetAlpha - startAlpha) * progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * キャラクターを画面中央にリサイズ
   */
  resize(screenWidth: number, screenHeight: number): void {
    if (!this.container) return;

    this.container.x = screenWidth / 2;
    this.container.y = screenHeight / 2;

    const baseSprite = this.sprites.get('base');
    if (baseSprite) {
      const scaleX = (screenWidth * 0.6) / baseSprite.texture.width;
      const scaleY = (screenHeight * 0.85) / baseSprite.texture.height;
      const scale = Math.min(scaleX, scaleY, 1.0);
      this.container.scale.set(scale);
    }
  }

  /**
   * 現在のアニメーション状態を取得（VividnessState互換）
   */
  getState(): SpriteAnimationState {
    return {
      breathAngle: this.breathAngle,
      breathScale: 1 + Math.sin(this.breathAngle) * this.BREATH_AMOUNT,
      swayAngle: this.swayAngle,
      hairSwayAngle: this.hairSwayAngle,
      lookAtX: this.lookAtX,
      lookAtY: this.lookAtY,
      isBlinking: this.isBlinking,
      currentEmotion: this.currentEmotion,
      emotionTransition: this.emotionFadeAlpha,
    };
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
    this.sprites.clear();
    this.eyesClosedSprite = null;
    this._isReady = false;
    this._characterId = null;
  }
}
