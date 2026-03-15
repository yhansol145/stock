import { Controller, Get } from '@nestjs/common';
import { GetNewsUseCase } from './usecases/get-news.usecase';

@Controller('news')
export class NewsController {
  constructor(private readonly getNewsUseCase: GetNewsUseCase) {}

  /**
   * GET /news
   * 한국 증시 뉴스 + 글로벌 이슈 뉴스
   */
  @Get()
  getNews() {
    return this.getNewsUseCase.execute();
  }
}
