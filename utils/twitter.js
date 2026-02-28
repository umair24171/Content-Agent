import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
dotenv.config();

function getClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });
}

export async function postThread(tweets) {
  if (process.env.POST_TO_TWITTER !== 'true') {
    console.log('ℹ️ Twitter posting disabled in config');
    return null;
  }

  if (!process.env.TWITTER_APP_KEY) {
    console.warn('⚠️ Twitter credentials missing, skipping');
    return null;
  }

  try {
    const client = getClient();
    const rwClient = client.readWrite;

    let lastTweetId = null;
    const tweetIds = [];

    for (const tweet of tweets) {
      const params = { text: tweet };
      if (lastTweetId) {
        params.reply = { in_reply_to_tweet_id: lastTweetId };
      }

      const result = await rwClient.v2.tweet(params);
      lastTweetId = result.data.id;
      tweetIds.push(lastTweetId);

      // Small delay between tweets to avoid rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`✅ Posted Twitter thread! ${tweets.length} tweets. First ID: ${tweetIds[0]}`);
    return tweetIds[0];
  } catch (error) {
    console.error('❌ Twitter post failed:', error.message);
    return null;
  }
}

export async function postSingleTweet(text) {
  if (process.env.POST_TO_TWITTER !== 'true') return null;

  try {
    const client = getClient();
    const result = await client.readWrite.v2.tweet(text);
    console.log(`✅ Tweeted! ID: ${result.data.id}`);
    return result.data.id;
  } catch (error) {
    console.error('❌ Tweet failed:', error.message);
    return null;
  }
}
