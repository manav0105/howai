import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  dailyUsage: defineTable({ visitor: v.string(), day: v.string(), calls: v.number() })
    .index('by_visitor_day', ['visitor', 'day']),
});
