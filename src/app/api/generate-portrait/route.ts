import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/imageGen';

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

    const result = await generateImage(fullPrompt);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Portrait generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
