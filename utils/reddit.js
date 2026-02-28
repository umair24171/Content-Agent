import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

let accessToken = null;
let tokenExpiry = null;

async function getRedditToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const credentials = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    `grant_type=password&username=${process.env.REDDIT_USERNAME}&password=${process.env.REDDIT_PASSWORD}`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ContentAgent/1.0 by Umair_Dev',
      },
    }
  );

  accessToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
  return accessToken;
}

export async function getTopPosts(subreddit, limit = 5, timeframe = 'day') {
  try {
    const token = await getRedditToken();

    const response = await axios.get(
      `https://oauth.reddit.com/r/${subreddit}/top?t=${timeframe}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'ContentAgent/1.0 by Umair_Dev',
        },
      }
    );

    return response.data.data.children.map((post) => ({
      title: post.data.title,
      score: post.data.score,
      comments: post.data.num_comments,
      url: `https://reddit.com${post.data.permalink}`,
      selftext: post.data.selftext?.substring(0, 300) || '',
      subreddit: post.data.subreddit,
    }));
  } catch (error) {
    console.error(`❌ Reddit error for r/${subreddit}:`, error.message);
    return [];
  }
}

// All subreddits relevant to Umair's topics
export const TARGET_SUBREDDITS = [
  'FlutterDev',         // Flutter
  'androiddev',         // Mobile dev
  'iOSProgramming',     // iOS
  'algotrading',        // Trading bots
  'Forex',              // Forex/Gold trading
  'freelance',          // Freelancing
  'devops',             // DevOps
  'artificial',         // AI general
  'MachineLearning',    // ML
  'LocalLLaMA',         // LLMs
  'node',               // Node.js
  'webdev',             // Web dev
  'programming',        // General programming
  'startups',           // Startup/indie hacker
  'SideProject',        // Side projects
  'entrepreneur',       // Entrepreneurship
];
