/**
 * RESEARCHER AGENT
 * Scrapes Reddit, RSS feeds, GitHub, NewsAPI
 * Scores top 10 trending topics relevant to Umair's niche
 * Saves to Google Sheets "topics" tab
 */

import { getTopPosts, TARGET_SUBREDDITS } from '../utils/reddit.js';
import { getFeedItems, getNewsArticles, getGitHubTrending } from '../utils/news.js';
import { askGeminiJSON } from '../utils/gemini.js';
import { appendRow } from '../utils/sheets.js';
import { notifyDiscord } from '../utils/discord.js';
import { readFileSync } from 'fs';

const story = JSON.parse(readFileSync('./data/your-story.json', 'utf-8'));

const UMAIR_TOPICS = [
  'Flutter mobile development',
  'AI agents and automation',
  'Node.js backend development',
  'Algorithmic trading and trading bots',
  'Machine learning and LLMs',
  'RAG (Retrieval Augmented Generation)',
  'Freelancing and remote work',
  'Islamic tech and Muslim apps',
  'Firebase and app development',
  'Indie hacking and side projects',
  'AI tools for developers',
  'Mobile app monetization',
  'React and Next.js',
  'Startup and entrepreneurship',
  'Pakistani tech scene',
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
  const newsQueries = ['AI agents automation', 'Flutter mobile app', 'algorithmic trading'];
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
You are a content strategist for ${story.name}, a ${story.title} from Pakistan.

His target audience: Developers, tech enthusiasts, Flutter devs, AI builders, freelancers, Muslim tech community.

His topics of interest:
${UMAIR_TOPICS.join('\n')}

Here is today's trending content from Reddit, RSS, GitHub, and News:
${contentSummary}

Based on this content, identify the TOP 5 trending topics that:
1. Are currently HOT and getting engagement
2. Relate to Umair's expertise or audience
3. He can share a unique perspective on (as a Pakistani dev, indie hacker, or Flutter/trading expert)

Return JSON array with exactly 5 objects:
[
  {
    "topic": "exact topic name",
    "angle": "specific angle Umair can take based on his experience",
    "why_trending": "brief reason it's trending today",
    "source": "reddit|rss|github|news",
    "score": 1-100,
    "content_type": "tutorial|story|opinion|breakdown|thread|tip"
  }
]
`;

  let topics = [];
  try {
    topics = await askGeminiJSON(scoringPrompt);
    console.log(`  ✓ Gemini scored ${topics.length} topics`);
  } catch (e) {
    console.error('  ❌ Gemini scoring failed:', e.message);
    // Fallback topics
    topics = UMAIR_TOPICS.slice(0, 5).map((t, i) => ({
      topic: t,
      angle: 'From personal experience building production apps',
      why_trending: 'Always relevant in dev community',
      source: 'fallback',
      score: 80 - i * 5,
      content_type: 'tip',
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
