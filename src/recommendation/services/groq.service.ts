import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class GroqService {
  private readonly groq: Groq | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.groq = apiKey ? new Groq({ apiKey }) : null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.groq) {
      throw new Error('GROQ_API_KEY가 설정되지 않았습니다.');
    }

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content ?? '';
  }
}
