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
  const isHumor = ideas.content_type === 'humor';
  const personalLine = linkedin.personal_connection && linkedin.personal_connection.trim()
    ? `PERSONAL CONNECTION (use only if it strengthens the post — one clause, not a resume): ${linkedin.personal_connection}`
    : 'PERSONAL CONNECTION: none — do not invent one.';

  const prompt = isHumor ? `
You are writing a funny, relatable LinkedIn post about corporate/workplace life.

HOOK MATERIAL: ${ideas.chosen_hook}
TOPIC: ${ideas.topic}
ANGLE: ${linkedin.angle}
BEATS: ${linkedin.key_points.join(', ')}
${personalLine}

This is a HUMOR post — the kind that mocks HR-speak, CEO buzzwords, layoff announcements, meeting culture, or company policy, in the style of posts that actually go viral for being funny and true. Not a "5 lessons I learned" post.

RULES:
- If ANGLE/BEATS reference a real, specific company, CEO, or event, stick to what's actually given to you — never invent a quote or claim that wasn't in ANGLE/BEATS. Punch at the situation or policy, not at any individual personally.
- If this is a generic/relatable scenario with no real company or person involved, that's fine — classic "when HR sends this at 4:58pm on a Friday" style.
- Sharp, punchy, conversational. Short lines. Let the joke land — don't over-explain it or add a moral at the end.
- One clear premise. Don't cram multiple jokes into one post.
- Total length: 500-900 characters — humor posts should be tight, not long
- NO hashtags in the body (add 2-3 at the very end)
- End with a line that invites people to relate or share their own version, not a generic engagement-bait question

Write the full LinkedIn post now:
` : `
You are writing a LinkedIn post for a Flutter and Node.js developer who works with AI integrations.

HOOK MATERIAL: ${ideas.chosen_hook}
TOPIC: ${ideas.topic}
ANGLE: ${linkedin.angle}
KEY POINTS: ${linkedin.key_points.join(', ')}
${personalLine}
CTA: ${linkedin.cta}

OPENING LINE (critical):
- HOOK MATERIAL above may still contain {placeholders} like {X} or {topic} — never publish those literally. Replace every placeholder with a real, specific detail pulled from TOPIC or KEY POINTS (a real number, a named tool, a dated timeframe).
- LinkedIn cuts the post to "see more" after roughly the first 210 characters, so the opening line has to be a complete, specific claim on its own — not a scaffold or a throat-clearer like "Let's talk about..." or "I wanted to share...".
- It should read as one of: a contrarian/unpopular claim, a specific number or result stated plainly, a before/after contrast, a direct warning or "stop doing X," or a confession of a common mistake. Pick whichever fits HOOK MATERIAL and TOPIC best.

LinkedIn FORMAT RULES:
- Short lines (1-2 sentences max per line)
- Add blank line between each point — real whitespace, not a wall of text
- Use minimal emojis (1 max per post)
- 3-5 key insights focused on KNOWLEDGE and VALUE about TOPIC itself
- Do NOT mention Umair's own apps, products, or specific project names. Do NOT open with or lean on a personal resume ("I've shipped X apps," "I built Y"). The post earns attention because the topic is genuinely interesting, not because of who's writing it.
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
async function humanizeLinkedInPost(draft, contentType = 'story') {
  const isHumor = contentType === 'humor';

  const prompt = isHumor ? `
Rewrite this LinkedIn post so it reads like a real person wrote it, not an AI — but this is a HUMOR/satire post, so corporate jargon (leverage, synergy, circle back, etc.) may be there on purpose as part of the joke. Do NOT strip jargon that's being mocked or quoted as part of the setup or punchline. Keep every fact and claim exactly as-is.

ONLY FIX:
- Genuine AI-sounding throat-clearing that isn't part of the joke ("I wanted to share...", "It's important to note...")
- No em dashes (—) and no double hyphens (--) — use a period or comma instead
- Keep the line breaks and structure as-is, keep the hashtags at the end exactly as-is
- Don't change the length by more than a few characters, don't soften or explain the joke

DRAFT:
${draft}

