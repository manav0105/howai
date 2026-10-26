import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const claim = internalMutation({
  args: { index: v.number(), source: v.string(), retryFailed: v.optional(v.boolean()) },
  handler: async (ctx, { retryFailed, ...args }) => {
    const row = await ctx.db.query('cardIllustrations').withIndex('by_index', q => q.eq('index', args.index)).unique();
    if (row) {
      if (!retryFailed || row.status !== 'failed') return null;
      await ctx.db.patch(row._id, { status: 'generating', source: args.source });
      return { id: row._id, source: args.source };
    }
    return { id: await ctx.db.insert('cardIllustrations', { ...args, status: 'generating' }), source: args.source };
  },
});

export const finish = internalMutation({
  args: { id: v.id('cardIllustrations'), storageId: v.optional(v.id('_storage')), bytes: v.optional(v.number()), width: v.optional(v.number()), height: v.optional(v.number()) },
  handler: async (ctx, { id, ...image }) => {
    await ctx.db.patch(id, { ...image, status: image.storageId ? 'ready' : 'failed' });
  },
});

export const get = internalQuery({
  args: { index: v.number() },
  handler: async (ctx, { index }) => {
    const row = await ctx.db.query('cardIllustrations').withIndex('by_index', q => q.eq('index', index)).unique();
    return row?.storageId ? await ctx.storage.getUrl(row.storageId) : null;
  },
});

export const report = internalQuery({
  args: {},
  handler: async ctx => await Promise.all((await ctx.db.query('cardIllustrations').collect()).map(async row => ({ index: row.index, source: row.source, status: row.status, bytes: row.bytes ?? 0, width: row.width, height: row.height, url: row.storageId ? await ctx.storage.getUrl(row.storageId) : null }))),
});
