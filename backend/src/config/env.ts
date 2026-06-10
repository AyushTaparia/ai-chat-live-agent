import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Also fallback to loading from root directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};

export function getLLMProvider(): { provider: 'gemini' | 'openai' | 'anthropic' | 'none'; apiKey?: string } {
  if (config.geminiApiKey) {
    return { provider: 'gemini', apiKey: config.geminiApiKey };
  }
  if (config.openaiApiKey) {
    return { provider: 'openai', apiKey: config.openaiApiKey };
  }
  if (config.anthropicApiKey) {
    return { provider: 'anthropic', apiKey: config.anthropicApiKey };
  }
  return { provider: 'none' };
}