Return only the rewritten post, nothing else:
` : `
Rewrite this LinkedIn post so it reads like a real person wrote it, not an AI. Keep every fact, number, and claim exactly as-is — do not invent or remove information, and do not change the overall length by more than a few characters.

BANNED WORDS/PHRASES (replace with plain language): leverage, seamless, robust, dive into, delve, unlock, unleash, elevate, revolutionize, game-changer, cutting-edge, state-of-the-art, harness the power of, paradigm shift, in today's fast-paced world, it's important to note that, at the end of the day, undeniable, immense, significant, gaining traction, gaining significant traction, growing rapidly, groundbreaking, transformative, explosive growth, skyrocketing, genuinely thrilled, captivating.

UNSUPPORTED CLAIMS: any sentence that just asserts something is big, important, rising, or exciting without a specific number, named example, or concrete detail attached is a red flag. Either cut it, or replace it with the one specific fact that was supposed to prove it. "AI adoption is exploding in popularity" is not allowed. "AI-related repos on GitHub have tripled this year" is, if that number is actually in the draft — don't invent one.

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
  const isHumor = ideas.content_type === 'humor';

  const prompt = isHumor ? `
You are writing a funny Twitter/X thread about corporate/workplace life for ${story.name}, a ${story.title}.

TOPIC: ${ideas.topic}
HOOK: ${ideas.chosen_hook}

STRICT RULES (free API tier - 280 char hard limit per tweet):
- EVERY tweet must be under 240 characters
- Tweet 1: The hook, punchy, NO hashtags
- Tweets 2-4: Build the joke — specific, relatable beats, not generic observations
- Tweet 5: The punchline or the wildest example, max 1-2 hashtags
- Total: 4-5 tweets ONLY (shorter than a normal thread — don't stretch a joke past its welcome)
- If this references a real company/CEO/event, stick to what's actually in TOPIC/HOOK — never invent a quote or claim. Punch at the situation, not at any individual personally.
- Sound like a real person being funny, not a brand account trying to be relatable

Return ONLY a valid JSON array of strings. No markdown, no explanation:
["tweet1", "tweet2", "tweet3", "tweet4", "tweet5"]
` : `
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
  const isHumor = ideas.content_type === 'humor';

  const prompt = isHumor ? `
Write a funny Instagram caption about corporate/workplace life for a Flutter and Node.js developer account.

TOPIC: ${ideas.topic}
ANGLE: ${instagram.caption_angle}
HOOK: ${instagram.story_hook}
KEY MESSAGE: ${instagram.key_message}

RULES:
- Start with emoji + hook (first line is CRUCIAL - it's the preview)
- 80-150 words — shorter than a normal caption, humor works better tight
- If this references a real company/CEO/event, stick to what's actually in ANGLE/KEY MESSAGE — never invent a quote or claim. Punch at the situation, not at any individual personally
- Let the joke land, don't explain it afterward
- End with something that invites people to share their own version in the comments
- Add line break then 15-20 relevant hashtags:
${platform_formats.instagram.hashtags.join(' ')} #FlutterDeveloper #AppDev #BuildInPublic #IndieHacker #AITools #Automation

Write the full Instagram caption:
` : `
Write an Instagram caption for a Flutter and Node.js developer account.

TOPIC: ${ideas.topic}
ANGLE: ${instagram.caption_angle}
HOOK: ${instagram.story_hook}
KEY MESSAGE: ${instagram.key_message}

RULES:
- Start with emoji + hook (first line is CRUCIAL - it's the preview)
- 150-250 words
- Conversational, focused on the topic itself — not a personal resume or story about apps built
- Concrete detail or number if one is genuinely in TOPIC/KEY MESSAGE — don't invent one
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
        content_type: pendingRow[11] || 'story',
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
  linkedinPost = await humanizeLinkedInPost(linkedinPost, ideas.content_type);
  const { body: rawBody, link: linkedinLink } = extractLinkForComment(linkedinPost);
  const isHumor = ideas.content_type === 'humor';
  linkedinPost = isHumor
    ? await enforceLinkedInLength(rawBody, 500, 900)
    : await enforceLinkedInLength(rawBody);
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