export const topics = [
  { id: 'general-ai', label: 'General AI', focus: 'What AI is, patterns, generative AI, everyday examples, and checking errors' },
  { id: 'coding', label: 'Coding', focus: 'AI for understanding code, writing small snippets, debugging and verifying code safely' },
  { id: 'writing', label: 'Writing', focus: 'AI for drafting, editing, tone and revising written text' },
  { id: 'spreadsheets', label: 'Excel and spreadsheets', focus: 'AI for Excel and spreadsheet formulas, cleaning tables and checking cell results' },
  { id: 'research', label: 'Research and studying', focus: 'AI for study explanations, research questions, checking evidence and reliable citations' },
  { id: 'image-design', label: 'Image design', focus: 'AI for visual briefs, image prompts, composition and reviewing image designs' },
  { id: 'video', label: 'Video', focus: 'AI for short video scripts, storyboards, shot lists and editing plans' },
  { id: 'marketing', label: 'Marketing', focus: 'AI for audience research, campaign messaging and evaluating marketing claims' },
  { id: 'content-creation', label: 'Content creation', focus: 'AI for planning, drafting and adapting creator posts and content calendars' },
  { id: 'business', label: 'Business', focus: 'AI for small business planning, customer needs and comparing business ideas' },
  { id: 'data-analysis', label: 'Data analysis', focus: 'AI for exploring small datasets, descriptive statistics, interpreting charts and checking calculations' },
  { id: 'productivity', label: 'Productivity', focus: 'AI for task prioritization, planning a day, summarizing notes and organizing work' },
  { id: 'career', label: 'Career', focus: 'AI for resume editing, interview practice and career exploration without invented credentials' },
  { id: 'finance', label: 'Finance', focus: 'AI for financial literacy, fictional budgets and checking basic arithmetic; no personalized investment, tax or financial advice' },
  { id: 'customer-support', label: 'Customer support', focus: 'AI for answering customer questions, empathy, support response drafting and escalation' },
  { id: 'automation', label: 'Automation', focus: 'AI for mapping repeatable workflows, triggers, actions, human review and safe automation plans' },
];

export function findTopic(id) { return topics.find(topic => topic.id === id); }
