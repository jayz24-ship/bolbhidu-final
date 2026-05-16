import { env } from '../config/env.js';

export interface AIVerificationResult {
  isValid: boolean;
  score: number; // 0-100
  reason: string;
  category: string;
}

/**
 * Google Gemini API (FREE - 60 req/min)
 * Get API key: https://aistudio.google.com/app/apikey
 */
export async function verifyWithGemini(
  description: string,
  category: string,
  location: string,
  imageUrl?: string
): Promise<AIVerificationResult> {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('No Gemini API key configured');
  }

  const prompt = `You are a content moderator for a civic issue reporting platform. Analyze this report and determine if it's valid.

Issue Report:
- Description: ${description}
- Category: ${category}
- Location: ${location}
${imageUrl ? '- Has Image: Yes' : '- Has Image: No'}

Validation Criteria:
1. Is it a real civic/infrastructure issue? (roads, water, sanitation, electricity, safety)
2. Not spam, advertisements, or personal complaints
3. Description is clear and actionable
4. Appropriate for public community platform

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "isValid": true or false,
  "score": 0-100,
  "reason": "brief explanation",
  "category": "${category}"
}`;

  console.log('[Gemini] Calling API...');

  // Try gemini-1.5-flash-latest first, fallback to gemini-pro
  const modelName = 'gemini-1.5-flash-latest'; // or 'gemini-pro' if flash doesn't work
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  console.log('[Gemini] Raw response:', JSON.stringify(data, null, 2));

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No content in Gemini response');
  }

  return parseAIResponse(content, category);
}

/**
 * Groq API (FREE - 30 req/min, ultra-fast)
 * Get API key: https://console.groq.com
 */
export async function verifyWithGroq(
  description: string,
  category: string,
  location: string,
  imageUrl?: string
): Promise<AIVerificationResult> {
  const apiKey = env.GROQ_API_KEY;
  
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('No Groq API key configured');
  }

  const systemPrompt = 'You are a content moderator. Respond ONLY with valid JSON. No additional text or explanation.';
  
  const userPrompt = `Validate this civic issue report:

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

  console.log('[Groq] Calling API...');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // Fastest free model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} - ${error.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  console.log('[Groq] Raw response:', JSON.stringify(data, null, 2));

  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in Groq response');
  }

  return parseAIResponse(content, category);
}

/**
 * Hugging Face Inference API (FREE - 1000 req/day)
 * Get API key: https://huggingface.co/settings/tokens
 */
export async function verifyWithHuggingFace(
  description: string,
  category: string,
  location: string,
  imageUrl?: string
): Promise<AIVerificationResult> {
  const apiKey = env.HUGGINGFACE_API_KEY;
  
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('No HuggingFace API key configured');
  }

  // Use text classification model for content moderation
  const model = 'facebook/roberta-hate-speech-dynabench-r4-target';
  
  console.log('[HuggingFace] Calling API...');

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: description,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`HuggingFace API error: ${response.status} - ${error.error || 'Unknown'}`);
  }

  const data = await response.json();
  console.log('[HuggingFace] Raw response:', JSON.stringify(data, null, 2));

  // Parse classification result
  const labels = data[0];
  const notHate = labels.find((l: any) => l.label === 'nothate')?.score || 0;
  
  // Additional heuristic checks
  const isLongEnough = description.length >= 10;
  const hasRelevantWords = checkRelevantWords(description, category);
  
  const score = Math.round(notHate * 100);
  const isValid = notHate > 0.7 && isLongEnough && hasRelevantWords;

  return {
    isValid,
    score,
    reason: isValid 
      ? 'Content passed moderation checks' 
      : 'Content may be inappropriate or spam',
    category,
  };
}

/**
 * Parse AI response (handles various JSON formats)
 */
function parseAIResponse(content: string, fallbackCategory: string): AIVerificationResult {
  try {
    // Remove markdown code blocks if present
    let jsonString = content.trim();
    jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Try to extract JSON object
    const jsonMatch = jsonString.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const result = JSON.parse(jsonString);

    // Validate structure
    if (typeof result.isValid !== 'boolean') {
      throw new Error('Missing isValid field');
    }

    return {
      isValid: result.isValid,
      score: Math.min(100, Math.max(0, Number(result.score) || 50)),
      reason: result.reason || 'AI validation completed',
      category: result.category || fallbackCategory,
    };
  } catch (error) {
    console.error('[AI Parse] Failed to parse response:', error);
    console.error('[AI Parse] Content was:', content);
    throw new Error(`Invalid JSON from AI: ${error}`);
  }
}

/**
 * Check for relevant category keywords
 */
function checkRelevantWords(description: string, category: string): boolean {
  const lower = description.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    roads: ['road', 'street', 'pothole', 'crack', 'traffic', 'signal', 'pavement'],
    water: ['water', 'leak', 'pipe', 'supply', 'drainage', 'flood', 'sewage'],
    sanitation: ['garbage', 'trash', 'waste', 'clean', 'dirty', 'smell'],
    electricity: ['electric', 'power', 'light', 'pole', 'wire', 'outage'],
    safety: ['safety', 'danger', 'crime', 'lighting', 'security'],
    other: ['repair', 'fix', 'broken', 'damaged', 'maintenance', 'issue']
  };

  const keywords = categoryKeywords[category] || categoryKeywords.other;
  return keywords.some(keyword => lower.includes(keyword));
}

/**
 * Enhanced heuristic fallback (when all AI providers fail)
 */
export function heuristicValidation(
  description: string,
  category: string
): AIVerificationResult {
  const lower = description.toLowerCase();
  
  // Spam detection
  const spamKeywords = ['test', 'spam', 'buy now', 'click here', 'free money'];
  const hasSpam = spamKeywords.some(k => lower.includes(k));
  
  // Quality checks
  const hasRepeatedChars = /([a-z])\1{3,}/.test(lower);
  const words = description.trim().split(/\s+/);
  const meaningfulWords = words.filter(w => w.length >= 3 && /[aeiou]/.test(w));
  const meaningfulRatio = meaningfulWords.length / Math.max(words.length, 1);
  
  // Category relevance
  const hasRelevantWords = checkRelevantWords(description, category);
  
  // Score calculation
  let score = 50;
  if (hasSpam || hasRepeatedChars) score = 15;
  else {
    if (description.length >= 10) score += 15;
    if (description.length >= 30) score += 10;
    if (meaningfulRatio >= 0.5) score += 20;
    if (hasRelevantWords) score += 25;
  }
  
  const isValid = !hasSpam && !hasRepeatedChars && meaningfulRatio >= 0.4 && score >= 40;
  
  return {
    isValid,
    score: Math.min(100, Math.max(0, score)),
    reason: 'Validated using heuristic rules (AI unavailable)',
    category,
  };
}
