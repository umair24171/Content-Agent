/**
 * RESEARCHER AGENT
 * Scrapes Reddit, RSS feeds, GitHub, NewsAPI
 * Scores today's top trending topics for a software/AI developer audience
 * Saves to Google Sheets "topics" tab
 */

import { getTopPosts, TARGET_SUBREDDITS } from '../utils/reddit.js';
import { getFeedItems, getNewsArticles, getGitHubTrending } from '../utils/news.js';
import { askGeminiJSON } from '../utils/gemini.js';
import { appendRow } from '../utils/sheets.js';
import { notifyDiscord } from '../utils/discord.js';

// Used only if Gemini scoring fails outright — never shapes what gets
// picked when scoring succeeds. Deliberately generic, not tied to any
// one person's niche.
const FALLBACK_TOPICS = [
  { topic: 'AI agents moving from demo to production', content_type: 'tip' },
  { topic: 'New open source developer tools gaining traction', content_type: 'tip' },
  { topic: 'Mobile app development trends', content_type: 'tip' },
  { topic: 'Software engineering practices developers argue about', content_type: 'opinion' },
  { topic: 'Classic HR-speak and meeting culture', content_type: 'humor' },
];

async function runResearcher(runLabel = 'morning') {
  console.log(`\n🔍 RESEARCHER AGENT STARTING [${runLabel.toUpperCase()}]`);
  console.log('='.repeat(50));

  const allContent = [];

  // 1. Scrape Reddit
  console.log('\n📡 Scraping Reddit subreddits...');
  const selectedSubs = TARGET_SUBREDDITS.sort(() => 0.5 - Math.random()).slice(0, 8);
  for (const sub of selectedSubs) {
    const posts = await getTopPosts(sub, 3, 'day');
    allContent.push(...posts.map((p) => ({ ...p, type: 'reddit' })));
    console.log(`  ✓ r/${sub}: ${posts.length} posts`);
  }

  // 2. Get RSS feeds
  console.log('\n📰 Fetching RSS feeds...');
  const feedItems = await getFeedItems(3);
  allContent.push(...feedItems.map((f) => ({ ...f, type: 'rss' })));
  console.log(`  ✓ RSS: ${feedItems.length} articles`);

  // 3. GitHub trending
  console.log('\n🐙 Fetching GitHub trending...');
  const githubRepos = await getGitHubTrending();
  allContent.push(...githubRepos.map((r) => ({ ...r, type: 'github' })));
  console.log(`  ✓ GitHub: ${githubRepos.length} repos`);

  // 4. NewsAPI for specific tech topics
  console.log('\n📋 Fetching tech news...');
  const newsQueries = ['AI agents automation', 'Flutter mobile app', 'tech company CEO layoffs'];
  for (const q of newsQueries) {
    const articles = await getNewsArticles(q, 3);
    allContent.push(...articles.map((a) => ({ ...a, type: 'news', query: q })));
  }
  console.log(`  ✓ News articles fetched`);

  // 5. Ask Gemini to score and pick top topics
  console.log('\n🤖 Asking Gemini to score topics...');

  const contentSummary = allContent
    .slice(0, 50)
    .map((c) => `[${c.type?.toUpperCase()}] ${c.title || c.name || ''}: ${c.selftext || c.summary || c.description || ''}`.substring(0, 200))
    .join('\n');

  const scoringPrompt = `
You are a content strategist scanning today's developer and tech news for post ideas.

Here is today's trending content from Reddit, RSS, GitHub, and News:
${contentSummary}

From this content — not from any fixed topic list — identify the TOP 5 topics that:
1. Are currently HOT and getting real engagement right now — not evergreen advice, actual news/discussion happening today
2. Are relevant to a software development, mobile/web dev, AI/ML, or broader tech-industry audience
3. Have a genuine hook — something specific, surprising, or debatable that would make a developer stop scrolling. Not a generic "here's what I learned" angle.
4. Can be made to matter to a developer who ISN'T already following that specific niche. Some of today's hottest content will be deep inside one small community (a brand-new framework, an obscure GitHub project) — that's fine as raw material, but the angle you write must translate it into the broader, relatable question or tension it represents (why should anyone outside this niche care, what debate or tradeoff does this actually represent), not just report the insider jargon as if it's common knowledge. If a topic can't be translated that way even with effort, don't pick it — pick the next one that can.

Base every topic on something actually present in the content above. Do NOT propose an angle that centers on the author's personal apps, story, or background — the post should be interesting because of the topic itself, not because of who's writing it.

Among the 5, include AT LEAST ONE genuinely funny/relatable topic (content_type: "humor") about workplace life, HR, management, CEOs, or company culture. Two ways to do that:
- If the content above has a real, specific story (a real company, a real CEO, a real layoff or policy), base the angle on what's actually reported — don't invent quotes or claims, and punch at the absurdity of the situation, not at any individual personally.
- If nothing specific stands out today, a universal relatable workplace scenario is fine (HR-speak, meeting culture, layoff-announcement clichés) — doesn't need to reference anyone real.
Score it honestly like the others — don't force it to win if it's genuinely weaker than the rest of today's content.

Return JSON array with exactly 5 objects:
[
  {
    "topic": "exact topic name",
    "angle": "the specific hook or angle, framed around why a developer OUTSIDE this specific niche would care — the relatable tension or tradeoff, not just the insider jargon",
    "why_trending": "brief reason it's trending today",
    "source": "reddit|rss|github|news",
    "score": 1-100,
    "content_type": "tutorial|story|opinion|breakdown|thread|tip|humor"
  }
]
`;

  let topics = [];
  try {
    topics = await askGeminiJSON(scoringPrompt);
    console.log(`  ✓ Gemini scored ${topics.length} topics`);
  } catch (e) {
    console.error('  ❌ Gemini scoring failed:', e.message);
    // Fallback topics — generic, not personal, used only when Gemini itself fails
    topics = FALLBACK_TOPICS.map((t, i) => ({
      topic: t.topic,
      angle: 'General trend in this space worth breaking down',
      why_trending: 'Fallback — live scoring unavailable this run',
      source: 'fallback',
      score: 80 - i * 5,
      content_type: t.content_type,
    }));
  }

  // 6. Save to Google Sheets
  console.log('\n💾 Saving to Google Sheets...');
  const date = new Date().toISOString();
  for (const topic of topics) {
    await appendRow('topics', [
      date,
      runLabel,
      topic.topic,
      topic.score,
      topic.source,
      topic.angle,
      topic.why_trending,
      topic.content_type,
      'pending', // status: pending | used
    ]);
  }

  await notifyDiscord(
    `🔍 **Researcher done [${runLabel}]**\nFound ${topics.length} topics:\n${topics.map((t) => `• ${t.topic} (${t.score}/100)`).join('\n')}`
  );

  console.log('\n✅ RESEARCHER COMPLETE');
  console.log('Topics found:');
  topics.forEach((t) => console.log(`  ${t.score}/100 - ${t.topic}`));

  return topics;
}

// Run directly if called as main
const isMain = process.argv[1].includes('researcher');
if (isMain) {
  const runLabel = process.argv[2] || 'morning';
  runResearcher(runLabel).catch(console.error);
}

export { runResearcher };