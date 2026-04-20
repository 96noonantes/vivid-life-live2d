import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style } = body as { prompt: string; style?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // Enhance the prompt for anime/Live2D-style character portrait
    const styleMap: Record<string, string> = {
      anime: 'anime art style, Live2D character design, clean lineart, cel-shaded, vibrant colors, front-facing portrait, white background',
      realistic: 'semi-realistic anime style, detailed face, soft lighting, portrait, front-facing, neutral background',
      chibi: 'chibi anime style, cute small character, big eyes, simple design, front-facing portrait, white background',
      fantasy: 'fantasy anime art, magical aura, ornate details, front-facing portrait, ethereal lighting',
      cyberpunk: 'cyberpunk anime style, neon accents, futuristic fashion, front-facing portrait, dark background',
    };

    const stylePrefix = styleMap[style || 'anime'] || styleMap.anime;
    const fullPrompt = `${stylePrefix}, ${prompt.trim()}, high quality, character reference sheet`;

    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: fullPrompt,
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
      prompt: fullPrompt,
    });
  } catch (error: any) {
    console.error('Portrait generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
