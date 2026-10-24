"use node";
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { cardSchema, ensureLesson, generateJSON, lessonMetadata, mergeReferences, OUTDATED, validCard, validVisitor } from './topicContent';

export const generate = action({
  args: { visitor: v.string(), topic: v.optional(v.string()), kind: v.union(v.literal('card'), v.literal('quiz')), index: v.number(), level: v.number() },
  handler: async (ctx, args): Promise<any> => {
    const topic = args.topic ?? 'general-ai';
    if (!validVisitor(args.visitor) || !Number.isInteger(args.index) || args.index < 0 || args.index > 4 || !Number.isInteger(args.level) || args.level < -3 || args.level > 3) return { error: 'Invalid lesson request. Please reload and try again.' };
    try {
      const result = await ensureLesson(ctx, args.visitor, topic);
      if (result.error) return result;
      const row = result.row;
      let metadata = lessonMetadata(row, result.warning);
      if (args.kind === 'quiz') return { data: { questions: row.content.questions }, metadata };
      let data = row.content.cards[args.index];
      if (args.level !== 0) {
        const key = { topic, version: row.generatedAt, index: args.index, level: args.level };
        let variant = await ctx.runQuery(internal.topicStore.variant, key);
        if (!variant) {
          const generated = await generateJSON(ctx, args.visitor, topic, `Rewrite ONLY this selected-topic card: ${JSON.stringify(data)}. Difficulty ${args.level} (-3: simplest everyday explanation, 3: deep with explained technical terms). Preserve the exact topic, skill, example situation and facts; do not introduce another subject. Title under 7 words, body under 55, example under 20.`, cardSchema, validCard);
          const { onTopic, ...cached } = generated;
          variant = await ctx.runMutation(internal.topicStore.saveVariant, { ...key, ...cached });
        }
        data = variant.data;
        metadata = { ...metadata, ...mergeReferences([row, variant]), warning: metadata.warning || (variant.ungrounded ? OUTDATED : null) };
      }
      let imageUrl = null;
      if (topic === 'general-ai') {
        try { imageUrl = await ctx.runQuery(internal.illustrationStore.get, { index: args.index }); } catch { /* Text-only fallback. */ }
      }
      return { data: { ...data, imageUrl }, metadata };
    } catch { return { error: 'Gemini could not prepare this topic card. Please try again. Check the server key, model access and quota if this continues.' }; }
  },
});
