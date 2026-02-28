/**
 * SCRIPTER AGENT
 * Takes ideas from Ideator
 * Writes full LinkedIn post, Twitter thread, and Instagram caption
 * Posts to LinkedIn and Twitter, saves Instagram to Sheets
 */

import { askGemini } from '../utils/gemini.js';
import { appendRow, getLastRows } from '../utils/sheets.js';
import { postToLinkedIn } from '../utils/linkedin.js';
import { postThread } from '../utils/twitter.js';
import { notifyDiscord } from '../utils/discord.js';
import { readFileSync } from 'fs';

const story = JSON.parse(readFileSync('./data/your-story.json', 'utf-8'));
const hooksData = JSON.parse(readFileSync('./data/hooks.json', 'utf-8'));
const { platform_formats } = hooksData;

// ─────────────────────────────────────────────────────────────────
// LinkedIn post writer
// ─────────────────────────────────────────────────────────────────
async function writeLinkedInPost(ideas) {
  const { linkedin } = ideas;
  const prompt = `
You are writing a LinkedIn post for ${story.name}, ${story.title} from Pakistan.

HOOK: ${ideas.chosen_hook}
TOPIC: ${ideas.topic}
ANGLE: ${linkedin.angle}
KEY POINTS: ${linkedin.key_points.join(', ')}
PERSONAL CONNECTION: ${linkedin.personal_connection}
CTA: ${linkedin.cta}

ABOUT UMAIR (use these real details naturally):
- Shipped 15+ apps to App Store & Google Play
- Built Muslifie: Muslim travel marketplace, live on both stores
- Built FarahGPT: AI Islamic app with 2100+ active users
- Built automated gold trading bots trained on 1.44 million candles
- Senior Flutter developer, 3+ years, based in Multan, Pakistan
- Works with Flutter, Node.js, MongoDB, Firebase, AI integrations

LinkedIn FORMAT RULES:
- Start with the HOOK (grab attention in first line)
- Short lines (1-2 sentences max per line)
- Add blank line between each point
- Use minimal emojis (1-2 per section max)
- 3-5 key insights/bullet points
- Personal story or specific example from Umair's real experience
- End with the CTA as a question to invite comments
- Total length: 800-1200 characters
- NO hashtags in the body (add 3-5 at the very end)
- Sound like a HUMAN, not corporate AI

Writing style: Confident, direct, technical but accessible. Umair's voice is honest and builder-focused.

Write the full LinkedIn post now:
`;

  const post = await askGemini(prompt);
  return post.trim();
}

// ─────────────────────────────────────────────────────────────────
// Twitter thread writer
// ─────────────────────────────────────────────────────────────────
async function writeTwitterThread(ideas) {
  const { twitter } = ideas;
  const prompt = `
You are writing a Twitter/X thread for ${story.name}, a Flutter developer & indie hacker from Pakistan.

TOPIC: ${ideas.topic}
HOOK: ${ideas.chosen_hook}
THREAD CONCEPT: ${twitter.thread_concept}
KEY POINTS: ${twitter.thread_points.join(', ')}
CLOSING: ${twitter.closing_tweet}

RULES:
- Tweet 1: Hook + shocking statement (max 240 chars, NO hashtags)
- Tweets 2-6: One insight per tweet, punchy, direct (max 265 chars each)
- Tweet 7: Closing with CTA + 2-3 hashtags max
- Total: 6-8 tweets
- Sound like a real developer, not marketing copy
- Reference real numbers when possible (15 apps, 2100 users, 1.44M candles, etc.)

Return ONLY a JSON array of tweet strings:
["tweet 1 text", "tweet 2 text", "tweet 3 text", ...]
`;

  const response = await askGemini(prompt);
  // Parse the JSON array from response
  const match = response.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      // fallback: split by newlines
    }
  }
  // Fallback: split response into tweets
  return response.split('\n').filter((l) => l.trim().length > 10).slice(0, 7);
}

