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

HOOK MATERIAL: ${ideas.chosen_hook}
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

OPENING LINE (critical):
- HOOK MATERIAL above may still contain {placeholders} like {X} or {topic} — never publish those literally. Replace every placeholder with a real, specific detail pulled from TOPIC, KEY POINTS, or ABOUT UMAIR (a real number, a named tool, a dated timeframe).
- LinkedIn cuts the post to "see more" after roughly the first 210 characters, so the opening line has to be a complete, specific claim on its own — not a scaffold or a throat-clearer like "Let's talk about..." or "I wanted to share...".
- It should read as one of: a contrarian/unpopular claim, a specific number or result stated plainly, a before/after contrast, a direct warning or "stop doing X," a confession of a mistake, or a flat statement of what was built and in how long. Pick whichever fits HOOK MATERIAL best.

LinkedIn FORMAT RULES:
- Short lines (1-2 sentences max per line)
- Add blank line between each point — real whitespace, not a wall of text
- Use minimal emojis (1 max per post)
- 3-5 key insights focused on KNOWLEDGE and VALUE
- Only mention personal apps/projects if directly relevant to the technical topic (max once)
- Do NOT mention city or location
- End with a question to invite discussion
- Total length: 900-1300 characters
- NO hashtags in the body (add 3-5 at the very end)
- If TOPIC references a specific outside article, repo, or source, don't paste its raw URL in the body — just note the link is in the comments. If there's no outside source, ignore this rule.
- Sound like a HUMAN developer sharing knowledge, not promoting themselves

Writing style: Confident, direct, technical but accessible. Focus on teaching, not self-promotion.

Write the full LinkedIn post now:
`;

  const post = await askGemini(prompt);
  return post.trim();
}

// ─────────────────────────────────────────────────────────────────
// LinkedIn humanizer — strips AI-sounding phrasing from the draft
// ─────────────────────────────────────────────────────────────────
async function humanizeLinkedInPost(draft) {
  const prompt = `
Rewrite this LinkedIn post so it reads like a real person wrote it, not an AI. Keep every fact, number, and claim exactly as-is — do not invent or remove information, and do not change the overall length by more than a few characters.

BANNED WORDS/PHRASES (replace with plain language): leverage, seamless, robust, dive into, delve, unlock, unleash, elevate, revolutionize, game-changer, cutting-edge, state-of-the-art, harness the power of, paradigm shift, in today's fast-paced world, it's important to note that, at the end of the day, undeniable, immense, significant, gaining traction, gaining significant traction, growing rapidly, groundbreaking, transformative, explosive growth, skyrocketing, genuinely thrilled, captivating.

UNSUPPORTED CLAIMS: any sentence that just asserts something is big, important, rising, or exciting without a specific number, named example, or concrete detail attached is a red flag. Either cut it, or replace it with the one specific fact that was supposed to prove it. "AI trading is exploding in popularity" is not allowed. "AI trading repos on GitHub have tripled this year" is, if that number is actually in the draft — don't invent one.

OTHER RULES:
- No em dashes (—) and no double hyphens (--) — use a period or comma instead
- No throat-clearing openers ("I wanted to share...", "Let's talk about...")
- No vague hype ("incredible", "mind-blowing", "huge", "exciting") unless it's backed by the specific number or fact already in the draft
- Keep the line breaks and paragraph structure as-is
- Keep the hashtags at the end exactly as-is

DRAFT:
${draft}

