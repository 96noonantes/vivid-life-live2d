import ZAI from 'z-ai-web-dev-sdk';

/**
 * 共通AI画像生成ユーティリティ
 * [修正 #7] DRY原則: generate-character と generate-portrait の重複を排除
 */

export interface ImageGenResult {
  image: string;  // data:image/png;base64,...
  prompt: string;
}

/**
 * z-ai-web-dev-sdkで画像を1枚生成する
 */
export async function generateImage(prompt: string): Promise<ImageGenResult> {
  const zai = await ZAI.create();

  const response = await zai.images.generations.create({
    prompt: prompt.trim(),
    size: '864x1152',
  });

  const imageBase64 = response.data[0]?.base64;

  if (!imageBase64) {
    throw new Error('Failed to generate image: no data returned from API');
  }

  return {
    image: `data:image/png;base64,${imageBase64}`,
    prompt: prompt.trim(),
  };
}
