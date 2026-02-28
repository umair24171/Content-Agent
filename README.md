# 🤖 Umair's AI Content Pipeline

Fully automated content creation system that posts to **LinkedIn**, **Twitter/X**, and saves **Instagram** captions — twice daily, completely free.

## 🔄 How It Works

```
7:00 AM/PM PKT → GitHub Actions triggers
     ↓
RESEARCHER  → Scrapes Reddit, RSS, GitHub, NewsAPI
             → Scores top 5 trending topics
     ↓
IDEATOR     → Picks best topic
             → Gemini AI generates angles for all 3 platforms
     ↓
SCRIPTER    → Writes full LinkedIn post (1200 chars)
             → Writes Twitter thread (6-8 tweets)
             → Writes Instagram caption (+ 20 hashtags)
             → Posts to LinkedIn ✅
             → Posts to Twitter ✅
             → Saves Instagram to Google Sheets 📋
     ↓
(Every 3 days)
ANALYST     → Reviews what topics/hooks worked
             → Feeds insights back to improve future content
```

---

## 🆓 100% FREE Stack

| Service | What For | Free Limit |
|---------|----------|------------|
| **Google Gemini API** | AI brain | 1M tokens/day |
| **Reddit API** | Trend research | Unlimited |
| **RSS Feeds** | HN, TechCrunch, Dev.to | Unlimited |
| **GitHub API** | Trending repos | 60 req/hr |
| **NewsAPI** | Tech news | 100 req/day |
| **Google Sheets** | Storage/logging | Free |
| **LinkedIn API** | Auto-post | Free |
| **Twitter API v2** | Auto-post | 1500 tweets/month |
| **GitHub Actions** | Scheduling/hosting | 2000 min/month |

**Total monthly cost: $0** 🎉

---

## ⚡ Quick Setup (30 minutes)

### Step 1: Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/content-agent.git
cd content-agent
npm install
cp .env.example .env
```

### Step 2: Get Free API Keys

#### 🤖 Gemini API (5 mins)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy to `GEMINI_API_KEY`

#### 📡 Reddit API (5 mins)
1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app"
3. Type: **script**, Name: ContentAgent
4. Copy Client ID + Secret to `.env`

#### 📰 NewsAPI (2 mins)
1. Go to https://newsapi.org/register
2. Sign up free
3. Copy API key to `NEWS_API_KEY`

#### 📊 Google Sheets + Service Account (10 mins)
1. Create new Google Sheet at sheets.google.com
2. Copy the Sheet ID from URL (the long string between /d/ and /edit)
3. Go to https://console.cloud.google.com
4. Create project → Enable "Google Sheets API"
5. Create Service Account → Download JSON key
6. Copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
7. Copy `private_key` → `GOOGLE_PRIVATE_KEY`
8. **Share your Google Sheet** with the service account email (Editor access)
9. Create 4 tabs in your sheet: `topics`, `posts`, `analytics`, `hooks_performance`

#### 🔵 LinkedIn API (5 mins)
1. Go to https://www.linkedin.com/developers/apps/new
2. Create app → Request access to `w_member_social`
3. Get Access Token from OAuth 2.0 tools
4. Get your Person URN: `curl -H "Authorization: Bearer YOUR_TOKEN" https://api.linkedin.com/v2/userinfo`
5. Copy to `.env`

> ⚠️ LinkedIn tokens expire every **60 days** — set a calendar reminder to refresh!

#### 🐦 Twitter API (5 mins)
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create app → Generate all 4 keys (App Key, App Secret, Access Token, Access Secret)
3. Make sure app has **Read & Write** permissions
4. Copy all 4 to `.env`

#### 🔔 Discord Webhook (Optional - 2 mins)
1. In any Discord channel → Settings → Integrations → Webhooks
2. Create webhook, copy URL to `DISCORD_WEBHOOK_URL`

---

### Step 3: Test Locally
```bash
# Test without posting (safe)
node index.js test

# Run full pipeline
node index.js pipeline morning
```

### Step 4: Deploy to GitHub Actions
1. Push to GitHub:
```bash
git add .
git commit -m "deploy content agent"
git push
```

2. Go to your GitHub repo → Settings → **Secrets and variables** → Actions
3. Add each key from your `.env` as a Repository Secret:
   - `GEMINI_API_KEY`
   - `REDDIT_CLIENT_ID`
   - `REDDIT_CLIENT_SECRET`
   - `REDDIT_USERNAME`
   - `REDDIT_PASSWORD`
   - `NEWS_API_KEY`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `LINKEDIN_ACCESS_TOKEN`
   - `LINKEDIN_PERSON_URN`
   - `TWITTER_APP_KEY`
   - `TWITTER_APP_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_SECRET`
   - `DISCORD_WEBHOOK_URL`

4. Go to **Actions** tab → Enable workflows

---

## 📅 Schedule

| Time | Action |
|------|--------|
| **7:00 AM PKT** | Morning pipeline (research + post) |
| **7:00 PM PKT** | Evening pipeline (research + post) |
| **Every 3 days** | Analyst reviews performance |

---

## 📋 Manual Trigger

Go to GitHub → Actions → "Content Agent Pipeline" → Run workflow

---

## 📸 Instagram Note

Instagram's API requires a **Meta Business Account** for auto-posting.
The agent saves captions to your Google Sheet instead.
Options to auto-post Instagram for free:
- Use **Buffer free tier** (3 posts/channel free) - connect your sheet manually
- Or just copy from sheets each day (takes 30 seconds)

---

## 🎯 Topics Covered

- Flutter & Mobile Development
- AI Agents & Automation
- Node.js & Backend
- Gold Trading Bots & Algo Trading
- Machine Learning & LLMs
- RAG (Retrieval Augmented Generation)
- Freelancing & Remote Work
- Islamic Tech & Muslim Apps
- Firebase & App Development
- Indie Hacking & Side Projects
- AI Tools for Developers
- Pakistani Tech Scene

---

## 🔧 Customization

Edit `data/your-story.json` to update your profile.
Edit `data/hooks.json` to add/remove post hooks.

---

Built by Umair Bilal 🇵🇰 | Senior Flutter Developer
