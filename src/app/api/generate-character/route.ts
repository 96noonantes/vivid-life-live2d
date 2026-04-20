import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: '864x1152',
    });

    const imageBase64 = response.data[0]?.base64;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: `data:image/png;base64,${imageBase64}`,
      prompt: prompt.trim(),
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
