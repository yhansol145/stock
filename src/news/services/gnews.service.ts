import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface GNewsResponse {
  articles: {
    title: string;
    description: string;
    url: string;
    source: { name: string };
    publishedAt: string;
  }[];
}

@Injectable()
export class GNewsService {
  private readonly logger = new Logger(GNewsService.name);
  private readonly baseUrl = 'https://gnews.io/api/v4';
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GNEWS_API_KEY');
  }

  async getKoreanMarketNews(): Promise<NewsArticle[]> {
    return this.fetch('/search', { q: 'KOSPI OR KOSDAQ OR "Korean stock"', lang: 'en', max: 5 });
  }

  async getGlobalNews(): Promise<NewsArticle[]> {
    return this.fetch('/top-headlines', { topic: 'world', lang: 'en', max: 5 });
  }

  private async fetch(path: string, params: Record<string, any>): Promise<NewsArticle[]> {
    try {
      const { data } = await axios.get<GNewsResponse>(`${this.baseUrl}${path}`, {
        params: { ...params, token: this.apiKey },
        timeout: 10000,
      });

      return data.articles.map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source.name,
        publishedAt: a.publishedAt,
      }));
    } catch (error) {
      this.logger.warn(`GNews fetch failed (${path}): ${(error as Error).message}`);
      return [];
    }
  }
}
