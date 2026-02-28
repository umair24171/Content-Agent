import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendRow(sheetName, values) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    });

    console.log(`✅ Saved to sheet: ${sheetName}`);
  } catch (error) {
    console.error('❌ Sheets error:', error.message);
    // Don't throw - sheet failure shouldn't stop the pipeline
  }
}

export async function getLastRows(sheetName, count = 10) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = res.data.values || [];
    return rows.slice(-count);
  } catch (error) {
    console.error('❌ Sheets read error:', error.message);
    return [];
  }
}

export async function updateCell(sheetName, row, col, value) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const colLetter = String.fromCharCode(64 + col);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!${colLetter}${row}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  } catch (error) {
    console.error('❌ Sheets update error:', error.message);
  }
}

// Sheet structure:
// Sheet 1: "topics"       → date, topic, score, source, used
// Sheet 2: "posts"        → date, run, topic, linkedin_post, twitter_thread, instagram_caption, posted_linkedin, posted_twitter, instagram_saved
// Sheet 3: "analytics"    → date, post_id, platform, likes, comments, shares, impressions, hook_used, topic
// Sheet 4: "hooks_performance" → hook_text, uses, avg_engagement, last_used
