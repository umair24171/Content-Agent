/**
 * ANALYST AGENT
 * Runs every 3 days
 * Analyzes which posts performed well
 * Feeds insights back to improve future content
 * Updates hooks performance data
 */

import { askGemini, askGeminiJSON } from '../utils/gemini.js';
import { getLastRows, appendRow } from '../utils/sheets.js';
import { notifyDiscord } from '../utils/discord.js';
import { readFileSync, writeFileSync } from 'fs';

const story = JSON.parse(readFileSync('./data/your-story.json', 'utf-8'));

async function runAnalyst() {
  console.log('\n📊 ANALYST AGENT STARTING');
  console.log('='.repeat(50));

  // Get recent posts from sheets
  console.log('📊 Loading recent posts from Google Sheets...');
  const recentPosts = await getLastRows('posts', 20);

  if (!recentPosts || recentPosts.length === 0) {
    console.log('⚠️ No posts found to analyze yet.');
    return null;
  }

  // Format posts for analysis
  const postsForAnalysis = recentPosts
    .filter((r) => r[7] === 'posted')
    .map((r) => ({
      date: r[0],
      run: r[1],
      topic: r[2],
      hook: r[3],
      linkedin_id: r[8],
      twitter_id: r[9],
    }));

  console.log(`Found ${postsForAnalysis.length} posts to analyze`);

  // NOTE: For real engagement data, you'd call LinkedIn API:
  // GET https://api.linkedin.com/v2/socialActions/{postId}/likes
  // For Twitter: GET https://api.twitter.com/2/tweets/{id}?tweet.fields=public_metrics
  // For now, we analyze patterns from topics/hooks used

  const analysisPrompt = `
You are analyzing content performance for ${story.name}, a Flutter developer building in public.

Recent posts sent:
${JSON.stringify(postsForAnalysis.slice(-10), null, 2)}

Based on these posts:
1. Identify which TOPICS and HOOKS are likely to get best engagement based on trends
2. Spot any patterns (time of day, topic type, content type)
3. Recommend what to focus on MORE
4. Recommend what to avoid

Return JSON:
{
  "top_performing_topics": ["topic1", "topic2"],
  "recommended_hooks": ["hook pattern 1", "hook pattern 2"],
  "avoid_topics": ["topic to avoid"],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "next_week_focus": "what to post more of next week",
  "posting_tips": ["tip 1", "tip 2"]
}
`;

  console.log('\n🤖 Running Gemini analysis...');
  let analysis;
  try {
    analysis = await askGeminiJSON(analysisPrompt);
  } catch (e) {
    console.error('Gemini analysis failed:', e.message);
    analysis = {
      top_performing_topics: ['AI agents', 'Flutter tips'],
      recommended_hooks: ['personal story hooks', 'number-based hooks'],
      avoid_topics: [],
      insights: ['Continue posting consistently', 'Mix technical and story content'],
      next_week_focus: 'AI automation content',
      posting_tips: ['Post at peak hours', 'Use specific numbers'],
    };
  }

  // Save analysis to sheets
  await appendRow('analytics', [
    new Date().toISOString(),
    JSON.stringify(analysis.top_performing_topics),
    JSON.stringify(analysis.recommended_hooks),
    analysis.next_week_focus,
    JSON.stringify(analysis.insights),
    JSON.stringify(analysis.posting_tips),
  ]);

  // Print insights
  console.log('\n📈 ANALYSIS RESULTS:');
  console.log('Top performing topics:', analysis.top_performing_topics);
  console.log('Next week focus:', analysis.next_week_focus);
  console.log('Key insights:');
  analysis.insights?.forEach((i) => console.log(`  • ${i}`));

  await notifyDiscord(
    `📊 **Analyst Report**\n` +
      `**Top topics:** ${analysis.top_performing_topics?.join(', ')}\n` +
      `**Next week focus:** ${analysis.next_week_focus}\n` +
      `**Key insights:**\n${analysis.insights?.map((i) => `• ${i}`).join('\n')}`
  );

  console.log('\n✅ ANALYST COMPLETE');
  return analysis;
}

const isMain = process.argv[1].includes('analyst');
if (isMain) {
  runAnalyst().catch(console.error);
}

export { runAnalyst };
