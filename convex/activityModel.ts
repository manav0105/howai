import { v } from 'convex/values';

export const activityData = v.object({ title: v.string(), steps: v.array(v.string()), prompt: v.string(), reflection: v.string() });
export const lessonKey = 'what-is-ai-v1';
