import { v } from 'convex/values';
import { activityData } from './activityModel';

export const cardData = v.object({ title: v.string(), body: v.string(), example: v.string() });
export const questionData = v.object({ question: v.string(), options: v.array(v.string()), answer: v.number(), explanation: v.string() });
export const sourceData = v.object({ title: v.string(), url: v.string() });
export const lessonData = v.object({ cards: v.array(cardData), questions: v.array(questionData), activity: activityData });
export const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
export function isFresh(generatedAt: number | undefined, now = Date.now()) { return typeof generatedAt === 'number' && now - generatedAt < MAX_AGE; }
