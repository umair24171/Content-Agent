/**
 * IDEATOR AGENT
 * Takes top topics from Researcher
 * Deep researches each topic
 * Picks 1 topic and generates post angles for all 3 platforms
 */

import { askGemini, askGeminiJSON } from '../utils/gemini.js';
import { appendRow, getLastRows } from '../utils/sheets.js';
import { notifyDiscord } from '../utils/discord.js';
import { readFileSync } from 'fs';

const story = JSON.parse(readFileSync('./data/your-story.json', 'utf-8'));
const hooksData = JSON.parse(readFileSync('./data/hooks.json', 'utf-8'));

async function runIdeator(topics = null, runLabel = 'morning') {
  console.log(`\n💡 IDEATOR AGENT STARTING [${runLabel.toUpperCase()}]`);
  console.log('='.repeat(50));

  // If no topics passed, get from sheets
  if (!topics || topics.length === 0) {
    console.log('📊 Loading topics from Google Sheets...');
    const rows = await getLastRows('topics', 10);
    topics = rows
      .filter((r) => r[8] === 'pending' || !r[8]) // status = pending
      .slice(0, 5)
      .map((r) => ({
        topic: r[2],
        score: parseInt(r[3]) || 70,
        angle: r[5],
        why_trending: r[6],
        content_type: r[7],
      }));
  }

  if (topics.length === 0) {
    console.log('⚠️ No topics found, using fallback');
    topics = [
      { topic: 'AI Agents in 2025', angle: 'Built 4 trading agents myself', score: 85, content_type: 'story' },
    ];
  }

  // Pick the best topic for this run
  const bestTopic = topics.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  console.log(`\n🎯 Selected topic: "${bestTopic.topic}" (score: ${bestTopic.score})`);

  // Pick a hook that fits
  const availableHooks = hooksData.hooks;
  const randomHooks = availableHooks.sort(() => 0.5 - Math.random()).slice(0, 10);

  const ideationPrompt = `
You are a content strategist for ${story.name}.

ABOUT UMAIR:
- ${story.title}
- ${story.experience} experience, shipped ${story.apps_shipped}
- Key apps: ${story.apps.map((a) => `${a.name} (${a.description})`).join(', ')}
- Unique angles: ${story.unique_angles.join(', ')}
- Location: ${story.location}

TODAY'S TOPIC: "${bestTopic.topic}"
WHY TRENDING: ${bestTopic.why_trending || 'Hot in tech community right now'}
UMAIR'S ANGLE: ${bestTopic.angle || 'Personal experience'}
CONTENT TYPE: ${bestTopic.content_type || 'story'}

AVAILABLE HOOKS (pick the best one):
${randomHooks.slice(0, 8).join('\n')}

Generate content ideas for all 3 platforms:

Return JSON:
{
  "topic": "${bestTopic.topic}",
  "chosen_hook": "exact hook text chosen from the list above",
  "hook_reason": "why this hook fits",
  "linkedin": {
    "angle": "specific angle for LinkedIn professional audience",
    "key_points": ["point 1", "point 2", "point 3", "point 4"],
    "personal_connection": "how Umair personally connects to this (reference his real apps/projects)",
    "cta": "call to action for the post"
  },
  "twitter": {
    "thread_concept": "tweet 1 hook / opening",
    "thread_points": ["tweet 2 point", "tweet 3 point", "tweet 4 point", "tweet 5 point"],
    "closing_tweet": "final tweet with CTA"
  },
  "instagram": {
    "caption_angle": "angle for Instagram - more visual/lifestyle",
    "story_hook": "opening line",
    "key_message": "main message in 2-3 sentences"
  }
}
`;

  console.log('\n🤖 Generating ideas with Gemini...');
  let ideas;
  try {
    ideas = await askGeminiJSON(ideationPrompt);
    console.log('  ✓ Ideas generated');
  } catch (e) {
    console.error('  ❌ Gemini ideation failed:', e.message);
    ideas = {
      topic: bestTopic.topic,
      chosen_hook: availableHooks[0],
      hook_reason: 'Fallback',
      linkedin: {
        angle: bestTopic.angle || bestTopic.topic,
        key_points: ['Key insight 1', 'Key insight 2', 'Key insight 3'],
        personal_connection: 'From my experience building Flutter apps',
        cta: 'What has been your experience? Drop a comment.',
      },
      twitter: {
        thread_concept: `Hot take on ${bestTopic.topic}:`,
        thread_points: ['Point 1', 'Point 2', 'Point 3'],
        closing_tweet: 'Follow for more Flutter & AI content.',
      },
      instagram: {
        caption_angle: bestTopic.topic,
        story_hook: `Talking about ${bestTopic.topic} today`,
        key_message: bestTopic.angle || '',
      },
    };
  }

  // Save to sheets
  console.log('\n💾 Saving ideas to Google Sheets...');
  await appendRow('posts', [
    new Date().toISOString(),
    runLabel,
    ideas.topic,
    ideas.chosen_hook,
    JSON.stringify(ideas.linkedin),
    JSON.stringify(ideas.twitter),
    JSON.stringify(ideas.instagram),
    'ideated', // status
    '', // linkedin_post_id (filled later)
    '', // twitter_id
    '', // instagram_saved
  ]);

  await notifyDiscord(
    `💡 **Ideator done [${runLabel}]**\nTopic: **${ideas.topic}**\nHook: "${ideas.chosen_hook?.substring(0, 80)}..."`
  );

  console.log(`\n✅ IDEATOR COMPLETE`);
  console.log(`Topic: ${ideas.topic}`);
  console.log(`Hook: ${ideas.chosen_hook?.substring(0, 80)}...`);

  return ideas;
}

const isMain = process.argv[1].includes('ideator');
if (isMain) {
  const runLabel = process.argv[2] || 'morning';
  runIdeator(null, runLabel).catch(console.error);
}

export { runIdeator };
