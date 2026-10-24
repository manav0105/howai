"use node";
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { activitySchema, checkedTopic, generateJSON, validActivity, validVisitor } from './topicContent';

export const repairActivity = internalAction({
  args: { topic: v.string(), visitor: v.string() },
  handler: async (ctx, { topic, visitor }): Promise<any> => {
    if (!validVisitor(visitor)) return { error: 'Invalid visitor' };
    const selected = checkedTopic(topic);
    const row = await ctx.runQuery(internal.topicStore.read, { topic });
    if (!row?.content) return { error: 'Lesson must already exist' };
    try {
      const result = await generateJSON(ctx, visitor, topic,
        `Repair this activity for AI in ${selected.label}: ${JSON.stringify(row.content.activity)}. It must be possible for a complete beginner in 5–10 minutes using only free Gemini text chat on a phone/laptop, with no code execution or other apps. Every step and example must stay ONLY about ${selected.focus}. Give a ready-to-copy SELF-CONTAINED prompt that asks Gemini to CREATE the tiny sample code/data it needs; never refer to missing sample inputs or tell a beginner to provide their own code. For coding, ask for a small broken Python example AND its fix, then compare another explanation. Compare two outputs and manually verify a relevant detail. Title max 5 words; exactly 3 steps max 12 words each; prompt max 25 words; reflection max 8 words. Under 210 tokens total.`,
        activitySchema, validActivity);
      const { onTopic, ...saved } = result;
      const updated = await ctx.runMutation(internal.topicStore.replaceActivity, { topic, version: row.generatedAt!, ...saved });
      return { updated, data: result.data };
    } catch { return { error: 'Gemini could not repair the activity. Please try again later.' }; }
  },
});