Return only the rewritten post, nothing else:
`;

  const humanized = await askGemini(prompt);
  return humanized.trim();
}

// ─────────────────────────────────────────────────────────────────
// Pull any raw URL out of the final post so it can go in the first
// comment instead (LinkedIn suppresses reach on posts with a link)
// ─────────────────────────────────────────────────────────────────
function extractLinkForComment(text) {
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);
  if (!urlMatch) return { body: text, link: null };

  const link = urlMatch[0];
  const body = text
    .replace(link, '')
    .replace(/[ \t]+\n/g, '\n')  // trailing spaces left behind
    .replace(/\n{3,}/g, '\n\n')  // collapse extra blank lines
    .trim();

  return { body, link };
}

// ─────────────────────────────────────────────────────────────────
// Force the post back into the 900-1300 range. The prompt asks for
// this but nothing enforces it — Gemini routinely overshoots, so
// this actually corrects it instead of hoping the instruction held.
// ─────────────────────────────────────────────────────────────────
async function enforceLinkedInLength(text, minLen = 900, maxLen = 1300, maxAttempts = 2) {
  let current = text;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (current.length >= minLen && current.length <= maxLen) {
      return current;
    }

    const overLimit = current.length > maxLen;
    const prompt = overLimit
      ? `This LinkedIn post is ${current.length} characters, over the ${maxLen} limit. Cut it down to ${minLen}-${maxLen} characters. Remove the weakest sentence(s) or tighten wordy lines — don't just chop the end off mid-thought. Keep every fact and number that's left in, keep the line breaks, keep the hashtags at the end exactly as-is. Don't add anything new.\n\nPOST:\n${current}\n\nReturn only the trimmed post, nothing else:`
      : `This LinkedIn post is only ${current.length} characters, under the ${minLen} minimum. Expand it to ${minLen}-${maxLen} characters by adding one more concrete point that fits the topic — a real detail, not filler or repetition of what's already said. Keep the line breaks, keep the hashtags at the end exactly as-is.\n\nPOST:\n${current}\n\nReturn only the expanded post, nothing else:`;

    current = (await askGemini(prompt)).trim();
  }

  if (current.length < minLen || current.length > maxLen) {
    console.warn(`  ⚠️ LinkedIn post still ${current.length} chars after ${maxAttempts} correction attempts, posting as-is`);
  }

  return current;
}

// ─────────────────────────────────────────────────────────────────
// Twitter thread writer
// ─────────────────────────────────────────────────────────────────
async function writeTwitterThread(ideas) {
  const prompt = `
You are writing a Twitter/X thread for ${story.name}, a ${story.title}.

TOPIC: ${ideas.topic}
HOOK: ${ideas.chosen_hook}

STRICT RULES (free API tier - 280 char hard limit per tweet):
- EVERY tweet must be under 240 characters — count carefully!
- Tweet 1: Hook only — short, punchy, NO hashtags, under 240 chars
- Tweets 2-5: One sharp insight per tweet, under 240 chars each
- Tweet 6: CTA + max 2 hashtags, under 240 chars total
- Total: 5-6 tweets ONLY
- Share KNOWLEDGE and VALUE — no self-promotion or location mentions
- Sound like a developer talking to developers

Return ONLY a valid JSON array of strings. No markdown, no explanation:
["tweet1", "tweet2", "tweet3", "tweet4", "tweet5", "tweet6"]
`;

  const response = await askGemini(prompt);
  const match = response.match(/\[[\s\S]*\]/);
  let tweets = [];
  if (match) {
    try {
      tweets = JSON.parse(match[0]);
    } catch (e) {
      tweets = response.split('\n').filter((l) => l.trim().length > 10).slice(0, 6);
    }
  }
  // Hard enforce 275 char limit per tweet (buffer for safety)
  return tweets.map(t => t.length > 275 ? t.substring(0, 272) + '...' : t);
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
  let linkedinPost = await writeLinkedInPost(ideas);
  linkedinPost = await humanizeLinkedInPost(linkedinPost);
  const { body: rawBody, link: linkedinLink } = extractLinkForComment(linkedinPost);
  linkedinPost = await enforceLinkedInLength(rawBody);
  console.log(`  ✓ LinkedIn: ${linkedinPost.length} chars${linkedinLink ? ' + link queued for first comment' : ''}`);

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
    linkedinId = await postToLinkedIn(linkedinPost, linkedinLink);
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