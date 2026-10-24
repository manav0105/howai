import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { activityData, lessonKey } from './activityModel';

export const read = internalQuery({
  args: {},
  handler: async ctx => (await ctx.db.query('lessonActivities').withIndex('by_lesson', q => q.eq('lesson', lessonKey)).unique())?.data ?? null,
});

export const claim = internalMutation({
  args: { owner: v.string() },
  handler: async (ctx, { owner }) => {
    const row = await ctx.db.query('lessonActivities').withIndex('by_lesson', q => q.eq('lesson', lessonKey)).unique();
    if (row?.data) return { status: 'ready' as const, data: row.data };
    if (row && row.leaseUntil > Date.now()) return { status: 'pending' as const };
    const values = { owner, leaseUntil: Date.now() + 60000 };
    if (row) await ctx.db.patch(row._id, values);
    else await ctx.db.insert('lessonActivities', { lesson: lessonKey, ...values });
    return { status: 'claimed' as const };
  },
});

export const finish = internalMutation({
  args: { owner: v.string(), data: v.optional(activityData) },
  handler: async (ctx, { owner, data }) => {
    const row = await ctx.db.query('lessonActivities').withIndex('by_lesson', q => q.eq('lesson', lessonKey)).unique();
    if (row?.data) return row.data;
    if (!row || row.owner !== owner) return null;
    await ctx.db.patch(row._id, { ...(data ? { data } : {}), leaseUntil: 0 });
    return data ?? null;
  },
});
