import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmProvider } from '../analysis/schemas/llm-response.schema';

const OPENROUTER_MODELS: Record<LlmProvider, string> = {
  [LlmProvider.OPENAI]: 'openai/gpt-4o-mini',
  [LlmProvider.GEMINI]: 'google/gemini-2.0-flash-001',
  [LlmProvider.PERPLEXITY]: 'perplexity/sonar',
};

const POSITIVE_WORDS = [
  'excellent', 'great', 'best', 'highly recommend', 'effective',
  'love', 'amazing', 'top', 'perfect', 'outstanding', 'superior',
  'quality', 'trusted', 'popular', 'well-reviewed', 'proven',
  'gentle', 'safe', 'reliable', 'affordable', 'innovative',
];

const NEGATIVE_WORDS = [
  'bad', 'avoid', 'terrible', 'worst', 'ineffective',
  'disappointing', 'poor', 'harsh', 'irritating', 'overpriced',
  'mediocre', 'mixed reviews', 'concerns', 'issues', 'problems',
  'not recommended', 'stay away', 'failure',
];

@Injectable()
export class LlmService {
  private openai: OpenAI;
  private perplexity: OpenAI;
  private gemini: GoogleGenerativeAI;
  private openRouter: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY') || '',
    });
    this.perplexity = new OpenAI({
      apiKey: configService.get<string>('PERPLEXITY_API_KEY') || '',
      baseURL: 'https://api.perplexity.ai',
    });
    this.gemini = new GoogleGenerativeAI(
      configService.get<string>('GEMINI_API_KEY') || '',
    );
    this.openRouter = new OpenAI({
      apiKey: configService.get<string>('OPENROUTER_API_KEY') || '',
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async call(provider: LlmProvider, prompt: string): Promise<string> {
    const useOpenRouter =
      this.configService.get<string>('USE_OPENROUTER', 'false') === 'true';

    if (useOpenRouter) {
      console.log('Using OpenRouter');
      return this.callOpenRouter(provider, prompt);
    }
    console.log('Not Using OpenRouter');

    switch (provider) {
      case LlmProvider.OPENAI:
        return this.callOpenAI(prompt);
      case LlmProvider.PERPLEXITY:
        return this.callPerplexity(prompt);
      case LlmProvider.GEMINI:
        return this.callGemini(prompt);
    }
  }

  parseResponse(
    responseText: string,
    brandName: string,
    competitors: string[],
  ) {
    const brandMentioned = responseText
      .toLowerCase()
      .includes(brandName.toLowerCase());

    const mentionPosition = brandMentioned
      ? this.detectPosition(responseText, brandName)
      : null;

    const sentiment = brandMentioned
      ? this.detectSentiment(responseText, brandName)
      : 0;

    const competitorMentions = competitors.map((comp) => ({
      name: comp,
      position: responseText.toLowerCase().includes(comp.toLowerCase())
        ? this.detectPosition(responseText, comp)
        : null,
    }));

    return { brandMentioned, mentionPosition, competitorMentions, sentiment };
  }

  isEnabled(provider: LlmProvider): boolean {
    const envKeys: Record<LlmProvider, string> = {
      [LlmProvider.OPENAI]: 'OPENAI_ENABLED',
      [LlmProvider.PERPLEXITY]: 'PERPLEXITY_ENABLED',
      [LlmProvider.GEMINI]: 'GEMINI_ENABLED',
    };
    return this.configService.get<string>(envKeys[provider], 'true') !== 'false';
  }

  getBurstSize(provider: LlmProvider): number {
    const envKeys: Record<LlmProvider, string> = {
      [LlmProvider.OPENAI]: 'OPENAI_BURST_SIZE',
      [LlmProvider.PERPLEXITY]: 'PERPLEXITY_BURST_SIZE',
      [LlmProvider.GEMINI]: 'GEMINI_BURST_SIZE',
    };
    return parseInt(
      this.configService.get<string>(envKeys[provider], '5'),
      10,
    );
  }

  private async callOpenRouter(
    provider: LlmProvider,
    prompt: string,
  ): Promise<string> {
    const response = await this.openRouter.chat.completions.create({
      model: OPENROUTER_MODELS[provider],
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });
    return response.choices[0].message.content ?? '';
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });
    return response.choices[0].message.content ?? '';
  }

  private async callPerplexity(prompt: string): Promise<string> {
    const response = await (this.perplexity.chat.completions.create as any)({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });
    return response.choices[0].message.content ?? '';
  }

  private async callGemini(prompt: string): Promise<string> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  private detectPosition(text: string, name: string): number {
    // Try numbered list first: "1. Brand", "2) Brand", etc.
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\d+)[\.\)]\s*(.*)/s);
      if (match) {
        const lineText = match[2].toLowerCase();
        if (lineText.includes(name.toLowerCase())) {
          return parseInt(match[1], 10);
        }
      }
    }
    // Fallback: estimate from character position in text (returns 1, 2, or 3)
    const idx = text.toLowerCase().indexOf(name.toLowerCase());
    const thirds = text.length / 3;
    if (idx < thirds) return 1;
    if (idx < thirds * 2) return 2;
    return 3;
  }

  private detectSentiment(text: string, brandName: string): number {
    const idx = text.toLowerCase().indexOf(brandName.toLowerCase());
    const start = Math.max(0, idx - 250);
    const end = Math.min(text.length, idx + brandName.length + 250);
    const window = text.toLowerCase().slice(start, end);

    let score = 0;
    POSITIVE_WORDS.forEach((w) => { if (window.includes(w)) score += 1; });
    NEGATIVE_WORDS.forEach((w) => { if (window.includes(w)) score -= 1; });

    // Normalize: cap at ±5 hits, return -1 to 1
    return Math.max(-1, Math.min(1, score / 5));
  }
}
