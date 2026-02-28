import axios from 'axios';
import Parser from 'rss-parser';
import dotenv from 'dotenv';
dotenv.config();

const parser = new Parser();

// Free RSS feeds - no API key needed
const RSS_FEEDS = [
  { url: 'https://hnrss.org/frontpage', name: 'Hacker News' },
  { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch' },
  { url: 'https://www.reddit.com/r/MachineLearning/.rss', name: 'ML Reddit' },
  { url: 'https://www.reddit.com/r/artificial/.rss', name: 'AI Reddit' },
  { url: 'https://www.reddit.com/r/LocalLLaMA/.rss', name: 'LLM Reddit' },
  { url: 'https://www.reddit.com/r/FlutterDev/.rss', name: 'Flutter Reddit' },
  { url: 'https://dev.to/feed', name: 'Dev.to' },
];

export async function getFeedItems(limit = 5) {
  const allItems = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items.slice(0, limit).map((item) => ({
        title: item.title || '',
        link: item.link || '',
        summary: item.contentSnippet?.substring(0, 200) || '',
        source: feed.name,
        pubDate: item.pubDate || new Date().toISOString(),
      }));
      allItems.push(...items);
    } catch (err) {
      console.warn(`⚠️ RSS feed failed: ${feed.name} - ${err.message}`);
    }
  }

  return allItems;
}

// NewsAPI - 100 free requests/day
export async function getNewsArticles(query, limit = 5) {
  if (!process.env.NEWS_API_KEY) {
    console.warn('⚠️ No NEWS_API_KEY, skipping NewsAPI');
    return [];
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        sortBy: 'publishedAt',
        pageSize: limit,
        language: 'en',
        apiKey: process.env.NEWS_API_KEY,
      },
    });

    return response.data.articles.map((a) => ({
      title: a.title,
      description: a.description?.substring(0, 200) || '',
      url: a.url,
      source: a.source.name,
      publishedAt: a.publishedAt,
    }));
  } catch (error) {
    console.error('❌ NewsAPI error:', error.message);
    return [];
  }
}

// GitHub Trending (no API key needed - scrape public page via RSS isn't available, use API)
export async function getGitHubTrending() {
  try {
    const response = await axios.get('https://api.github.com/search/repositories', {
      params: {
        q: 'created:>' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sort: 'stars',
        order: 'desc',
        per_page: 10,
      },
      headers: {
        'User-Agent': 'ContentAgent/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return response.data.items.map((repo) => ({
      name: repo.full_name,
      description: repo.description?.substring(0, 150) || '',
      stars: repo.stargazers_count,
      language: repo.language || 'Unknown',
      url: repo.html_url,
      topics: repo.topics?.slice(0, 5) || [],
    }));
  } catch (error) {
    console.error('❌ GitHub trending error:', error.message);
    return [];
  }
}
