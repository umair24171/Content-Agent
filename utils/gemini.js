import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Retries transient errors (503 high demand, 429 rate limit, 500) with
// exponential backoff. Does NOT retry other errors (bad request, auth,
// model not found, etc.) — those won't fix themselves by waiting.
async function callWithRetry(fn, { maxAttempts = 3, baseDelayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.status;
      const isRetryable = status === 503 || status === 429 || status === 500;
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`  ⏳ Gemini ${status} (attempt ${attempt}/${maxAttempts}), retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function askGemini(prompt, systemInstruction = null) {
  try {
    return await callWithRetry(async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash', // gemini-2.5-flash was retired for new users — see error in previous run
        systemInstruction: systemInstruction || 'You are a helpful AI assistant for content creation.',
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('❌ Gemini error:', error.message);
    throw error;
  }
}

export async function askGeminiJSON(prompt, systemInstruction = null) {
  try {
    return await callWithRetry(async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        systemInstruction: systemInstruction || 'You are a helpful AI assistant. Always respond with valid JSON only, no markdown, no explanation.',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return JSON.parse(text);
    });
  } catch (error) {
    console.error('❌ Gemini JSON error:', error.message);
    throw error;
  }
}