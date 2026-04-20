import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/imageGen';

/**
 * POST /api/generate-character
 *
 * キャラクターのパーツ画像を1枚生成する
 * リクエストごとに1パーツを生成し、フロントエンドから並列呼び出しされる
 *
 * Body: { prompt: string, partType: string }
 * Response: { image: string (data URL), prompt: string, partType: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, partType } = body as { prompt: string; partType?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    const result = await generateImage(prompt);

    return NextResponse.json({
      ...result,
      partType: partType || 'unknown',
    });
  } catch (error: any) {
    console.error('Character part generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