// ─────────────────────────────────────────────────────────────────
// Instagram caption writer
// ─────────────────────────────────────────────────────────────────
async function writeInstagramCaption(ideas) {
  const { instagram } = ideas;
  const prompt = `
Write an Instagram caption for Umair Bilal, Flutter developer from Pakistan.

TOPIC: ${ideas.topic}
ANGLE: ${instagram.caption_angle}
HOOK: ${instagram.story_hook}
KEY MESSAGE: ${instagram.key_message}

RULES:
- Start with emoji + hook (first line is CRUCIAL - it's the preview)
- 150-250 words
- Conversational, inspiring, builder mindset
- Personal story/number from Umair's experience
- End with question or invitation
- Add line break then 20 relevant hashtags:
${platform_formats.instagram.hashtags.join(' ')} #FlutterDeveloper #AppDev #BuildInPublic #IndieHacker #AITools #Automation

Write the full Instagram caption:
`;

  const caption = await askGemini(prompt);
  return caption.trim();
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCRIPTER
// ─────────────────────────────────────────────────────────────────
async function runScripter(ideas = null, runLabel = 'morning') {
  console.log(`\n✍️ SCRIPTER AGENT STARTING [${runLabel.toUpperCase()}]`);
  console.log('='.repeat(50));

  // Load ideas from sheets if not provided
  if (!ideas) {
    console.log('📊 Loading latest ideas from Google Sheets...');
    const rows = await getLastRows('posts', 5);
    const pendingRow = rows.reverse().find((r) => r[7] === 'ideated');
    if (pendingRow) {
      ideas = {
        topic: pendingRow[2],
        chosen_hook: pendingRow[3],
        linkedin: JSON.parse(pendingRow[4] || '{}'),
        twitter: JSON.parse(pendingRow[5] || '{}'),
        instagram: JSON.parse(pendingRow[6] || '{}'),
      };
    }
  }

  if (!ideas) {
    throw new Error('No ideas found. Run ideator first.');
  }

  console.log(`\n📝 Writing content for: "${ideas.topic}"`);

  // Write all 3 platform posts
  console.log('\n🔵 Writing LinkedIn post...');
  const linkedinPost = await writeLinkedInPost(ideas);
  console.log(`  ✓ LinkedIn: ${linkedinPost.length} chars`);

  console.log('\n🐦 Writing Twitter thread...');
  const twitterThread = await writeTwitterThread(ideas);
  console.log(`  ✓ Twitter: ${twitterThread.length} tweets`);

  console.log('\n📸 Writing Instagram caption...');
  const instagramCaption = await writeInstagramCaption(ideas);
  console.log(`  ✓ Instagram: ${instagramCaption.length} chars`);

  // Post to platforms
  console.log('\n🚀 Posting to platforms...');

  let linkedinId = null;
  let twitterId = null;

  // LinkedIn
  try {
    linkedinId = await postToLinkedIn(linkedinPost);
  } catch (e) {
    console.error('  ❌ LinkedIn failed:', e.message);
  }

  // Twitter
  try {
    twitterId = await postThread(twitterThread);
  } catch (e) {
    console.error('  ❌ Twitter failed:', e.message);
  }

  // Instagram: Save to sheets (can't auto-post without Meta Business verification)
  // Use Buffer free tier or manually copy from sheets
  const instagramSaved = true;

  // Save final content to sheets
  await appendRow('posts', [
    new Date().toISOString(),
    runLabel,
    ideas.topic,
    ideas.chosen_hook,
    linkedinPost,
    twitterThread.join('\n---\n'),
    instagramCaption,
    'posted',
    linkedinId || 'failed',
    twitterId || 'failed',
    instagramSaved ? 'saved_to_sheets' : 'failed',
  ]);

  // Print to console (useful for manual posting)
  console.log('\n' + '='.repeat(60));
  console.log('📋 CONTENT PREVIEW');
  console.log('='.repeat(60));
  console.log('\n🔵 LINKEDIN POST:');
  console.log(linkedinPost);
  console.log('\n🐦 TWITTER THREAD:');
  twitterThread.forEach((t, i) => console.log(`[${i + 1}] ${t}`));
  console.log('\n📸 INSTAGRAM CAPTION:');
  console.log(instagramCaption);
  console.log('='.repeat(60));

  await notifyDiscord(
    `✍️ **Scripter done [${runLabel}]**\n` +
      `Topic: **${ideas.topic}**\n` +
      `LinkedIn: ${linkedinId ? '✅ Posted' : '❌ Failed/Manual needed'}\n` +
      `Twitter: ${twitterId ? '✅ Posted' : '❌ Failed/Manual needed'}\n` +
      `Instagram: 📋 Saved to Google Sheets\n\n` +
      `**LinkedIn preview:**\n${linkedinPost.substring(0, 200)}...`
  );

  console.log('\n✅ SCRIPTER COMPLETE');
  return { linkedinPost, twitterThread, instagramCaption };
}

const isMain = process.argv[1].includes('scripter');
if (isMain) {
  const runLabel = process.argv[2] || 'morning';
  runScripter(null, runLabel).catch(console.error);
}

export { runScripter };
