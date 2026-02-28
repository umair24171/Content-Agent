import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function postToLinkedIn(text) {
  if (process.env.POST_TO_LINKEDIN !== 'true') {
    console.log('ℹ️ LinkedIn posting disabled in config');
    return null;
  }

  if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_PERSON_URN) {
    console.warn('⚠️ LinkedIn credentials missing, skipping post');
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: process.env.LINKEDIN_PERSON_URN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    const postId = response.headers['x-restli-id'];
    console.log(`✅ Posted to LinkedIn! ID: ${postId}`);
    return postId;
  } catch (error) {
    console.error('❌ LinkedIn post failed:', error.response?.data || error.message);
    return null;
  }
}

// NOTE: LinkedIn tokens expire every 60 days
// Get your token at: https://www.linkedin.com/developers/
// Use OAuth 2.0 with scopes: r_liteprofile, w_member_social
// Your Person URN: call https://api.linkedin.com/v2/userinfo with your token
