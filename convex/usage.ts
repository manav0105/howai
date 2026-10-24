import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const reserve = internalMutation({
  args: { visitor: v.string() },
  handler: async (ctx, { visitor }) => {
    const day = new Date().toISOString().slice(0, 10);
    const row = await ctx.db.query('dailyUsage').withIndex('by_visitor_day', q => q.eq('visitor', visitor).eq('day', day)).unique();
    if (row && row.calls >= 30) return false;
    if (row) await ctx.db.patch(row._id, { calls: row.calls + 1 });
    else await ctx.db.insert('dailyUsage', { visitor, day, calls: 1 });
    return true;
  },
});
