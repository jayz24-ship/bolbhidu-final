import { env } from '../config/env.js';
import {
  verifyWithGemini,
  verifyWithGroq,
  verifyWithHuggingFace,
  heuristicValidation,
  type AIVerificationResult
} from './ai-providers.js';

export type { AIVerificationResult };

/**
 * Verify issue with AI - tries multiple providers with intelligent fallback
 * Priority: Gemini > Groq > HuggingFace > Heuristic
 */
export async function verifyIssueWithAI(
  description: string,
  category: string,
  location: string,
  imageUrl?: string
): Promise<AIVerificationResult> {
  console.log(`[AI Verification] 🔍 Starting verification for: "${description.substring(0, 50)}..."`);
  
  // Debug: Log API key status
  console.log('[AI Verification] 🔑 API Keys Status:');
  console.log(`  - GEMINI_API_KEY: ${env.GEMINI_API_KEY ? '✅ SET (' + env.GEMINI_API_KEY.substring(0, 10) + '...)' : '❌ NOT SET'}`);
  console.log(`  - GROQ_API_KEY: ${env.GROQ_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`  - OPENAI_API_KEY: ${env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`  - HUGGINGFACE_API_KEY: ${env.HUGGINGFACE_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  
  // Try providers in order of preference
  const providers = [
    { name: 'Gemini', fn: verifyWithGemini, enabled: !!(env.GEMINI_API_KEY || env.GOOGLE_API_KEY) },
    { name: 'Groq', fn: verifyWithGroq, enabled: !!env.GROQ_API_KEY },
    { name: 'OpenAI', fn: verifyWithOpenAI, enabled: !!env.OPENAI_API_KEY },
    { name: 'HuggingFace', fn: verifyWithHuggingFace, enabled: !!env.HUGGINGFACE_API_KEY },
  ];
  
  console.log('[AI Verification] 📋 Available providers:', providers.filter(p => p.enabled).map(p => p.name).join(', ') || 'NONE');

  // Try each enabled provider
  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`[AI Verification] ⏭️ ${provider.name} not configured, skipping...`);
      continue;
    }

    try {
      console.log(`[AI Verification] 🚀 Trying ${provider.name}...`);
      const result = await provider.fn(description, category, location, imageUrl);
      console.log(`[AI Verification] ✅ ${provider.name} succeeded:`, result);
      return result;
    } catch (error: any) {
      console.error(`[AI Verification] ❌ ${provider.name} failed:`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n')[0]}`);
      }
      // Continue to next provider
    }
  }

  // All providers failed - use heuristic fallback
  console.warn('[AI Verification] ⚠️ All AI providers failed, using heuristic validation');
  return heuristicValidation(description, category);
}

/**
 * OpenAI provider (kept for backward compatibility)
 */
async function verifyWithOpenAI(
  description: string,
  category: string,
  location: string,
  imageUrl?: string
): Promise<AIVerificationResult> {
  const apiKey = env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('No OpenAI API key configured');
  }
  
  const prompt = `You are a content moderator. Validate this civic issue report.

Description: ${description}
Category: ${category}
Location: ${location}
${imageUrl ? 'Has Image: Yes' : 'Has Image: No'}

Check:
1. Real civic issue (roads, water, electricity, sanitation, safety)
2. Not spam/ads/personal complaints  
3. Clear and actionable
4. Appropriate content

Respond with JSON only:
{
  "isValid": boolean,
  "score": 0-100,
  "reason": "brief explanation",
  "category": "${category}"
}`;

  console.log('[OpenAI] Calling API...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a content moderator. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 200,
    }),
    signal: controller.signal,
  });
  
  clearTimeout(timeoutId);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse response
  let jsonString = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  const jsonMatch = jsonString.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) jsonString = jsonMatch[0];
  
  const result = JSON.parse(jsonString);
  
  return {
    isValid: result.isValid,
    score: Math.min(100, Math.max(0, Number(result.score) || 50)),
    reason: result.reason || 'AI verification completed',
    category: result.category || category,
  };
  } finally {
    clearTimeout(timeoutId);
  }
}
