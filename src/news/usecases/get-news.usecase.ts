import { Injectable } from '@nestjs/common';
import { GNewsService, NewsArticle } from '../services/gnews.service';

export interface NewsResult {
  korean: NewsArticle[];
  global: NewsArticle[];
  fetchedAt: string;
}

@Injectable()
export class GetNewsUseCase {
  constructor(private readonly gnewsService: GNewsService) {}

  async execute(): Promise<NewsResult> {
    const [korean, global] = await Promise.all([
      this.gnewsService.getKoreanMarketNews(),
      this.gnewsService.getGlobalNews(),
    ]);

    return { korean, global, fetchedAt: new Date().toISOString() };
  }
}
