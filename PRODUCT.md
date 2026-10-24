v1 = one topic (What is AI), AI-generated anime-themed swipeable cards with Next / Didn't get it / Go deeper buttons, then a 3-question quiz. Everything else comes later.

## Roadmap

It will be an app for learning AI for different levels of learners, it adapts to users understanding, they might click next or say didn't get it? and then the lessons will be simplified further or they might say to deep dive and that makes lessons bit harder. There should be buttons for that on the screen. And the lessons should be presented in form of learning cards bite sized generated with AI which they swipe and learn. Learning cards should be anime themed to make learning less boring. if they learn and answer quiz well, they should get badges and move ahead in their learning path. At the end of each lesson, it should recommend hands on short activity that they can go and do easily on their laptop or phone and then come back to the app and say done or ask some help to do the activity if they're stuck, skipping this part button should also be there. Learning progress should be saved. In the beginning, it should give like 15-20 options asking them, what they think they would be using AI for like coding etc, just list most common uses of AI and design learning path according to their selection or they may just explore and learn general purpose tools.

## v1 — done

- Published: https://howai.manavendra-hbti.chatgpt.site
- Five AI-generated cards on What is AI, swipe navigation, Next / Didn't get it / Go deeper, then an AI-generated three-question quiz.
- Mobile-first colours, fonts, SVG mascot and speech bubbles; no image generation.
- Official Google SDK runs only in a Convex action. GEMINI_API_KEY and GEMINI_MODEL are server environment variables. Model: gemini-3.5-flash-lite.
- Each Gemini response is limited to 300 output tokens. Server-side daily usage permits 30 attempts per anonymous browser ID, resetting at midnight UTC. Failed API attempts count too; SDK retries are disabled. With no login, clearing browser storage or using another browser resets the visitor identity.
- Only a visitor ID is kept in browser storage; learning progress and quiz answers are not saved. The server stores daily usage counts, not lessons or quiz answers.
- Verified: production card and quiz generation, build, automated UI interactions including swipes and quiz scoring, and rejection of call 31. No browser is available in this session, so visual/mobile browser checks remain manual.
- No login, badges, onboarding, activities or saved learning progress. The roadmap above remains future work.
