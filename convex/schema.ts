import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { activityData } from './activityModel';
import { cardData, lessonData, sourceData } from './topicModel';

export default defineSchema({
  topicLessons: defineTable({ topic: v.string(), owner: v.string(), leaseUntil: v.number(), generatedAt: v.optional(v.number()), content: v.optional(lessonData), sources: v.array(sourceData), suggestions: v.array(v.string()), ungrounded: v.boolean() }).index('by_topic', ['topic']),
  topicVariants: defineTable({ topic: v.string(), version: v.number(), index: v.number(), level: v.number(), data: cardData, sources: v.array(sourceData), suggestions: v.array(v.string()), ungrounded: v.boolean() }).index('by_card', ['topic', 'version', 'index', 'level']),
  lessonActivities: defineTable({
    lesson: v.string(), owner: v.string(), leaseUntil: v.number(),
    data: v.optional(activityData),
  }).index('by_lesson', ['lesson']),
  cardIllustrations: defineTable({
    index: v.number(), source: v.string(), status: v.union(v.literal('generating'), v.literal('ready'), v.literal('failed')),
    storageId: v.optional(v.id('_storage')), bytes: v.optional(v.number()), width: v.optional(v.number()), height: v.optional(v.number()),
  }).index('by_index', ['index']),
  dailyUsage: defineTable({ visitor: v.string(), day: v.string(), calls: v.number() })
    .index('by_visitor_day', ['visitor', 'day']),
});
