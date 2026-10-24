"use node";

import { GoogleGenAI } from '@google/genai';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const concepts = ['What artificial intelligence means', 'Learning patterns from examples', 'Everyday uses of AI', 'Generative AI creates new content', 'AI can make mistakes: check its answers'];
const cardSchema = { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, example: { type: 'string' } }, required: ['title', 'body', 'example'] };
const quizSchema = { type: 'object', properties: { questions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { question: { type: 'string' }, options: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }, answer: { type: 'integer' }, explanation: { type: 'string' } }, required: ['question', 'options', 'answer', 'explanation'] } } }, required: ['questions'] };

export const generate = action({
  args: { visitor: v.string(), kind: v.union(v.literal('card'), v.literal('quiz')), index: v.number(), level: v.number() },
  handler: async (ctx, args): Promise<any> => {
    if (!/^[a-f0-9-]{36}$/i.test(args.visitor) || !Number.isInteger(args.index) || args.index < 0 || args.index > 4 || !Number.isInteger(args.level) || args.level < -3 || args.level > 3) return { error: 'Invalid lesson request. Please reload and try again.' };
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;
    if (!apiKey) return { error: 'Gemini is not configured: GEMINI_API_KEY is missing on the server.' };
    if (!model) return { error: 'Gemini is not configured: GEMINI_MODEL is missing on the server.' };
    if (!await ctx.runMutation(internal.usage.reserve, { visitor: args.visitor })) return { error: 'You’ve reached 30 AI calls today. Come back after midnight UTC.' };
    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } } });
      const prompt = args.kind === 'quiz'
        ? `Write exactly 3 tiny multiple-choice questions about What is AI, covering these concepts: ${concepts.join('; ')}. Each has 3 short options, zero-based correct answer index, and a very short explanation. Keep the entire JSON under 210 tokens.`
        : `Teach the topic What is AI, card ${args.index + 1} of 5. Focus only on: ${concepts[args.index]}. Difficulty ${args.level} (-3: very simple everyday analogy, 0: beginner, 3: deeper with explained technical terms). Write a fresh explanation at this difficulty. Friendly anime guide voice, accurate science, no assumed anime knowledge. Title under 7 words, body under 65 words, example under 25 words. JSON only.`;
      const response = await ai.models.generateContent({ model, contents: prompt, config: { maxOutputTokens: 300, responseMimeType: 'application/json', responseJsonSchema: args.kind === 'quiz' ? quizSchema : cardSchema } });
      const data = JSON.parse(response.text || '');
      if (args.kind === 'card') {
        if (!['title', 'body', 'example'].every(k => typeof data[k] === 'string' && data[k].trim().length && data[k].length < 1200)) throw new Error('Invalid card');
      } else if (!Array.isArray(data.questions) || data.questions.length !== 3 || !data.questions.every((q: any) => typeof q.question === 'string' && typeof q.explanation === 'string' && Array.isArray(q.options) && q.options.length === 3 && q.options.every((s: any) => typeof s === 'string') && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3)) throw new Error('Invalid quiz');
      if (args.kind === 'card') {
        try { data.imageUrl = await ctx.runQuery(internal.illustrationStore.get, { index: args.index }); }
        catch { data.imageUrl = null; }
      }
      return { data };
    } catch {
      // Never return or log SDK errors: they may contain request credentials.
      return { error: 'Gemini could not generate this right now. Check the server key, model access and quota, then try again.' };
    }
  },
});
