import { Controller, Get, Post, Body } from '@nestjs/common';
import { GetNewsUseCase } from './usecases/get-news.usecase';
import { TranslateNewsUseCase } from './usecases/translate-news.usecase';

@Controller('news')
export class NewsController {
  constructor(
    private readonly getNewsUseCase: GetNewsUseCase,
    private readonly translateNewsUseCase: TranslateNewsUseCase,
  ) {}

  /**
   * GET /news
   * 한국 증시 뉴스 + 글로벌 이슈 뉴스
   */
  @Get()
  getNews() {
    return this.getNewsUseCase.execute();
  }

  /**
   * POST /news/translate
   * 뉴스 기사 배열을 한국어로 번역
   */
  @Post('translate')
  translateNews(@Body() body: { articles: { title: string; description?: string }[] }) {
    return this.translateNewsUseCase.execute(body.articles);
  }
}
