"use node";

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

// Administrator-only preparation. Visitor lesson actions never generate images.
export const generateOnce = internalAction({
  args: { index: v.number(), source: v.string(), retryFailed: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<{ status: string, bytes?: number, code?: number }> => {
    if (!Number.isInteger(args.index) || args.index < 0 || args.index > 4 || !args.source.trim() || args.source.length > 1200) throw new Error('Invalid illustration source');
    const claim = await ctx.runMutation(internal.illustrationStore.claim, args);
    if (!claim) return { status: 'already-attempted' };
    const { id, source } = claim;
    let storageId;
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('Missing image key');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 120000, retryOptions: { attempts: 1 } } });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Create one soft anime educational illustration of this exact scene: ${source}\nMatch a friendly cream and lavender learning app: warm cream #fff6df, pale lavender #c4afff, muted purple #b296f7, dark plum outlines #30234d, tiny blush accents. Soft cel shading, gentle light, simple clean composition, landscape 4:3. The guide Kiko is a tiny cream cat-like mascot with lavender triangular ears and hair tuft, large dark oval eyes and blush cheeks; include only if natural to the scene. NO text, letters, numbers, captions, watermarks, logos or readable screen interfaces. Depict the idea visually with unbranded objects.`,
        config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:3' } },
      });
      const image = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data)?.inlineData;
      if (!image?.data) throw new Error('No image returned');
      const input = Buffer.from(image.data, 'base64');
      let output;
      for (const quality of [80, 65, 50, 35]) {
        output = await sharp(input).rotate().resize({ width: 768, withoutEnlargement: true }).webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
        if (output.data.byteLength < 200000) break;
      }
      if (!output || output.data.byteLength >= 200000 || output.info.width > 768) throw new Error('Image exceeds size limit');
      storageId = await ctx.storage.store(new Blob([new Uint8Array(output.data)], { type: 'image/webp' }));
      await ctx.runMutation(internal.illustrationStore.finish, { id, storageId, bytes: output.data.byteLength, width: output.info.width, height: output.info.height });
      return { status: 'ready', bytes: output.data.byteLength };
    } catch (error) {
      if (storageId) await ctx.storage.delete(storageId);
      await ctx.runMutation(internal.illustrationStore.finish, { id });
      // Fail closed without exposing SDK errors or credentials, or retrying on visits.
      return { status: 'failed', code: typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : undefined };
    }
  },
});
