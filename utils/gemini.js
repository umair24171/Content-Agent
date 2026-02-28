import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function askGemini(prompt, systemInstruction = null) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Free tier model
      systemInstruction: systemInstruction || 'You are a helpful AI assistant for content creation.',
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Gemini error:', error.message);
    throw error;
  }
}

export async function askGeminiJSON(prompt, systemInstruction = null) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction || 'You are a helpful AI assistant. Always respond with valid JSON only, no markdown, no explanation.',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('❌ Gemini JSON error:', error.message);
    throw error;
  }
}
