import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { GNewsService } from './services/gnews.service';
import { GetNewsUseCase } from './usecases/get-news.usecase';

@Module({
  controllers: [NewsController],
  providers: [GNewsService, GetNewsUseCase],
  exports: [GNewsService],
})
export class NewsModule {}
