import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../recommendation/services/groq.service';

export interface TranslateItem {
  title: string;
  description?: string;
}

@Injectable()
export class TranslateNewsUseCase {
  private readonly logger = new Logger(TranslateNewsUseCase.name);

  constructor(private readonly groqService: GroqService) {}

  async execute(articles: TranslateItem[]): Promise<TranslateItem[]> {
    if (!articles.length) return [];

    const numbered = articles
      .map(
        (a, i) =>
          `[${i}] ${a.title} ||| ${(a.description || '').replace(/\n/g, ' ')}`,
      )
      .join('\n');

    const prompt = `Translate each line below from English to Korean.
Keep the same numbered format. Separate title and description with |||.
Output ONLY the translated lines, nothing else.

${numbered}`;

    const raw = await this.groqService.generateText(prompt);

    // 줄 단위 파싱 — JSON 의존 제거
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\[?\d+\]?\s/.test(l) || l.includes('|||'));

    return articles.map((original, i) => {
      const line = lines.find((l) => l.includes(`[${i}]`)) || lines[i] || '';
      const cleaned = line.replace(/^\[?\d+\]?\s*/, '');
      const parts = cleaned.split('|||').map((s) => s.trim());
      return {
        title: parts[0] || original.title,
        description: parts[1] || original.description || '',
      };
    });
  }
}
