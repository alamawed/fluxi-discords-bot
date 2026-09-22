/**
 * Google Gemini AI Integration Service
 * Powered by @google/genai using gemini-2.5-flash
 */

class GeminiService {
  constructor() {
    this.client = null;
    this.modelName = 'gemini-2.5-flash';
    this.init();
  }

  init() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('[Gemini] GEMINI_API_KEY is not configured in .env. AI features will respond with setup guidance.');
      return;
    }

    try {
      const { GoogleGenAI } = require('@google/genai');
      this.client = new GoogleGenAI({ apiKey });
      console.log(`[Gemini] Initialized successfully with model: ${this.modelName}`);
    } catch (err) {
      console.error('[Gemini] Failed to initialize @google/genai SDK:', err.message);
    }
  }

  /**
   * Generates response from Gemini for a given user prompt.
   * @param {string} prompt - User request or question.
   * @param {object} context - Contextual info (user tag, guild name, style).
   * @returns {Promise<string>} - Formatted markdown response.
   */
  async generateResponse(prompt, context = {}) {
    if (!this.client) {
      // Re-check in case API key was set after init
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        this.init();
      }

      if (!this.client) {
        return "⚠️ **Gemini AI is not configured.**\nPlease configure a valid `GEMINI_API_KEY` in your `.env` file from [Google AI Studio](https://aistudio.google.com/) to enable AI capabilities.";
      }
    }

    const systemInstruction = `You are "Antigravity AI", an intelligent, helpful, witty, and concise AI companion embedded in a Discord community server called "${context.guildName || 'Discord Server'}".
Respond to user "${context.userTag || 'User'}" with clear, engaging, and well-structured markdown.
Keep responses concise, relevant to Discord chat format, and avoid unnecessarily long boilerplate.
If writing code, use fenced markdown code blocks with the language identifier (e.g., \`\`\`javascript ... \`\`\`).
Never generate toxic, unsafe, or harmful content.`;

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: context.temperature || 0.7,
        }
      });

      if (!response || !response.text) {
        return "🤖 *Gemini processed the request but returned an empty response.*";
      }

      return response.text.trim();
    } catch (error) {
      console.error('[Gemini] Error generating content:', error);

      // Graceful error reporting
      if (error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
        return "⏳ **Rate limit reached:** The AI is receiving too many requests right now. Please try again in a few moments.";
      } else if (error.status === 401 || error.status === 403 || error.message?.includes('API_KEY_INVALID')) {
        return "🔑 **Authentication Error:** The provided `GEMINI_API_KEY` is invalid or expired.";
      }

      return `⚠️ **AI Service Error:** Failed to generate response (${error.message || 'Unknown error'}).`;
    }
  }

  /**
   * Splits long markdown text into Discord-compliant chunks (<= 2000 characters),
   * intelligently preserving code blocks and paragraph boundaries.
   * @param {string} text - Raw text to split.
   * @param {number} maxLength - Maximum chunk length (default: 1950 for safety margin).
   * @returns {string[]} - Array of safe string chunks.
   */
  splitForDiscord(text, maxLength = 1950) {
    if (!text || text.length <= maxLength) {
      return [text || ''];
    }

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Look for a sensible splitting point (double newline -> newline -> space)
      let splitIndex = remaining.lastIndexOf('\n\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
        splitIndex = remaining.lastIndexOf('\n', maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }

      let chunk = remaining.slice(0, splitIndex).trim();
      remaining = remaining.slice(splitIndex).trim();

      // Ensure open code blocks are properly closed and reopened across chunks
      const codeBlockMatches = chunk.match(/```/g);
      const isOddCodeBlocks = codeBlockMatches && codeBlockMatches.length % 2 !== 0;

      if (isOddCodeBlocks) {
        chunk += '\n```';
        remaining = '```\n' + remaining;
      }

      chunks.push(chunk);
    }

    return chunks;
  }
}

module.exports = new GeminiService();
