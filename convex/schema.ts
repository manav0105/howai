import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  cardIllustrations: defineTable({
    index: v.number(), source: v.string(), status: v.union(v.literal('generating'), v.literal('ready'), v.literal('failed')),
    storageId: v.optional(v.id('_storage')), bytes: v.optional(v.number()), width: v.optional(v.number()), height: v.optional(v.number()),
  }).index('by_index', ['index']),
  dailyUsage: defineTable({ visitor: v.string(), day: v.string(), calls: v.number() })
    .index('by_visitor_day', ['visitor', 'day']),
});
