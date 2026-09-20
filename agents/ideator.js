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
      { topic: 'AI Agents in 2026', angle: 'What actually breaks when agents go from demo to production', score: 85, content_type: 'story' },
    ];
  }

  // Pick the best topic for this run
  const bestTopic = topics.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  console.log(`\n🎯 Selected topic: "${bestTopic.topic}" (score: ${bestTopic.score})`);

  // Pick a hook that fits
  const availableHooks = hooksData.hooks;
  const randomHooks = availableHooks.sort(() => 0.5 - Math.random()).slice(0, 10);

  const isHumor = bestTopic.content_type === 'humor';

  const ideationPrompt = `
You are a content strategist working with a developer's account. Background context (for your own grounding only — do not build the post around this): Flutter and Node.js developer, works with AI integrations, based in Pakistan.

TODAY'S TOPIC: "${bestTopic.topic}"
WHY TRENDING: ${bestTopic.why_trending || 'Hot in tech community right now'}
HOOK/ANGLE: ${bestTopic.angle || 'Interesting technical angle'}
CONTENT TYPE: ${bestTopic.content_type || 'story'}

AVAILABLE HOOKS (pick the best one):
${randomHooks.slice(0, 8).join('\n')}

${isHumor
  ? `This is a HUMOR topic — corporate/workplace comedy (HR-speak, CEO buzzwords, layoffs, meeting culture, management absurdity). Build the angle and key_points as comedic beats leading to a punchline, not technical teaching points. If HOOK/ANGLE references a real company, CEO, or event, base everything on what's actually in HOOK/ANGLE — never invent a quote or claim. Punch at the situation, not at any individual personally.`
  : `Default to writing as a knowledgeable developer commenting on the topic itself — NOT as a personal story about apps built, users gained, or years of experience.`}
Only fill in "personal_connection" if there's a genuinely specific, non-generic tie-in to hands-on experience that makes the post stronger; if not, leave it as an empty string. Most ideas should have it empty.

Return JSON:
{
  "topic": "${bestTopic.topic}",
  "content_type": "${bestTopic.content_type || 'story'}",
  "chosen_hook": "exact hook text chosen from the list above",
  "hook_reason": "why this hook fits",
  "linkedin": {
    "angle": "specific angle for LinkedIn professional audience, built on the topic itself",
    "key_points": ["point 1", "point 2", "point 3", "point 4"],
    "personal_connection": "leave empty unless there's a genuinely specific reason to include it",
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
      content_type: bestTopic.content_type || 'story',
      chosen_hook: availableHooks[0],
      hook_reason: 'Fallback',
      linkedin: {
        angle: bestTopic.angle || bestTopic.topic,
        key_points: ['Key insight 1', 'Key insight 2', 'Key insight 3'],
        personal_connection: '',
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
    ideas.content_type || 'story',
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