import { env } from '../config/env.js';
export async function verifyIssueWithAI(description, category, location, imageUrl) {
    try {
        // Try OpenAI API first (skip only if no key at all)
        if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === '') {
            console.warn('[AI Verification] No OpenAI API key configured - using fallback heuristic');
            throw new Error('No API key - fallback');
        }
        const prompt = `You are an AI assistant that verifies community issue reports.

Issue Details:
- Description: ${description}
- Category: ${category}
- Location: ${location}
${imageUrl ? `- Has Image: Yes` : '- Has Image: No'}

Evaluate based on:
1. Is this a real, actionable community issue? (not spam, not personal complaints)
2. Is the description clear and specific?
3. Does it match the stated category?
4. Is it appropriate for public infrastructure/community management?

Respond in JSON format:
{
  "isValid": true/false,
  "score": 0-100 (confidence score),
  "reason": "Brief explanation",
  "category": "confirmed category or suggested correction"
}`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that verifies community issue reports. Always respond with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 200,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorType = errorData.error?.type || 'unknown';
            const errorMessage = errorData.error?.message || response.statusText;
            console.error(`[AI Verification] OpenAI API error (${response.status}):`, errorMessage);
            if (errorType === 'insufficient_quota') {
                console.warn('[AI Verification] OpenAI quota exceeded, using fallback verification');
            }
            throw new Error(`OpenAI API error: ${errorMessage}`);
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from AI');
        }
        // Parse the JSON response
        const result = JSON.parse(content);
        return {
            isValid: result.isValid,
            score: Math.min(100, Math.max(0, result.score)),
            reason: result.reason || 'AI verification completed',
            category: result.category || category,
        };
    }
    catch (error) {
        console.error('[AI Verification] Error:', error.message || error);
        // Fallback: Enhanced heuristic verification if AI fails
        const lower = description.toLowerCase();
        // Check for spam/invalid content - expanded list
        const spamKeywords = ['test', 'spam', 'buy now', 'click here', 'free money',
            'fake', 'bs', 'bullshit', 'nonsense', 'gibberish',
            'asdf', 'qwerty', 'lorem ipsum', 'random text'];
        const hasSpam = spamKeywords.some(keyword => lower.includes(keyword));
        // Check for random/gibberish patterns (repeated chars or single-letter sequences)
        const hasRepeatedChars = /([a-z])\1{3,}/.test(lower); // 4+ repeated characters
        const hasSingleLetterWords = /\b[a-z]\s[a-z]\s[a-z]/.test(lower); // Multiple single letters
        const hasRandomPattern = hasRepeatedChars || hasSingleLetterWords;
        // Check if description has meaningful words vs random characters
        const words = description.trim().split(/\s+/);
        const meaningfulWords = words.filter(word => {
            // Word should be at least 3 chars and not all consonants
            return word.length >= 3 && /[aeiou]/.test(word.toLowerCase());
        });
        const meaningfulRatio = meaningfulWords.length / Math.max(words.length, 1);
        // Check for legitimate issue keywords by category
        const categoryKeywords = {
            roads: ['road', 'street', 'pothole', 'crack', 'traffic', 'signal', 'construction', 'pavement'],
            water: ['water', 'leak', 'pipe', 'supply', 'drainage', 'flood', 'sewage', 'tap'],
            sanitation: ['garbage', 'trash', 'waste', 'clean', 'dirty', 'smell', 'toilet'],
            electricity: ['electric', 'power', 'light', 'pole', 'wire', 'outage', 'transformer'],
            safety: ['safety', 'danger', 'crime', 'lighting', 'security', 'accident'],
            other: ['repair', 'fix', 'broken', 'damaged', 'maintenance', 'issue', 'problem']
        };
        const relevantKeywords = categoryKeywords[category] || categoryKeywords.other;
        const hasRelevantKeyword = relevantKeywords.some(keyword => lower.includes(keyword));
        // Scoring logic - much more strict
        let score = 30; // Lower base score
        // Immediate rejection criteria
        if (hasSpam || hasRandomPattern) {
            score = 15;
        }
        else {
            // Quality checks
            if (description.length >= 20)
                score += 15;
            if (description.length >= 50)
                score += 10;
            if (meaningfulRatio >= 0.7)
                score += 20;
            if (hasRelevantKeyword)
                score += 25;
            if (description.includes('?'))
                score += 5; // Questions often indicate real issues
            // Penalty for poor quality
            if (meaningfulRatio < 0.5)
                score -= 20;
            if (description.length < 15)
                score -= 15;
        }
        // Much stricter validation
        const isValid = !hasSpam && !hasRandomPattern && meaningfulRatio >= 0.6 &&
            hasRelevantKeyword && description.length >= 15 && score >= 60;
        return {
            isValid,
            score: Math.min(100, Math.max(0, score)),
            reason: 'AI service unavailable - using enhanced heuristic verification',
            category,
        };
    }
}
//# sourceMappingURL=ai-verification.js.map