import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PRIMARY_MODEL = 'gemini-3.6-flash';
// Different model = separate capacity pool, so if 3.6-flash is genuinely
// overloaded (not just a one-request blip), this one is more likely to
// actually be up. It's a lighter model, so quality on a fallback run may
// be a notch below normal — that's the tradeoff for the run completing at all.
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

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

// Tries the primary model (with its own retries) first. If it's still down
// after retries — a real capacity issue, not a one-off — falls back to a
// different model instead of failing the whole run.
async function generateWithFallback(buildRequest) {
  try {
    return await callWithRetry(() => buildRequest(PRIMARY_MODEL));
  } catch (error) {
    const status = error?.status;
    if (status !== 503 && status !== 429 && status !== 500) {
      throw error; // not a capacity issue — a fallback model won't help
    }
    console.warn(`  ⚠️ ${PRIMARY_MODEL} still down after retries, falling back to ${FALLBACK_MODEL}...`);
    return await callWithRetry(() => buildRequest(FALLBACK_MODEL));
  }
}

export async function askGemini(prompt, systemInstruction = null) {
  try {
    return await generateWithFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
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
    return await generateWithFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
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