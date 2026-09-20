import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function postToLinkedIn(text, link = null) {
  if (process.env.POST_TO_LINKEDIN !== 'true') {
    console.log('ℹ️ LinkedIn posting disabled in config');
    return null;
  }

  if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_PERSON_URN) {
    console.warn('⚠️ LinkedIn credentials missing, skipping post');
    return null;
  }

  let postId = null;

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

    postId = response.headers['x-restli-id'];
    console.log(`✅ Posted to LinkedIn! ID: ${postId}`);
  } catch (error) {
    console.error('❌ LinkedIn post failed:', error.response?.data || error.message);
    return null;
  }

  // Optional: drop the link in the first comment instead of the post body.
  // LinkedIn's algorithm suppresses reach on posts that carry an outbound
  // link, so keeping the body clean and commenting the link right after
  // publish is the standard workaround. Failure here doesn't fail the post.
  if (postId && link) {
    await postLinkedInComment(postId, `🔗 ${link}`);
  }

  return postId;
}

async function postLinkedInComment(postUrn, commentText) {
  try {
    await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
      {
        actor: process.env.LINKEDIN_PERSON_URN,
        object: postUrn,
        message: {
          text: commentText,
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
    console.log('✅ Link added as first comment');
  } catch (error) {
    console.error('⚠️ Could not add link comment (post itself is still live):', error.response?.data || error.message);
  }
}

// NOTE: LinkedIn tokens expire every 60 days
// Get your token at: https://www.linkedin.com/developers/
// Use OAuth 2.0 with scopes: r_liteprofile, w_member_social
// Your Person URN: call https://api.linkedin.com/v2/userinfo with your token