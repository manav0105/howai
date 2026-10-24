import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { cardData, isFresh, lessonData, sourceData } from './topicModel';
import { activityData } from './activityModel';

export const read = internalQuery({
  args: { topic: v.string() },
  handler: async (ctx, { topic }) => await ctx.db.query('topicLessons').withIndex('by_topic', q => q.eq('topic', topic)).unique(),
});
export const claim = internalMutation({
  args: { topic: v.string(), owner: v.string() },
  handler: async (ctx, { topic, owner }) => {
    const row = await ctx.db.query('topicLessons').withIndex('by_topic', q => q.eq('topic', topic)).unique();
    if (row?.content && isFresh(row.generatedAt)) return { status: 'ready' as const, row };
    if (row && row.leaseUntil > Date.now()) return { status: 'pending' as const, row };
    const values = { owner, leaseUntil: Date.now() + 240000 };
    if (row) await ctx.db.patch(row._id, values);
    else await ctx.db.insert('topicLessons', { topic, ...values, sources: [], suggestions: [], ungrounded: true });
    return { status: 'claimed' as const, row };
  },
});
export const finish = internalMutation({
  args: { topic: v.string(), owner: v.string(), result: v.optional(v.object({ content: lessonData, sources: v.array(sourceData), suggestions: v.array(v.string()), ungrounded: v.boolean() })) },
  handler: async (ctx, { topic, owner, result }) => {
    const row = await ctx.db.query('topicLessons').withIndex('by_topic', q => q.eq('topic', topic)).unique();
    if (!row || row.owner !== owner) return null;
    await ctx.db.patch(row._id, { leaseUntil: 0, ...(result ? { ...result, generatedAt: Date.now() } : {}) });
    return await ctx.db.get(row._id);
  },
});
const variantArgs = { topic: v.string(), version: v.number(), index: v.number(), level: v.number() };
export const variant = internalQuery({
  args: variantArgs,
  handler: async (ctx, { topic, version, index, level }) => await ctx.db.query('topicVariants').withIndex('by_card', q => q.eq('topic', topic).eq('version', version).eq('index', index).eq('level', level)).unique(),
});
export const saveVariant = internalMutation({
  args: { ...variantArgs, data: cardData, sources: v.array(sourceData), suggestions: v.array(v.string()), ungrounded: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('topicVariants').withIndex('by_card', q => q.eq('topic', args.topic).eq('version', args.version).eq('index', args.index).eq('level', args.level)).unique();
    if (row) return row;
    // Old variants cannot leak into a newly refreshed topic lesson.
    await ctx.db.insert('topicVariants', args);
    return args;
  },
});

// Administrative repair for a generated activity that referenced missing inputs.
export const replaceActivity = internalMutation({
  args: { topic: v.string(), version: v.number(), data: activityData, sources: v.array(sourceData), suggestions: v.array(v.string()), ungrounded: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('topicLessons').withIndex('by_topic', q => q.eq('topic', args.topic)).unique();
    if (!row?.content || row.generatedAt !== args.version) return false;
    const sources = new Map([...row.sources, ...args.sources].map(s => [s.url, s]));
    await ctx.db.patch(row._id, { content: { ...row.content, activity: args.data }, sources: [...sources.values()], suggestions: [...new Set([...row.suggestions, ...args.suggestions])], ungrounded: row.ungrounded || args.ungrounded });
    return true;
  },
});
